// Stock Management Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';
import { broadcastMenuUpdate } from '../websocket';

export default async function stockRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Toggle item availability (quick out of stock)
  server.patch(
    '/menu/:id/availability',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { available, reason, until } = request.body as {
        available: boolean;
        reason?: string;
        until?: string; // ISO date string
      };

      const menuItem = await prisma.menuItem.findUnique({ where: { id } });
      if (!menuItem) {
        return reply.status(404).send({ error: 'Ürün bulunamadı' });
      }

      const updated = await prisma.menuItem.update({
        where: { id },
        data: {
          available,
          outOfStockReason: available ? null : reason,
          outOfStockUntil: available ? null : until ? new Date(until) : null,
        },
      });

      // Broadcast to all clients
      broadcastMenuUpdate({ action: 'availability', item: updated });

      return {
        success: true,
        item: updated,
        message: available ? 'Ürün tekrar satışta' : 'Ürün geçici olarak kapatıldı',
      };
    }
  );

  // Bulk toggle availability (multiple items)
  server.patch(
    '/menu/bulk-availability',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { itemIds, available, reason } = request.body as {
        itemIds: string[];
        available: boolean;
        reason?: string;
      };

      if (!itemIds || itemIds.length === 0) {
        return reply.status(400).send({ error: 'Ürün ID listesi gerekli' });
      }

      await prisma.menuItem.updateMany({
        where: { id: { in: itemIds } },
        data: {
          available,
          outOfStockReason: available ? null : reason,
        },
      });

      broadcastMenuUpdate({ action: 'bulk-availability', itemIds, available });

      return {
        success: true,
        message: `${itemIds.length} ürün güncellendi`,
      };
    }
  );

  // Update stock quantity
  server.patch(
    '/menu/:id/stock',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { quantity, lowStockAlert } = request.body as {
        quantity?: number;
        lowStockAlert?: number;
      };

      const menuItem = await prisma.menuItem.findUnique({ where: { id } });
      if (!menuItem) {
        return reply.status(404).send({ error: 'Ürün bulunamadı' });
      }

      const updateData: any = {};
      if (quantity !== undefined) updateData.stockQuantity = quantity;
      if (lowStockAlert !== undefined) updateData.lowStockAlert = lowStockAlert;

      // Auto-disable if stock is 0
      if (quantity !== undefined && quantity <= 0) {
        updateData.available = false;
        updateData.outOfStockReason = 'Stok tükendi';
      }

      const updated = await prisma.menuItem.update({
        where: { id },
        data: updateData,
      });

      broadcastMenuUpdate({ action: 'stock', item: updated });

      return { success: true, item: updated };
    }
  );

  // Decrease stock after order (internal use)
  server.post(
    '/stock/decrease',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { items } = request.body as {
        items: { menuItemId: string; quantity: number }[];
      };

      const results = [];

      for (const item of items) {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
        });

        if (menuItem && menuItem.stockQuantity !== null) {
          const newQuantity = Math.max(0, menuItem.stockQuantity - item.quantity);
          
          const updated = await prisma.menuItem.update({
            where: { id: item.menuItemId },
            data: {
              stockQuantity: newQuantity,
              available: newQuantity > 0,
              outOfStockReason: newQuantity <= 0 ? 'Stok tükendi' : null,
            },
          });

          results.push({
            menuItemId: item.menuItemId,
            previousStock: menuItem.stockQuantity,
            newStock: newQuantity,
            isLowStock: menuItem.lowStockAlert && newQuantity <= menuItem.lowStockAlert,
          });

          // Alert if low stock
          if (menuItem.lowStockAlert && newQuantity <= menuItem.lowStockAlert && newQuantity > 0) {
            broadcastMenuUpdate({
              action: 'low-stock-alert',
              item: updated,
              remaining: newQuantity,
            });
          }
        }
      }

      return { success: true, results };
    }
  );

  // Get low stock items
  server.get(
    '/stock/low',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const items = await prisma.menuItem.findMany({
        where: {
          stockQuantity: { not: null },
          lowStockAlert: { not: null },
        },
        include: { category: true },
      });

      const lowStockItems = items.filter(
        (item) =>
          item.stockQuantity !== null &&
          item.lowStockAlert !== null &&
          item.stockQuantity <= item.lowStockAlert
      );

      return { items: lowStockItems };
    }
  );

  // Get out of stock items
  server.get(
    '/stock/out',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const items = await prisma.menuItem.findMany({
        where: { available: false },
        include: { category: true },
      });

      return { items };
    }
  );

  // Auto-restock check (for scheduled items)
  server.post(
    '/stock/auto-restock',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const now = new Date();

      // Find items that should be restocked
      const itemsToRestock = await prisma.menuItem.findMany({
        where: {
          available: false,
          outOfStockUntil: { lte: now },
        },
      });

      if (itemsToRestock.length > 0) {
        await prisma.menuItem.updateMany({
          where: {
            id: { in: itemsToRestock.map((i) => i.id) },
          },
          data: {
            available: true,
            outOfStockReason: null,
            outOfStockUntil: null,
          },
        });

        broadcastMenuUpdate({
          action: 'auto-restock',
          itemIds: itemsToRestock.map((i) => i.id),
        });
      }

      return {
        success: true,
        restockedCount: itemsToRestock.length,
        items: itemsToRestock.map((i) => i.name),
      };
    }
  );
}

