// Multi-Location / Branch Management Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';

export default async function locationRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Get all locations
  server.get('/locations', async (request: FastifyRequest, reply: FastifyReply) => {
    const locations = await prisma.location.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return { locations };
  });

  // Get location by ID or code
  server.get('/locations/:idOrCode', async (request: FastifyRequest, reply: FastifyReply) => {
    const { idOrCode } = request.params as { idOrCode: string };

    const location = await prisma.location.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
      include: {
        tables: { where: { active: true }, orderBy: { number: 'asc' } },
        happyHours: { where: { active: true } },
      },
    });

    if (!location) {
      return reply.status(404).send({ error: 'Lokasyon bulunamadı' });
    }

    return { location };
  });

  // Create location
  server.post(
    '/locations',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, code, address, phone, email, taxRate, serviceCharge, currency, settings } =
        request.body as {
          name: string;
          code: string;
          address?: string;
          phone?: string;
          email?: string;
          taxRate?: number;
          serviceCharge?: number;
          currency?: string;
          settings?: any;
        };

      // Check if code is unique
      const existing = await prisma.location.findUnique({ where: { code } });
      if (existing) {
        return reply.status(400).send({ error: 'Bu lokasyon kodu zaten kullanımda' });
      }

      const location = await prisma.location.create({
        data: {
          name,
          code: code.toLowerCase().replace(/\s/g, '-'),
          address,
          phone,
          email,
          taxRate: taxRate || 10,
          serviceCharge: serviceCharge || 0,
          currency: currency || 'TRY',
          settings,
        },
      });

      return { success: true, location };
    }
  );

  // Update location
  server.put(
    '/locations/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      // Prevent code change if it conflicts
      if (data.code) {
        const existing = await prisma.location.findFirst({
          where: { code: data.code, NOT: { id } },
        });
        if (existing) {
          return reply.status(400).send({ error: 'Bu lokasyon kodu zaten kullanımda' });
        }
      }

      const location = await prisma.location.update({
        where: { id },
        data,
      });

      return { success: true, location };
    }
  );

  // Delete location (soft delete)
  server.delete(
    '/locations/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      // Check if location has active orders
      const activeOrders = await prisma.order.count({
        where: {
          locationId: id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      });

      if (activeOrders > 0) {
        return reply.status(400).send({
          error: 'Bu lokasyonda aktif siparişler var, silinemez',
        });
      }

      await prisma.location.update({
        where: { id },
        data: { active: false },
      });

      return { success: true };
    }
  );

  // Set default location
  server.post(
    '/locations/:id/set-default',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      // Remove default from all
      await prisma.location.updateMany({
        data: { isDefault: false },
      });

      // Set new default
      await prisma.location.update({
        where: { id },
        data: { isDefault: true },
      });

      return { success: true };
    }
  );

  // Get location menu (with location-specific pricing)
  server.get('/locations/:id/menu', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) {
      return reply.status(404).send({ error: 'Lokasyon bulunamadı' });
    }

    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { available: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            locations: {
              where: { locationId: id },
            },
          },
        },
      },
    });

    // Apply location-specific pricing
    const menuWithPricing = categories.map((cat) => ({
      ...cat,
      items: cat.items
        .filter((item) => {
          // Check if item is available at this location
          const locSetting = item.locations[0];
          if (locSetting && !locSetting.available) return false;
          return true;
        })
        .map((item) => {
          const locSetting = item.locations[0];
          return {
            ...item,
            price: locSetting?.price || item.price,
            locations: undefined, // Don't expose location settings
          };
        }),
    }));

    return { categories: menuWithPricing };
  });

  // Set location-specific item price
  server.post(
    '/locations/:locationId/menu/:menuItemId',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { locationId, menuItemId } = request.params as {
        locationId: string;
        menuItemId: string;
      };
      const { price, available } = request.body as { price?: number; available?: boolean };

      const itemLocation = await prisma.menuItemLocation.upsert({
        where: {
          menuItemId_locationId: { menuItemId, locationId },
        },
        update: {
          ...(price !== undefined && { price }),
          ...(available !== undefined && { available }),
        },
        create: {
          menuItemId,
          locationId,
          price,
          available: available ?? true,
        },
      });

      return { success: true, itemLocation };
    }
  );

  // Get location statistics
  server.get(
    '/locations/:id/stats',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { period } = request.query as { period?: string };

      const startDate = new Date();
      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 1); // Today
      }

      const [orderStats, revenueStats, tableCount, staffCount] = await Promise.all([
        prisma.order.aggregate({
          where: { locationId: id, createdAt: { gte: startDate } },
          _count: true,
          _avg: { total: true },
        }),
        prisma.order.aggregate({
          where: {
            locationId: id,
            createdAt: { gte: startDate },
            paymentStatus: 'PAID',
          },
          _sum: { total: true, tip: true },
        }),
        prisma.table.count({ where: { locationId: id, active: true } }),
        prisma.user.count({ where: { locationId: id, active: true } }),
      ]);

      return {
        orders: {
          total: orderStats._count,
          averageValue: orderStats._avg.total,
        },
        revenue: {
          total: revenueStats._sum.total,
          tips: revenueStats._sum.tip,
        },
        tables: tableCount,
        staff: staffCount,
      };
    }
  );

  // Copy menu from one location to another
  server.post(
    '/locations/:fromId/copy-menu/:toId',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fromId, toId } = request.params as { fromId: string; toId: string };
      const { priceAdjustment } = request.body as { priceAdjustment?: number }; // Percentage adjustment

      // Get source location menu settings
      const sourceSettings = await prisma.menuItemLocation.findMany({
        where: { locationId: fromId },
      });

      // Copy to target location
      const created = [];
      for (const setting of sourceSettings) {
        let newPrice: any = setting.price;
        if (priceAdjustment && setting.price) {
          newPrice =
            Math.round(Number(setting.price) * (1 + priceAdjustment / 100) * 100) / 100;
        }

        const copied = await prisma.menuItemLocation.upsert({
          where: {
            menuItemId_locationId: { menuItemId: setting.menuItemId, locationId: toId },
          },
          update: {
            price: newPrice,
            available: setting.available,
          },
          create: {
            menuItemId: setting.menuItemId,
            locationId: toId,
            price: newPrice,
            available: setting.available,
          },
        });
        created.push(copied);
      }

      return { success: true, copiedCount: created.length };
    }
  );
}

