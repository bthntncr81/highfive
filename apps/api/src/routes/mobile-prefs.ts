// Mobile (Customer) Notification Preferences — Customer auth zorunlu
// GET   /api/mobile/prefs/notifications
// PATCH /api/mobile/prefs/notifications

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyCustomerAuth } from '../lib/customer-auth';

const DEFAULT_PREFS = {
  pushEnabled: true,
  orderStatus: true,
  campaigns: true,
  loyalty: true,
  marketing: true,
  quietHoursStart: null as string | null,
  quietHoursEnd: null as string | null,
};

export default async function mobilePrefsRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // GET
  server.get('/notifications', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
  ) => {
    const customerId = (request as any).customerId as string;
    let prefs = await prisma.notificationPreference.findUnique({
      where: { customerId },
    });
    if (!prefs) {
      // Lazy create
      prefs = await prisma.notificationPreference.create({
        data: { customerId, ...DEFAULT_PREFS },
      });
    }
    return { preferences: prefs };
  });

  // PATCH
  server.patch('/notifications', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const body = (request.body ?? {}) as Partial<typeof DEFAULT_PREFS>;

    const data: any = {};
    for (const k of [
      'pushEnabled', 'orderStatus', 'campaigns', 'loyalty', 'marketing',
      'quietHoursStart', 'quietHoursEnd',
    ] as const) {
      if (body[k] !== undefined) data[k] = body[k];
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { customerId },
      update: data,
      create: { customerId, ...DEFAULT_PREFS, ...data },
    });

    // pushEnabled=false olduysa device'ları pasifleştir
    if (data.pushEnabled === false) {
      await prisma.deviceToken.updateMany({
        where: { customerId },
        data: { isActive: false },
      });
    } else if (data.pushEnabled === true) {
      // Tekrar aç (sadece silinmemiş olanlar)
      await prisma.deviceToken.updateMany({
        where: { customerId },
        data: { isActive: true },
      });
    }

    return { preferences: prefs };
  });
}
