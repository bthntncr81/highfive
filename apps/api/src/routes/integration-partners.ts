import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '../middleware/auth';

/**
 * Integration Partner Management Routes (JWT Auth - Admin only)
 *
 * Bu route'lar POS admin panelinden entegrasyon ortaklarını yönetmek için kullanılır.
 * External API'deki admin-key tabanlı partner oluşturmadan farklı olarak,
 * burada JWT auth ile normal POS kullanıcıları (ADMIN/MANAGER) partner yönetimi yapabilir.
 */
export default async function integrationPartnerRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  /**
   * GET /api/integration-partners
   * Tüm entegrasyon ortaklarını listele
   */
  server.get(
    '/',
    { preHandler: verifyAdmin },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const partners = await prisma.integrationPartner.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          apiKey: true,
          isActive: true,
          webhookUrl: true,
          webhookSecret: true,
          permissions: true,
          locationId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { webhookLogs: true },
          },
        },
      });

      // API key'in sadece son 8 karakterini göster (güvenlik)
      const maskedPartners = partners.map((p) => ({
        ...p,
        apiKeyMasked: `****${p.apiKey.slice(-8)}`,
        webhookLogCount: p._count.webhookLogs,
        _count: undefined,
      }));

      return { partners: maskedPartners };
    },
  );

  /**
   * POST /api/integration-partners
   * Yeni entegrasyon ortağı oluştur
   */
  server.post(
    '/',
    { preHandler: verifyAdmin },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, webhookUrl, permissions, locationId } = request.body as {
        name: string;
        webhookUrl?: string;
        permissions?: string[];
        locationId?: string;
      };

      if (!name || name.trim().length === 0) {
        return reply.status(400).send({ error: 'Partner adi gerekli' });
      }

      // Generate API key and webhook secret
      const crypto = await import('crypto');
      const apiKey = crypto.randomBytes(32).toString('hex');
      const webhookSecret = crypto.randomBytes(16).toString('hex');

      const partner = await prisma.integrationPartner.create({
        data: {
          name: name.trim(),
          apiKey,
          webhookUrl: webhookUrl || null,
          webhookSecret,
          permissions: permissions || ['menu:read', 'orders:write', 'orders:read'],
          locationId: locationId || null,
        },
      });

      console.log(`🔗 [Integration] Yeni partner oluşturuldu: ${partner.name} (${partner.id})`);

      // API key sadece oluşturulduğunda tam olarak gösterilir
      return {
        id: partner.id,
        name: partner.name,
        apiKey: partner.apiKey,
        webhookSecret: partner.webhookSecret,
        webhookUrl: partner.webhookUrl,
        permissions: partner.permissions,
        locationId: partner.locationId,
        createdAt: partner.createdAt,
        message: 'API key ve webhook secret sadece bir kez gösterilir. Güvenli bir yerde saklayın!',
      };
    },
  );

  /**
   * PATCH /api/integration-partners/:id
   * Partner bilgilerini güncelle (isActive, webhookUrl, name)
   */
  server.patch(
    '/:id',
    { preHandler: verifyAdmin },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { name, webhookUrl, isActive, permissions, locationId } = request.body as {
        name?: string;
        webhookUrl?: string | null;
        isActive?: boolean;
        permissions?: string[];
        locationId?: string | null;
      };

      // Check if partner exists
      const existing = await prisma.integrationPartner.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Partner bulunamadi' });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (locationId !== undefined) updateData.locationId = locationId;

      const updated = await prisma.integrationPartner.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          isActive: true,
          webhookUrl: true,
          permissions: true,
          locationId: true,
          updatedAt: true,
        },
      });

      console.log(`🔗 [Integration] Partner güncellendi: ${updated.name} (${updated.id})`);

      return { partner: updated };
    },
  );

  /**
   * POST /api/integration-partners/:id/regenerate-key
   * API key yeniden oluştur (eski key geçersiz olur)
   */
  server.post(
    '/:id/regenerate-key',
    { preHandler: verifyAdmin },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.integrationPartner.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Partner bulunamadi' });
      }

      const crypto = await import('crypto');
      const newApiKey = crypto.randomBytes(32).toString('hex');
      const newWebhookSecret = crypto.randomBytes(16).toString('hex');

      await prisma.integrationPartner.update({
        where: { id },
        data: {
          apiKey: newApiKey,
          webhookSecret: newWebhookSecret,
        },
      });

      console.log(`🔑 [Integration] API key yenilendi: ${existing.name} (${id})`);

      return {
        apiKey: newApiKey,
        webhookSecret: newWebhookSecret,
        message: 'Yeni API key ve webhook secret oluşturuldu. Eski key artık geçersiz!',
      };
    },
  );

  /**
   * GET /api/integration-partners/:id/reveal-key
   * Mevcut API key'i göster (admin only)
   */
  server.get(
    '/:id/reveal-key',
    { preHandler: verifyAdmin },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const partner = await prisma.integrationPartner.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          apiKey: true,
          webhookSecret: true,
        },
      });

      if (!partner) {
        return reply.status(404).send({ error: 'Partner bulunamadi' });
      }

      return {
        apiKey: partner.apiKey,
        webhookSecret: partner.webhookSecret,
      };
    },
  );

  /**
   * DELETE /api/integration-partners/:id
   * Partner'ı sil (webhook logları da silinir - cascade)
   */
  server.delete(
    '/:id',
    { preHandler: verifyAdmin },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.integrationPartner.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Partner bulunamadi' });
      }

      await prisma.integrationPartner.delete({
        where: { id },
      });

      console.log(`🗑️ [Integration] Partner silindi: ${existing.name} (${id})`);

      return { success: true, message: `${existing.name} silindi` };
    },
  );

  /**
   * GET /api/integration-partners/:id/logs
   * Partner'ın webhook loglarını getir
   */
  server.get(
    '/:id/logs',
    { preHandler: verifyAdmin },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { limit = '20', offset = '0' } = request.query as { limit?: string; offset?: string };

      const logs = await prisma.webhookLog.findMany({
        where: { partnerId: id },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
        select: {
          id: true,
          event: true,
          statusCode: true,
          error: true,
          attempts: true,
          createdAt: true,
        },
      });

      const total = await prisma.webhookLog.count({
        where: { partnerId: id },
      });

      return { logs, total };
    },
  );
}
