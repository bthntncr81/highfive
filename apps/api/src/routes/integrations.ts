// ============================================================================
// "Bağlan" akışı — POS Ayarlar → WhatsApp Sipariş Modülüne Bağlan.
// ============================================================================
// Bu uç, tenant için bir IntegrationPartner (API key) üretir ve modülün POS'a
// erişmesi için gereken { posApiUrl, posApiKey } yapılandırmasını döner. İstenirse
// modülün kendi connect endpoint'ine bu config'i otomatik yazar (pos-integration).
// Veri düzlemi zaten routes/external.ts (menu:read / orders:write / orders:read).
//
// Pro+ paket özelliği: requireFeature('whatsappLink').

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as crypto from 'crypto';
import { verifyAdmin } from '../middleware/auth';
import { requireFeature } from '../lib/plan-limits';

const WHATSAPP_PARTNER_NAME = 'WhatsApp Sipariş Modülü';
const BASE_DOMAIN = process.env.PLATFORM_BASE_DOMAIN || 'otorder.com';

export default async function integrationRoutes(server: FastifyInstance) {
  // Modülün POS'a erişeceği taban URL (tenant subdomain'i). API key tenant'ı
  // çözdüğü için host esnektir; netlik için subdomain host'u veririz.
  const posApiUrlFor = (subdomain: string) => `https://${subdomain}.${BASE_DOMAIN}/api/external`;

  // Durum — bağlı mı, aktif mi, son webhook?
  server.get(
    '/whatsapp/status',
    { preHandler: [verifyAdmin, requireFeature('whatsappLink')] },
    async (request: FastifyRequest) => {
      const partner = await request.db.integrationPartner.findFirst({
        where: { name: WHATSAPP_PARTNER_NAME },
      });
      if (!partner) return { connected: false };
      const lastLog = await request.db.webhookLog.findFirst({
        where: { partnerId: partner.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, event: true, statusCode: true },
      }).catch(() => null);
      return {
        connected: partner.isActive,
        partnerId: partner.id,
        apiKeyMasked: `****${partner.apiKey.slice(-8)}`,
        webhookUrl: partner.webhookUrl,
        posApiUrl: posApiUrlFor(request.tenant!.subdomain),
        lastEvent: lastLog,
      };
    },
  );

  // Bağlan — partner oluştur/yenile + config döner + (opsiyonel) modüle yaz.
  server.post(
    '/whatsapp/connect',
    { preHandler: [verifyAdmin, requireFeature('whatsappLink')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { webhookUrl, moduleBaseUrl, moduleToken } = request.body as {
        webhookUrl?: string; // modülün HighFive'dan olay alacağı webhook
        moduleBaseUrl?: string; // modül connect endpoint'i (opsiyonel otomatik yazım)
        moduleToken?: string; // modül hesabının oturum token'ı (opsiyonel)
      };

      const apiKey = crypto.randomBytes(32).toString('hex');
      const existing = await request.db.integrationPartner.findFirst({
        where: { name: WHATSAPP_PARTNER_NAME },
      });

      const partner = existing
        ? await request.db.integrationPartner.update({
            where: { id: existing.id },
            data: { isActive: true, apiKey, webhookUrl: webhookUrl ?? existing.webhookUrl },
          })
        : await request.db.integrationPartner.create({
            data: {
              name: WHATSAPP_PARTNER_NAME,
              apiKey,
              webhookUrl: webhookUrl ?? null,
              permissions: ['menu:read', 'orders:write', 'orders:read'],
            },
          });

      const config = {
        posApiUrl: posApiUrlFor(request.tenant!.subdomain),
        posApiKey: apiKey,
        tenant: request.tenant!.subdomain,
      };

      // Opsiyonel: modülün pos-integration/connect endpoint'ine config'i yaz.
      let pushedToModule = false;
      if (moduleBaseUrl) {
        try {
          const res = await fetch(`${moduleBaseUrl.replace(/\/$/, '')}/api/pos-integration/connect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(moduleToken ? { Authorization: `Bearer ${moduleToken}` } : {}),
            },
            body: JSON.stringify(config),
          });
          pushedToModule = res.ok;
        } catch {
          pushedToModule = false; // modül erişilemezse tenant config'i elle girer
        }
      }

      return reply.send({
        success: true,
        connected: true,
        config, // tenant bunu modüle girer (otomatik yazılamadıysa)
        pushedToModule,
        partnerId: partner.id,
      });
    },
  );

  // Bağlantıyı kes — partner'ı pasifleştir (kayıt/loglar durur).
  server.post(
    '/whatsapp/disconnect',
    { preHandler: [verifyAdmin, requireFeature('whatsappLink')] },
    async (request: FastifyRequest) => {
      const partner = await request.db.integrationPartner.findFirst({
        where: { name: WHATSAPP_PARTNER_NAME },
      });
      if (partner) {
        await request.db.integrationPartner.update({
          where: { id: partner.id },
          data: { isActive: false },
        });
      }
      return { success: true, connected: false };
    },
  );
}
