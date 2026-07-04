// Admin loyalty claim onayı — Google review / Instagram story gibi screenshot
// doğrulamalı talepleri inceler. Onay → müşteriye puan yatar. Red → müşteri
// yeniden screenshot gönderebilir.
//
// Mount: /api/loyalty (main.ts'te register edilir)
// Endpoints:
//   GET    /claims?status=PENDING  — listele (verifyAuth)
//   POST   /claims/:id/approve     — onayla + puan ver
//   POST   /claims/:id/reject      — reddet (reason opsiyonel)
//   GET    /claims/:id             — tek talep detayı

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';

export default async function loyaltyClaimsRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Liste — admin/staff erişimi
  server.get('/claims', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { status, limit } = (request.query ?? {}) as {
      status?: string;
      limit?: string;
    };
    const take = Math.min(parseInt(limit || '50', 10) || 50, 200);
    const where = status ? { status } : {};
    const claims = await prisma.loyaltyClaim.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        program: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return { claims };
  });

  // Tek detay
  server.get('/claims/:id', { preHandler: verifyAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const { id } = request.params as { id: string };
    const claim = await prisma.loyaltyClaim.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, totalPoints: true } },
        program: { select: { id: true, name: true, type: true, config: true } },
      },
    });
    if (!claim) return reply.status(404).send({ error: 'Talep bulunamadı' });
    return { claim };
  });

  // Onayla → puan ver
  server.post('/claims/:id/approve', { preHandler: verifyAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const claim = await prisma.loyaltyClaim.findUnique({
      where: { id },
      include: { program: true, customer: true },
    });
    if (!claim) return reply.status(404).send({ error: 'Talep bulunamadı' });
    if (claim.status !== 'PENDING') {
      return reply
        .status(400)
        .send({ error: 'Talep zaten işlenmiş', currentStatus: claim.status });
    }

    // Transaction: claim güncelle + puan ekle + tx history + progress kaydı
    await prisma.$transaction(async (tx) => {
      await tx.loyaltyClaim.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: user.userId,
          reviewedAt: new Date(),
        },
      });
      await tx.customer.update({
        where: { id: claim.customerId },
        data: {
          totalPoints: { increment: claim.rewardPoints },
          lifetimePoints: { increment: claim.rewardPoints },
        },
      });
      await tx.pointsTransaction.create({
        data: {
          customerId: claim.customerId,
          points: claim.rewardPoints,
          type: 'BONUS',
          description: `${claim.program.name} — admin onayı`,
        },
      });
      // Idempotent progress kaydı (zaten varsa hata yutulur)
      try {
        await tx.customerLoyaltyProgress.create({
          data: {
            customerId: claim.customerId,
            programId: claim.programId,
            data: {
              claimId: id,
              claimedAt: new Date().toISOString(),
              points: claim.rewardPoints,
            },
          },
        });
      } catch {
        /* benzersizlik ihlali — sessizce geç */
      }
    });

    return {
      ok: true,
      pointsAwarded: claim.rewardPoints,
      customerId: claim.customerId,
    };
  });

  // Reddet → müşteri yeniden submit edebilir
  server.post('/claims/:id/reject', { preHandler: verifyAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body ?? {}) as { reason?: string };
    const user = (request as any).user;

    const claim = await prisma.loyaltyClaim.findUnique({ where: { id } });
    if (!claim) return reply.status(404).send({ error: 'Talep bulunamadı' });
    if (claim.status !== 'PENDING') {
      return reply
        .status(400)
        .send({ error: 'Talep zaten işlenmiş', currentStatus: claim.status });
    }

    await prisma.loyaltyClaim.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNote: (reason ?? '').trim() || null,
        reviewedById: user.userId,
        reviewedAt: new Date(),
      },
    });

    return { ok: true };
  });
}
