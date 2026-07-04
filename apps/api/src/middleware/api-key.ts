import { FastifyRequest, FastifyReply } from 'fastify';
import { platformDb, dbFor } from '../lib/tenant-db';

interface IntegrationPartner {
  id: string;
  tenantId: string;
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
 * X-API-Key header ile partner doğrulama.
 *
 * ÖNEMLİ (çok-kiracılı): dış entegrasyon (WhatsApp modülü) JWT/subdomain taşımaz;
 * tenant API KEY'den çözülür. Partner platformDb ile bulunur (cross-tenant), sonra
 * request.tenant + request.db = dbFor(partner.tenantId) atanır → external route'lar
 * doğru tenant'a scope'lanır (tenant hook bu istekte tenant'ı çözemezdi).
 */
export async function verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return reply.status(401).send({ error: 'API key gerekli (X-API-Key header)' });
  }

  const partner = await platformDb.integrationPartner.findUnique({
    where: { apiKey },
    select: {
      id: true,
      tenantId: true,
      name: true,
      isActive: true,
      permissions: true,
      locationId: true,
      webhookUrl: true,
      webhookSecret: true,
      tenant: { select: { id: true, name: true, subdomain: true, status: true } },
    },
  });

  if (!partner || !partner.isActive) {
    return reply.status(401).send({ error: 'Gecersiz veya devre disi API key' });
  }
  if (partner.tenant?.status === 'SUSPENDED') {
    return reply.status(402).send({ error: 'Hesap askıda', code: 'TENANT_SUSPENDED' });
  }

  // Tenant bağlamını API key'den kur (external route'lar request.db kullanır)
  (request as any).tenant = {
    id: partner.tenant!.id,
    name: partner.tenant!.name,
    subdomain: partner.tenant!.subdomain,
    status: partner.tenant!.status,
  };
  (request as any).db = dbFor(partner.tenantId);

  (request as any).partner = {
    id: partner.id,
    tenantId: partner.tenantId,
    name: partner.name,
    permissions: partner.permissions,
    locationId: partner.locationId,
    webhookUrl: partner.webhookUrl,
    webhookSecret: partner.webhookSecret,
  };
}

/**
 * Partner'ın belirli bir izne sahip olduğunu doğrula (verifyApiKey + izin kontrolü).
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
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
