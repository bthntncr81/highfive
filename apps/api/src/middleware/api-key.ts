import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface IntegrationPartner {
  id: string;
  name: string;
  permissions: string[];
  locationId: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    partner?: IntegrationPartner;
  }
}

/**
 * Verify API Key from X-API-Key header
 * Attaches partner info to request.partner
 */
export async function verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return reply.status(401).send({ error: 'API key gerekli (X-API-Key header)' });
  }

  const prisma = (request.server as any).prisma as PrismaClient;

  const partner = await prisma.integrationPartner.findUnique({
    where: { apiKey },
    select: {
      id: true,
      name: true,
      isActive: true,
      permissions: true,
      locationId: true,
      webhookUrl: true,
      webhookSecret: true,
    },
  });

  if (!partner || !partner.isActive) {
    return reply.status(401).send({ error: 'Gecersiz veya devre disi API key' });
  }

  (request as any).partner = {
    id: partner.id,
    name: partner.name,
    permissions: partner.permissions,
    locationId: partner.locationId,
    webhookUrl: partner.webhookUrl,
    webhookSecret: partner.webhookSecret,
  };
}

/**
 * Check if partner has a specific permission
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First verify API key
    await verifyApiKey(request, reply);
    if (reply.sent) return;

    const partner = (request as any).partner as IntegrationPartner;
    if (!partner.permissions.includes(permission)) {
      return reply.status(403).send({
        error: `Bu islem icin yetkiniz yok. Gerekli izin: ${permission}`,
      });
    }
  };
}
