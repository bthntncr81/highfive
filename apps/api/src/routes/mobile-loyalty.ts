// Mobile (Customer) Loyalty: kendi puan bilgisi + geçmiş + redemption hesaplama
// GET   /api/mobile/loyalty/me            - tier + totalPoints + lifetime + son tx
// GET   /api/mobile/loyalty/history       - tüm puan tx'leri sayfalı
// POST  /api/mobile/loyalty/calc-redeem   - puan ile indirim hesaplama (UI için)
// (Gerçek redeem checkout sırasında /api/mobile/orders POST ile yapılır)

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyCustomerAuth } from '../lib/customer-auth';
import * as crypto from 'crypto';

/**
 * Program listesini reward/applicable menu item objeleriyle zenginleştir.
 * Mobile UI bu sayede "🎁 bedava alacağın ürünler" listesini gösterir.
 */
async function decorateProgramsWithMenuItems(
  prisma: PrismaClient,
  programs: any[],
): Promise<any[]> {
  const allIds = new Set<string>();
  for (const p of programs) {
    (p.applicableMenuItemIds ?? []).forEach((id: string) => allIds.add(id));
    (p.rewardMenuItemIds ?? []).forEach((id: string) => allIds.add(id));
  }
  if (allIds.size === 0) return programs;

  const items = await prisma.menuItem.findMany({
    where: { id: { in: Array.from(allIds) } },
    select: { id: true, name: true, price: true, image: true, categoryId: true },
  });
  const byId = new Map(items.map((it) => [it.id, it]));

  return programs.map((p) => ({
    ...p,
    applicableMenuItems: (p.applicableMenuItemIds ?? [])
      .map((id: string) => byId.get(id))
      .filter(Boolean),
    rewardMenuItems: (p.rewardMenuItemIds ?? [])
      .map((id: string) => byId.get(id))
      .filter(Boolean),
  }));
}

// Müşteri için unique referral code üret
async function ensureReferralCode(prisma: PrismaClient, customerId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (customer?.referralCode) return customer.referralCode;

  // Üret + benzersizlik kontrolü
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 char
    const existing = await prisma.customer.findUnique({ where: { referralCode: code } });
    if (!existing) {
      await prisma.customer.update({ where: { id: customerId }, data: { referralCode: code } });
      return code;
    }
  }
  throw new Error('Referral kodu üretilemedi');
}

export default async function mobileLoyaltyRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== ACTIVE PROGRAMS (public) ====================
  server.get('/programs', async () => {
    const programs = await prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return { programs: await decorateProgramsWithMenuItems(prisma, programs) };
  });

  // ==================== ME PROGRESS — kullanıcının her programdaki durumu ====================
  server.get('/me/progress', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
  ) => {
    const customerId = (request as any).customerId as string;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { loyaltyTier: true },
    });
    if (!customer) return { customer: null, programs: [], progress: [] };

    // Referral code yoksa üret (lazy)
    if (!customer.referralCode) {
      await ensureReferralCode(prisma, customerId);
    }
    const fresh = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { loyaltyTier: true },
    });

    const programs = await prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const progress = await prisma.customerLoyaltyProgress.findMany({
      where: { customerId },
    });

    return {
      customer: {
        id: fresh!.id,
        name: fresh!.name,
        phone: fresh!.phone,
        email: fresh!.email,
        totalPoints: fresh!.totalPoints,
        lifetimePoints: fresh!.lifetimePoints,
        cashbackBalance: fresh!.cashbackBalance,
        referralCode: fresh!.referralCode,
        referralCount: fresh!.referralCount,
        currentStreak: fresh!.currentStreak,
        longestStreak: fresh!.longestStreak,
        orderCount: fresh!.orderCount,
        loyaltyTier: fresh!.loyaltyTier,
        birthDate: fresh!.birthDate,
      },
      programs: await decorateProgramsWithMenuItems(prisma, programs),
      progress,
    };
  });

  // ==================== APPLY REFERRAL CODE — yeni kullanıcı kayıt sırasında ====================
  server.post('/apply-referral', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const { code } = (request.body ?? {}) as { code?: string };
    if (!code) return reply.status(400).send({ error: 'Kod gerekli' });

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return reply.status(404).send({ error: 'Müşteri bulunamadı' });
    if (customer.referredByCode) {
      return reply.status(400).send({ error: 'Zaten bir davet kodu kullandın' });
    }
    if (customer.orderCount > 0) {
      return reply.status(400).send({ error: 'Sipariş geçmişin var, davet kodu kullanılamaz' });
    }

    const referrer = await prisma.customer.findUnique({
      where: { referralCode: code.toUpperCase() },
    });
    if (!referrer || referrer.id === customerId) {
      return reply.status(400).send({ error: 'Geçersiz kod' });
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: { referredByCode: code.toUpperCase() },
    });

    return { ok: true, referrer: { name: referrer.name, phone: referrer.phone } };
  });

  // ==================== ME ====================
  server.get('/me', { preHandler: verifyCustomerAuth }, async (request: FastifyRequest) => {
    const customerId = (request as any).customerId as string;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { loyaltyTier: true },
    });
    if (!customer) return { customer: null };

    // Bir sonraki tier hedefi
    const tiers = await prisma.loyaltyTier.findMany({
      where: { isActive: true },
      orderBy: { minPoints: 'asc' },
    });
    const nextTier = tiers.find((t) => t.minPoints > customer.lifetimePoints) ?? null;

    // Son 5 puan tx
    const recentTx = await prisma.pointsTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        totalPoints: customer.totalPoints,
        lifetimePoints: customer.lifetimePoints,
        orderCount: customer.orderCount,
        totalSpent: customer.totalSpent,
        loyaltyTier: customer.loyaltyTier,
      },
      nextTier,
      pointsToNextTier: nextTier
        ? Math.max(0, nextTier.minPoints - customer.lifetimePoints)
        : null,
      recentTransactions: recentTx,
      pointsRules: {
        earnRate: '10₺ = 1 puan',
        redeemRate: '100 puan = 10₺ indirim',
        minRedemption: 100,
      },
    };
  });

  // ==================== HISTORY ====================
  server.get('/history', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
  ) => {
    const customerId = (request as any).customerId as string;
    const { limit, before } = (request.query ?? {}) as {
      limit?: string;
      before?: string;
    };
    const take = Math.min(parseInt(limit || '30', 10), 100);

    const tx = await prisma.pointsTransaction.findMany({
      where: {
        customerId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return { transactions: tx };
  });

  // ==================== CALC REDEEM ====================
  // Checkout UI için: kullanıcı kaç puan kullanmak istediğini söyler,
  // backend kaç ₺ indirim olacağını + remaining'i döner
  server.post('/calc-redeem', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const { points } = (request.body ?? {}) as { points?: number };
    if (!points || points < 100) {
      return reply.status(400).send({ error: 'Min 100 puan kullanılabilir' });
    }
    if (points % 100 !== 0) {
      return reply.status(400).send({ error: '100 puan katlarında kullanılmalı' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { totalPoints: true },
    });
    if (!customer) return reply.status(404).send({ error: 'Müşteri yok' });
    if (customer.totalPoints < points) {
      return reply.status(400).send({
        error: 'Yetersiz puan',
        available: customer.totalPoints,
        requested: points,
      });
    }

    return {
      pointsToRedeem: points,
      discountAmount: points / 10,
      remainingPoints: customer.totalPoints - points,
    };
  });
}
