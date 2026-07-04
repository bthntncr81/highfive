// ============================================================================
// Abonelik & faturalama — /api/platform/billing/* (OWNER token gerekli).
// ============================================================================
// Plan listesi (public), mevcut abonelik, kart saklama, plan seç/abone ol, iptal.
// Ödeme: platform iyzico (kart saklama + otomatik yenileme; subscription-billing).

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BillingCycle } from '@prisma/client';
import { platformDb } from '../../lib/tenant-db';
import { verifyOwner, OwnerToken } from '../../lib/platform-auth';
import { storeCard, CardInput } from '../../lib/platform-iyzico';
import { activateSubscription, chargeAndRenew } from '../../lib/subscription-billing';
import { invalidatePlanCache } from '../../lib/plan-limits';

export default async function billingRoutes(server: FastifyInstance) {
  // Plan listesi — PUBLIC (fiyatlandırma sayfası). Auth yok.
  server.get('/billing/plans', async () => {
    const plans = await platformDb.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      plans: plans.map((p) => ({
        key: p.key,
        name: p.name,
        monthlyPrice: Number(p.monthlyPrice),
        annualPrice: Number(p.annualPrice),
        maxLocations: p.maxLocations,
        maxUsers: p.maxUsers,
        features: p.features,
      })),
    };
  });

  // --- Aşağısı OWNER token gerektirir ---
  server.register(async (authed) => {
    authed.addHook('preHandler', verifyOwner);

    authed.get('/billing/subscription', async (request: FastifyRequest) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const sub = await platformDb.subscription.findUnique({
        where: { tenantId: owner.tenantId },
        include: { plan: true },
      });
      const cards = await platformDb.storedCard.findMany({
        where: { tenantId: owner.tenantId },
        select: { id: true, lastFour: true, cardBrand: true, isDefault: true, expireMonth: true, expireYear: true },
      });
      const tenant = await platformDb.tenant.findUnique({
        where: { id: owner.tenantId },
        select: { status: true, trialEndsAt: true },
      });
      return {
        subscription: sub && {
          status: sub.status,
          cycle: sub.cycle,
          currentPeriodEnd: sub.currentPeriodEnd,
          autoRenew: sub.autoRenew,
          failedAttempts: sub.failedAttempts,
          plan: { key: sub.plan.key, name: sub.plan.name },
        },
        tenant,
        cards,
      };
    });

    authed.get('/billing/transactions', async (request: FastifyRequest) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const txs = await platformDb.billingTransaction.findMany({
        where: { tenantId: owner.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { transactions: txs.map((t) => ({ ...t, amount: Number(t.amount) })) };
    });

    // Kart sakla (iyzico cardUserKey + token). SIMÜLASYON'da anahtar üretilir.
    authed.post('/billing/card', async (request: FastifyRequest, reply: FastifyReply) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const card = request.body as CardInput;
      if (!card?.cardNumber || !card.expireMonth || !card.expireYear || !card.cardHolderName) {
        return reply.status(400).send({ error: 'Kart bilgileri eksik' });
      }
      const membership = await platformDb.membership.findFirst({
        where: { tenantId: owner.tenantId, role: 'OWNER' },
        include: { user: true },
      });
      const sub = await platformDb.subscription.findUnique({ where: { tenantId: owner.tenantId } });

      const result = await storeCard(
        card,
        {
          tenantId: owner.tenantId,
          email: membership?.user.email ?? 'owner@otorder.com',
          name: membership?.user.name ?? 'Owner',
          phone: membership?.user.phone ?? undefined,
        },
        sub?.iyzicoCardUserKey ?? undefined,
      );
      if (!result.success || !result.cardToken) {
        return reply.status(402).send({ error: result.errorMessage || 'Kart saklanamadı' });
      }

      const last4 = card.cardNumber.replace(/\s/g, '').slice(-4);
      // Yeni kartı varsayılan yap, eskileri sıfırla
      await platformDb.storedCard.updateMany({ where: { tenantId: owner.tenantId }, data: { isDefault: false } });
      const stored = await platformDb.storedCard.create({
        data: {
          tenantId: owner.tenantId,
          iyzicoToken: result.cardToken,
          lastFour: last4,
          cardHolder: card.cardHolderName,
          expireMonth: card.expireMonth,
          expireYear: card.expireYear,
          isDefault: true,
        },
      });
      if (result.cardUserKey) {
        await platformDb.subscription.update({
          where: { tenantId: owner.tenantId },
          data: { iyzicoCardUserKey: result.cardUserKey },
        });
      }
      return {
        success: true,
        simulated: result.simulated,
        card: { id: stored.id, lastFour: last4, isDefault: true },
      };
    });

    // Plan seç + abone ol (ilk dönem tahsilatı + aktivasyon)
    authed.post('/billing/subscribe', async (request: FastifyRequest, reply: FastifyReply) => {
      const owner = (request as any).platformOwner as OwnerToken;
      const { planKey, cycle } = request.body as { planKey?: string; cycle?: BillingCycle };
      const plan = await platformDb.plan.findUnique({ where: { key: (planKey || '').toUpperCase() } });
      if (!plan) return reply.status(400).send({ error: 'Geçersiz paket' });
      const useCycle: BillingCycle = cycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
      const price = useCycle === 'ANNUAL' ? Number(plan.annualPrice) : Number(plan.monthlyPrice);

      // Ücretli plan → saklı kart şart
      if (price > 0) {
        const card = await platformDb.storedCard.findFirst({ where: { tenantId: owner.tenantId, isDefault: true } });
        const sub = await platformDb.subscription.findUnique({ where: { tenantId: owner.tenantId } });
        if (!card || !sub?.iyzicoCardUserKey) {
          return reply.status(402).send({ error: 'Önce kart ekleyin', code: 'CARD_REQUIRED' });
        }
      }

      // planId'yi güncelle, sonra tahsil+aktive et (chargeAndRenew tekrar kullanılabilir
      // ama burada planı değiştirdiğimiz için activate + ilk çekim akışını sadeleştiriyoruz)
      await platformDb.subscription.update({
        where: { tenantId: owner.tenantId },
        data: { planId: plan.id, cycle: useCycle },
      });
      invalidatePlanCache(owner.tenantId);

      // İlk dönem: activateSubscription ücretsizde direkt uzatır; ücretlide
      // chargeAndRenew çağıralım ki saklı karttan çeksin.
      if (price > 0) {
        const ok = await chargeAndRenew(owner.tenantId);
        if (!ok) return reply.status(402).send({ error: 'İlk ödeme başarısız', code: 'PAYMENT_FAILED' });
      } else {
        await activateSubscription(owner.tenantId, { planId: plan.id, cycle: useCycle });
      }

      const updated = await platformDb.subscription.findUnique({
        where: { tenantId: owner.tenantId },
        include: { plan: true },
      });
      return {
        success: true,
        subscription: {
          status: updated!.status,
          cycle: updated!.cycle,
          currentPeriodEnd: updated!.currentPeriodEnd,
          plan: { key: updated!.plan.key, name: updated!.plan.name },
        },
      };
    });

    // Otomatik yenilemeyi iptal et (dönem sonuna kadar erişim sürer)
    authed.post('/billing/cancel', async (request: FastifyRequest) => {
      const owner = (request as any).platformOwner as OwnerToken;
      await platformDb.subscription.update({
        where: { tenantId: owner.tenantId },
        data: { autoRenew: false, cancelledAt: new Date() },
      });
      return { success: true, message: 'Otomatik yenileme kapatıldı' };
    });
  });
}
