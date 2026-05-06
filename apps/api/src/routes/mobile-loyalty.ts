// Mobile (Customer) Loyalty: kendi puan bilgisi + geçmiş + redemption hesaplama
// GET   /api/mobile/loyalty/me            - tier + totalPoints + lifetime + son tx
// GET   /api/mobile/loyalty/history       - tüm puan tx'leri sayfalı
// POST  /api/mobile/loyalty/calc-redeem   - puan ile indirim hesaplama (UI için)
// (Gerçek redeem checkout sırasında /api/mobile/orders POST ile yapılır)

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyCustomerAuth } from '../lib/customer-auth';

export default async function mobileLoyaltyRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

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
