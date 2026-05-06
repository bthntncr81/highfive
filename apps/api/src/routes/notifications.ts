// Push Notifications — POS yönetim ekranı için
// CRUD + schedule + send-now + history + stats
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '../middleware/auth';
import { sendCampaignPush, sendPushToTokens } from '../lib/push';

type TargetType = 'ALL' | 'VERIFIED' | 'CUSTOMER' | 'DEVICE';

export default async function notificationRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== LIST ====================
  server.get('/notifications', { preHandler: verifyAdmin }, async (request: any) => {
    const { status, limit } = request.query as { status?: string; limit?: string };
    const where: any = {};
    if (status) where.status = status;
    const notifications = await prisma.pushNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit || '100', 10), 500),
      include: {
        campaign: { select: { id: true, name: true } },
      },
    });
    return { notifications };
  });

  // ==================== STATS ====================
  server.get('/notifications/stats', { preHandler: verifyAdmin }, async () => {
    const totalDevices = await prisma.deviceToken.count({ where: { isActive: true } });
    const verifiedDevices = await prisma.deviceToken.count({
      where: { isActive: true, customer: { isVerified: true } },
    });
    const iosDevices = await prisma.deviceToken.count({
      where: { isActive: true, platform: 'ios' },
    });
    const androidDevices = await prisma.deviceToken.count({
      where: { isActive: true, platform: 'android' },
    });
    const totalSent = await prisma.pushNotification.count({ where: { status: 'SENT' } });
    const totalScheduled = await prisma.pushNotification.count({
      where: { status: 'SCHEDULED' },
    });
    const lastNotification = await prisma.pushNotification.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return {
      totalDevices,
      verifiedDevices,
      iosDevices,
      androidDevices,
      totalSent,
      totalScheduled,
      lastNotification,
    };
  });

  // ==================== GET DETAIL ====================
  server.get('/notifications/:id', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const { id } = request.params as { id: string };
    const notification = await prisma.pushNotification.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!notification) return reply.status(404).send({ error: 'Bulunamadı' });
    return { notification };
  });

  // ==================== CREATE (Send NOW or SCHEDULE) ====================
  server.post('/notifications', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const body = (request.body ?? {}) as {
      title?: string;
      body?: string;
      imageUrl?: string;
      data?: Record<string, unknown>;
      campaignId?: string;
      targetType?: TargetType;
      targetIds?: string[];
      scheduledAt?: string;            // ISO; null/undefined = hemen gönder
      sendNow?: boolean;               // true = scheduledAt'ı yoksay, anında gönder
    };

    if (!body.title || !body.body) {
      return reply.status(400).send({ error: 'title ve body gerekli' });
    }

    const sendNow = body.sendNow === true || !body.scheduledAt;

    if (sendNow) {
      const result = await sendCampaignPush(prisma, {
        title: body.title,
        body: body.body,
        imageUrl: body.imageUrl,
        data: body.data,
        campaignId: body.campaignId,
        targetType: body.targetType ?? 'ALL',
        targetIds: body.targetIds ?? [],
      });
      return result;
    }

    // SCHEDULE
    const scheduledAt = new Date(body.scheduledAt!);
    if (isNaN(scheduledAt.getTime())) {
      return reply.status(400).send({ error: 'Geçersiz scheduledAt' });
    }
    if (scheduledAt.getTime() < Date.now() + 30_000) {
      return reply.status(400).send({ error: 'Zamanlanan tarih en az 30 sn sonra olmalı' });
    }

    const notification = await prisma.pushNotification.create({
      data: {
        title: body.title,
        body: body.body,
        imageUrl: body.imageUrl,
        data: (body.data as any) ?? {},
        campaignId: body.campaignId,
        targetType: body.targetType ?? 'ALL',
        targetIds: body.targetIds ?? [],
        scheduledAt,
        status: 'SCHEDULED',
      },
    });
    return { notification };
  });

  // ==================== UPDATE (only SCHEDULED) ====================
  server.patch('/notifications/:id', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.pushNotification.findUnique({
      where: { id },
    });
    if (!existing) return reply.status(404).send({ error: 'Bulunamadı' });
    if (existing.status !== 'SCHEDULED' && existing.status !== 'DRAFT') {
      return reply.status(400).send({ error: 'Sadece zamanlanmış bildirim düzenlenebilir' });
    }

    const body = (request.body ?? {}) as Record<string, any>;
    const data: any = {};
    for (const k of ['title', 'body', 'imageUrl', 'targetType', 'targetIds', 'data']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.scheduledAt !== undefined) {
      const d = new Date(body.scheduledAt);
      if (isNaN(d.getTime())) return reply.status(400).send({ error: 'Geçersiz scheduledAt' });
      data.scheduledAt = d;
    }

    const updated = await prisma.pushNotification.update({
      where: { id },
      data,
    });
    return { notification: updated };
  });

  // ==================== CANCEL (scheduled) ====================
  server.post('/notifications/:id/cancel', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.pushNotification.findUnique({
      where: { id },
    });
    if (!existing) return reply.status(404).send({ error: 'Bulunamadı' });
    if (existing.status !== 'SCHEDULED') {
      return reply.status(400).send({ error: 'Sadece zamanlanmış bildirim iptal edilebilir' });
    }
    const updated = await prisma.pushNotification.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    return { notification: updated };
  });

  // ==================== TEST: Send to a single token ====================
  server.post('/notifications/test', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const { token, title, body } = (request.body ?? {}) as {
      token?: string;
      title?: string;
      body?: string;
    };
    if (!token || !title || !body) {
      return reply.status(400).send({ error: 'token, title, body gerekli' });
    }
    const result = await sendPushToTokens([token], { title, body });
    return result;
  });
}

// ==================== SCHEDULED WORKER ====================
// Her dakikada bir çalışan basit worker (main.ts'ten setInterval ile başlatılır)
export async function processScheduledNotifications(prisma: PrismaClient): Promise<void> {
  const due = await prisma.pushNotification.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date() },
    },
    take: 50,
  });

  if (due.length === 0) return;

  for (const n of due) {
    try {
      // Status'u SENDING'e al (race condition koruması)
      const claimed = await prisma.pushNotification.updateMany({
        where: { id: n.id, status: 'SCHEDULED' },
        data: { status: 'SENDING' },
      });
      if (claimed.count === 0) continue; // başka worker aldı

      await sendCampaignPush(prisma, {
        title: n.title,
        body: n.body,
        imageUrl: n.imageUrl ?? undefined,
        data: (n.data as Record<string, unknown>) ?? {},
        campaignId: n.campaignId ?? undefined,
        targetType: (n.targetType as TargetType) ?? 'ALL',
        targetIds: n.targetIds,
      });

      // sendCampaignPush kendi notification kaydını oluşturuyor; orijinali güncelleyelim
      await prisma.pushNotification.update({
        where: { id: n.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (e: any) {
      console.error('[push-worker] error', e);
      await prisma.pushNotification.update({
        where: { id: n.id },
        data: { status: 'FAILED' },
      });
    }
  }
}
