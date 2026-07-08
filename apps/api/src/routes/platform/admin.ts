// ============================================================================
// Süper-admin — /api/platform/admin/* (platform operatörü).
// ============================================================================
// login (SUPERADMIN_EMAILS + parola) · tenant listesi/durum · MRR/gelir metrikleri
// · askıya alma/aktive etme · manuel plan/hediye · impersonate (tenant'a OWNER
// token'ıyla gir).

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as bcrypt from 'bcryptjs';
import { TenantStatus, SubscriptionStatus, UserRole, BillingTransactionType } from '@prisma/client';
import { platformDb } from '../../lib/tenant-db';
import { signStaffToken } from '../../middleware/auth';
import {
  verifySuperAdmin,
  signSuperAdminToken,
  superAdminEmails,
} from '../../lib/platform-auth';
import { invalidatePlanCache } from '../../lib/plan-limits';

// Aylık eşdeğer fiyat (yıllık → /12) — MRR hesabı.
function monthlyEquivalent(price: number, cycle: string): number {
  return cycle === 'ANNUAL' ? price / 12 : price;
}

export default async function adminRoutes(server: FastifyInstance) {
  // Süper-admin girişi — allowlist e-posta + parola (User kaydı).
  server.post('/admin/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email?: string; password?: string };
    const e = (email || '').toLowerCase().trim();
    if (!superAdminEmails().includes(e)) {
      return reply.status(403).send({ error: 'Süper-admin yetkisi yok' });
    }
    const user = await platformDb.user.findUnique({ where: { email: e } });
    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      return reply.status(401).send({ error: 'Geçersiz kimlik bilgileri' });
    }
    return { token: signSuperAdminToken(user.id, e), email: e };
  });

  // --- Aşağısı süper-admin token gerektirir ---
  server.register(async (authed) => {
    authed.addHook('preHandler', verifySuperAdmin);

    // Tenant listesi (durum, plan, abonelik)
    authed.get('/admin/tenants', async (request: FastifyRequest) => {
      const { status, q } = request.query as { status?: string; q?: string };
      const tenants = await platformDb.tenant.findMany({
        where: {
          ...(status ? { status: status as TenantStatus } : {}),
          ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { subdomain: { contains: q, mode: 'insensitive' } }] } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { memberships: true, locations: true, orders: true } },
        },
      });
      return {
        tenants: tenants.map((t) => ({
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
          status: t.status,
          trialEndsAt: t.trialEndsAt,
          createdAt: t.createdAt,
          plan: t.subscription?.plan.key ?? null,
          subscriptionStatus: t.subscription?.status ?? null,
          currentPeriodEnd: t.subscription?.currentPeriodEnd ?? null,
          users: t._count.memberships,
          locations: t._count.locations,
          orders: t._count.orders,
        })),
      };
    });

    // MRR / gelir metrikleri
    authed.get('/admin/metrics', async () => {
      const [byStatus, activeSubs, txAgg] = await Promise.all([
        platformDb.tenant.groupBy({ by: ['status'], _count: true }),
        platformDb.subscription.findMany({
          where: { status: SubscriptionStatus.ACTIVE },
          include: { plan: true },
        }),
        platformDb.billingTransaction.aggregate({
          where: { success: true, type: { in: [BillingTransactionType.SUBSCRIPTION_PAYMENT, BillingTransactionType.SUBSCRIPTION_UPGRADE] } },
          _sum: { amount: true },
        }),
      ]);
      let mrr = 0;
      for (const s of activeSubs) {
        const price = s.cycle === 'ANNUAL' ? Number(s.plan.annualPrice) : Number(s.plan.monthlyPrice);
        mrr += monthlyEquivalent(price, s.cycle);
      }
      const statusCounts: Record<string, number> = {};
      for (const b of byStatus) statusCounts[b.status] = b._count as unknown as number;
      return {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        activeSubscriptions: activeSubs.length,
        totalRevenue: Number(txAgg._sum.amount ?? 0),
        tenantsByStatus: statusCounts,
      };
    });

    // Askıya al / aktive et
    authed.post('/admin/tenants/:id/suspend', async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      await platformDb.tenant.update({ where: { id }, data: { status: TenantStatus.SUSPENDED } });
      invalidatePlanCache(id);
      return { success: true, status: 'SUSPENDED' };
    });

    authed.post('/admin/tenants/:id/activate', async (request: FastifyRequest) => {
      const { id } = request.params as { id: string };
      await platformDb.tenant.update({ where: { id }, data: { status: TenantStatus.ACTIVE } });
      invalidatePlanCache(id);
      return { success: true, status: 'ACTIVE' };
    });

    // Manuel plan atama / hediye (ücret çekmeden ACTIVE'e al)
    authed.post('/admin/tenants/:id/plan', async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { planKey, months } = request.body as { planKey?: string; months?: number };
      const plan = await platformDb.plan.findUnique({ where: { key: (planKey || '').toUpperCase() } });
      if (!plan) return reply.status(400).send({ error: 'Geçersiz paket' });

      const gift = Math.max(1, Math.min(Number(months) || 1, 36));
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + gift);

      const sub = await platformDb.subscription.upsert({
        where: { tenantId: id },
        update: { planId: plan.id, status: SubscriptionStatus.ACTIVE, currentPeriodStart: now, currentPeriodEnd: periodEnd, failedAttempts: 0 },
        create: { tenantId: id, planId: plan.id, status: SubscriptionStatus.ACTIVE, cycle: 'MONTHLY', currentPeriodEnd: periodEnd },
      });
      await platformDb.tenant.update({ where: { id }, data: { status: TenantStatus.ACTIVE } });
      await platformDb.billingTransaction.create({
        data: {
          tenantId: id,
          type: BillingTransactionType.MANUAL_CREDIT,
          amount: 0,
          success: true,
          errorMessage: `Süper-admin hediye: ${plan.key} ${gift} ay`,
          periodStart: now,
          periodEnd,
        },
      });
      invalidatePlanCache(id);
      return { success: true, plan: plan.key, until: periodEnd, subscriptionId: sub.id };
    });

    // Plan düzenleme — iyzico pricingPlanReferenceCode'ları + fiyatlar
    // (iyzico panelinde plan oluşturulur, referans kodu buradan girilir; deploy yok).
    authed.patch('/admin/plans/:key', async (request: FastifyRequest, reply: FastifyReply) => {
      const { key } = request.params as { key: string };
      const body = (request.body ?? {}) as {
        iyzicoMonthlyRefCode?: string | null;
        iyzicoAnnualRefCode?: string | null;
        monthlyPrice?: number;
        annualPrice?: number;
      };
      const plan = await platformDb.plan.findUnique({ where: { key: (key || '').toUpperCase() } });
      if (!plan) return reply.status(404).send({ error: 'Geçersiz paket' });

      const data: Record<string, unknown> = {};
      if ('iyzicoMonthlyRefCode' in body) data.iyzicoMonthlyRefCode = body.iyzicoMonthlyRefCode || null;
      if ('iyzicoAnnualRefCode' in body) data.iyzicoAnnualRefCode = body.iyzicoAnnualRefCode || null;
      if (body.monthlyPrice !== undefined) {
        const p = Number(body.monthlyPrice);
        if (!Number.isFinite(p) || p < 0) return reply.status(400).send({ error: 'Geçersiz aylık fiyat' });
        data.monthlyPrice = p;
      }
      if (body.annualPrice !== undefined) {
        const p = Number(body.annualPrice);
        if (!Number.isFinite(p) || p < 0) return reply.status(400).send({ error: 'Geçersiz yıllık fiyat' });
        data.annualPrice = p;
      }

      const updated = await platformDb.plan.update({ where: { key: plan.key }, data });
      return {
        success: true,
        plan: {
          key: updated.key,
          name: updated.name,
          monthlyPrice: Number(updated.monthlyPrice),
          annualPrice: Number(updated.annualPrice),
          iyzicoMonthlyRefCode: updated.iyzicoMonthlyRefCode,
          iyzicoAnnualRefCode: updated.iyzicoAnnualRefCode,
        },
      };
    });

    // Impersonate — tenant'ın OWNER'ı gibi staff token üret (destek/hata ayıklama)
    authed.post('/admin/tenants/:id/impersonate', async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const owner = await platformDb.membership.findFirst({
        where: { tenantId: id, role: UserRole.OWNER, active: true },
        include: { user: true, tenant: true },
      });
      if (!owner) return reply.status(404).send({ error: 'Tenant sahibi bulunamadı' });
      const token = signStaffToken(
        { userId: owner.userId, tenantId: id, role: UserRole.OWNER },
        '2h', // impersonation kısa ömürlü
      );
      return {
        token,
        tenant: { id, subdomain: owner.tenant.subdomain, name: owner.tenant.name },
        actingAs: { userId: owner.userId, email: owner.user.email },
      };
    });
  });
}
