// Device token registration + push history (mobile)
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function getCustomerId(request: any): string | null {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as {
      customerId?: string;
      type?: string;
    };
    if (decoded.type !== 'customer' || !decoded.customerId) return null;
    return decoded.customerId;
  } catch {
    return null;
  }
}

export default async function devicesRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Register / refresh device token
  // Auth opsiyonel — anonim cihazlar da kayıt olabilir, login olunca customerId bind edilir
  server.post('/register', async (request: any, reply: any) => {
    const body = (request.body ?? {}) as {
      token?: string;
      platform?: 'ios' | 'android';
      deviceId?: string;
      appVersion?: string;
      locale?: string;
    };

    if (!body.token || !body.platform) {
      return reply.status(400).send({ error: 'token ve platform gerekli' });
    }

    const customerId = getCustomerId(request);

    const existing = await prisma.deviceToken.findUnique({
      where: { token: body.token },
    });

    let device;
    if (existing) {
      device = await prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          platform: body.platform,
          customerId: customerId ?? existing.customerId,
          deviceId: body.deviceId ?? existing.deviceId,
          appVersion: body.appVersion ?? existing.appVersion,
          locale: body.locale ?? existing.locale,
          isActive: true,
          lastSeenAt: new Date(),
        },
      });
    } else {
      device = await prisma.deviceToken.create({
        data: {
          token: body.token,
          platform: body.platform,
          customerId,
          deviceId: body.deviceId,
          appVersion: body.appVersion,
          locale: body.locale,
          isActive: true,
        },
      });
    }

    return { ok: true, deviceId: device.id };
  });

  // Unregister (cihazda push'u kapat)
  server.post('/unregister', async (request: any, reply: any) => {
    const { token } = (request.body ?? {}) as { token?: string };
    if (!token) return reply.status(400).send({ error: 'token gerekli' });
    await prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
    return { ok: true };
  });
}
