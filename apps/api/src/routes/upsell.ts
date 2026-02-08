// Upselling & Cross-selling Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';

export default async function upsellRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== UPSELLING ====================

  // Get upsell suggestions for an item
  server.get(
    '/menu/:id/upsells',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const upsells = await prisma.menuItemUpsell.findMany({
        where: { fromItemId: id, active: true },
        include: {
          toItem: {
            include: { category: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      return {
        suggestions: upsells.map((u) => ({
          id: u.id,
          item: u.toItem,
          message: u.message,
          discountAmount: u.discountAmount,
        })),
      };
    }
  );

  // Create upsell relationship
  server.post(
    '/upsells',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fromItemId, toItemId, message, discountAmount } = request.body as {
        fromItemId: string;
        toItemId: string;
        message?: string;
        discountAmount?: number;
      };

      if (fromItemId === toItemId) {
        return reply.status(400).send({ error: 'Aynı ürün upsell olamaz' });
      }

      // Check if items exist
      const [fromItem, toItem] = await Promise.all([
        prisma.menuItem.findUnique({ where: { id: fromItemId } }),
        prisma.menuItem.findUnique({ where: { id: toItemId } }),
      ]);

      if (!fromItem || !toItem) {
        return reply.status(404).send({ error: 'Ürün bulunamadı' });
      }

      const upsell = await prisma.menuItemUpsell.upsert({
        where: {
          fromItemId_toItemId: { fromItemId, toItemId },
        },
        update: { message, discountAmount, active: true },
        create: {
          fromItemId,
          toItemId,
          message: message || `${toItem.name} da ekleyin!`,
          discountAmount,
        },
      });

      return { success: true, upsell };
    }
  );

  // Delete upsell
  server.delete(
    '/upsells/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      await prisma.menuItemUpsell.delete({ where: { id } });

      return { success: true };
    }
  );

  // List all upsells
  server.get(
    '/upsells',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const upsells = await prisma.menuItemUpsell.findMany({
        include: {
          fromItem: true,
          toItem: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return { upsells };
    }
  );

  // ==================== CROSS-SELLING ====================

  // Get cross-sell suggestions for cart items
  server.post(
    '/crosssells/suggestions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { cartItemIds } = request.body as { cartItemIds: string[] };

      if (!cartItemIds || cartItemIds.length === 0) {
        return { suggestions: [] };
      }

      const crossSells = await prisma.menuItemCrossSell.findMany({
        where: {
          fromItemId: { in: cartItemIds },
          active: true,
          toItemId: { notIn: cartItemIds }, // Don't suggest items already in cart
        },
        include: {
          toItem: {
            include: { category: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      // Deduplicate by toItemId
      const seen = new Set<string>();
      const uniqueSuggestions = crossSells.filter((cs) => {
        if (seen.has(cs.toItemId)) return false;
        seen.add(cs.toItemId);
        return true;
      });

      return {
        suggestions: uniqueSuggestions.slice(0, 3).map((cs) => ({
          id: cs.id,
          item: cs.toItem,
          message: cs.message,
          discountAmount: cs.discountAmount,
        })),
      };
    }
  );

  // Create cross-sell relationship
  server.post(
    '/crosssells',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fromItemId, toItemId, message, discountAmount } = request.body as {
        fromItemId: string;
        toItemId: string;
        message?: string;
        discountAmount?: number;
      };

      if (fromItemId === toItemId) {
        return reply.status(400).send({ error: 'Aynı ürün cross-sell olamaz' });
      }

      const [fromItem, toItem] = await Promise.all([
        prisma.menuItem.findUnique({ where: { id: fromItemId } }),
        prisma.menuItem.findUnique({ where: { id: toItemId } }),
      ]);

      if (!fromItem || !toItem) {
        return reply.status(404).send({ error: 'Ürün bulunamadı' });
      }

      const crossSell = await prisma.menuItemCrossSell.upsert({
        where: {
          fromItemId_toItemId: { fromItemId, toItemId },
        },
        update: { message, discountAmount, active: true },
        create: {
          fromItemId,
          toItemId,
          message: message || 'Bunu da beğenebilirsiniz',
          discountAmount,
        },
      });

      return { success: true, crossSell };
    }
  );

  // Delete cross-sell
  server.delete(
    '/crosssells/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      await prisma.menuItemCrossSell.delete({ where: { id } });

      return { success: true };
    }
  );

  // List all cross-sells
  server.get(
    '/crosssells',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const crossSells = await prisma.menuItemCrossSell.findMany({
        include: {
          fromItem: true,
          toItem: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return { crossSells };
    }
  );

  // ==================== ANALYTICS ====================

  // Track upsell acceptance
  server.post(
    '/upsells/:id/accepted',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { orderId } = request.body as { orderId?: string };

      await prisma.analyticsEvent.create({
        data: {
          eventType: 'upsell_accepted',
          eventData: { upsellId: id, orderId },
        },
      });

      return { success: true };
    }
  );

  // Track cross-sell acceptance
  server.post(
    '/crosssells/:id/accepted',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { orderId } = request.body as { orderId?: string };

      await prisma.analyticsEvent.create({
        data: {
          eventType: 'crosssell_accepted',
          eventData: { crossSellId: id, orderId },
        },
      });

      return { success: true };
    }
  );

  // Get upsell/cross-sell performance stats
  server.get(
    '/sales-suggestions/stats',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [upsellAccepted, crossSellAccepted, totalUpsellItems, totalCrossSellItems] =
        await Promise.all([
          prisma.analyticsEvent.count({
            where: {
              eventType: 'upsell_accepted',
              createdAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.analyticsEvent.count({
            where: {
              eventType: 'crosssell_accepted',
              createdAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.orderItem.count({
            where: {
              isUpsell: true,
              createdAt: { gte: thirtyDaysAgo },
            },
          }),
          prisma.orderItem.count({
            where: {
              isCrossSell: true,
              createdAt: { gte: thirtyDaysAgo },
            },
          }),
        ]);

      return {
        last30Days: {
          upsellAccepted,
          crossSellAccepted,
          totalUpsellItems,
          totalCrossSellItems,
        },
      };
    }
  );
}

