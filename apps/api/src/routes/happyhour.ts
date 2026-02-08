// Happy Hours & Scheduled Promotions Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';

export default async function happyHourRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Check if happy hour is active now
  const isHappyHourActive = (happyHour: any): boolean => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    // Check day of week
    if (!happyHour.daysOfWeek.includes(currentDay)) return false;

    // Check date range if set
    if (happyHour.startDate && now < happyHour.startDate) return false;
    if (happyHour.endDate && now > happyHour.endDate) return false;

    // Check time range
    if (currentTime < happyHour.startTime || currentTime > happyHour.endTime) return false;

    return happyHour.active;
  };

  // Get current active happy hours
  server.get('/happyhours/active', async (request: FastifyRequest, reply: FastifyReply) => {
    const { locationId } = request.query as { locationId?: string };

    const happyHours = await prisma.happyHour.findMany({
      where: {
        active: true,
        ...(locationId ? { locationId } : {}),
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: { category: true },
            },
          },
        },
      },
    });

    const activeHappyHours = happyHours.filter(isHappyHourActive);

    return {
      active: activeHappyHours.map((hh) => ({
        id: hh.id,
        name: hh.name,
        description: hh.description,
        endTime: hh.endTime,
        discountPercent: hh.discountPercent,
        items: hh.items.map((item) => ({
          menuItem: item.menuItem,
          specialPrice: item.specialPrice,
          discountPercent: item.discountPercent,
        })),
      })),
    };
  });

  // Get all happy hours
  server.get(
    '/happyhours',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const happyHours = await prisma.happyHour.findMany({
        include: {
          items: {
            include: { menuItem: true },
          },
          location: true,
          campaign: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        happyHours: happyHours.map((hh) => ({
          ...hh,
          isActive: isHappyHourActive(hh),
        })),
      };
    }
  );

  // Create happy hour
  server.post(
    '/happyhours',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        name,
        description,
        startTime,
        endTime,
        daysOfWeek,
        discountType,
        discountPercent,
        discountAmount,
        campaignId,
        locationId,
        startDate,
        endDate,
        items,
      } = request.body as {
        name: string;
        description?: string;
        startTime: string;
        endTime: string;
        daysOfWeek: number[];
        discountType?: string;
        discountPercent?: number;
        discountAmount?: number;
        campaignId?: string;
        locationId?: string;
        startDate?: string;
        endDate?: string;
        items?: { menuItemId: string; specialPrice?: number; discountPercent?: number }[];
      };

      if (!name || !startTime || !endTime || !daysOfWeek) {
        return reply.status(400).send({ error: 'Zorunlu alanlar eksik' });
      }

      const happyHour = await prisma.happyHour.create({
        data: {
          name,
          description,
          startTime,
          endTime,
          daysOfWeek,
          discountType: discountType || 'PERCENT',
          discountPercent,
          discountAmount,
          campaignId: campaignId || null,
          locationId,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          items: items
            ? {
                create: items.map((item) => ({
                  menuItemId: item.menuItemId,
                  specialPrice: item.specialPrice,
                  discountPercent: item.discountPercent,
                })),
              }
            : undefined,
        },
        include: {
          items: { include: { menuItem: true } },
          campaign: true,
        },
      });

      return { success: true, happyHour };
    }
  );

  // Update happy hour
  server.put(
    '/happyhours/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const {
        name,
        description,
        startTime,
        endTime,
        daysOfWeek,
        discountType,
        discountPercent,
        discountAmount,
        campaignId,
        active,
        startDate,
        endDate,
      } = request.body as {
        name?: string;
        description?: string;
        startTime?: string;
        endTime?: string;
        daysOfWeek?: number[];
        discountType?: string;
        discountPercent?: number;
        discountAmount?: number;
        campaignId?: string;
        active?: boolean;
        startDate?: string;
        endDate?: string;
      };

      const happyHour = await prisma.happyHour.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(startTime && { startTime }),
          ...(endTime && { endTime }),
          ...(daysOfWeek && { daysOfWeek }),
          ...(discountType !== undefined && { discountType }),
          ...(discountPercent !== undefined && { discountPercent }),
          ...(discountAmount !== undefined && { discountAmount }),
          ...(campaignId !== undefined && { campaignId: campaignId || null }),
          ...(active !== undefined && { active }),
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        },
        include: {
          items: { include: { menuItem: true } },
          campaign: true,
        },
      });

      return { success: true, happyHour };
    }
  );

  // Delete happy hour
  server.delete(
    '/happyhours/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      await prisma.happyHour.delete({ where: { id } });

      return { success: true };
    }
  );

  // Add item to happy hour
  server.post(
    '/happyhours/:id/items',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { menuItemId, specialPrice, discountPercent } = request.body as {
        menuItemId: string;
        specialPrice?: number;
        discountPercent?: number;
      };

      const item = await prisma.happyHourItem.upsert({
        where: {
          happyHourId_menuItemId: { happyHourId: id, menuItemId },
        },
        update: { specialPrice, discountPercent },
        create: {
          happyHourId: id,
          menuItemId,
          specialPrice,
          discountPercent,
        },
        include: { menuItem: true },
      });

      return { success: true, item };
    }
  );

  // Remove item from happy hour
  server.delete(
    '/happyhours/:happyHourId/items/:menuItemId',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { happyHourId, menuItemId } = request.params as {
        happyHourId: string;
        menuItemId: string;
      };

      await prisma.happyHourItem.delete({
        where: {
          happyHourId_menuItemId: { happyHourId, menuItemId },
        },
      });

      return { success: true };
    }
  );

  // Calculate price with happy hour discount
  server.post('/happyhours/calculate-price', async (request: FastifyRequest, reply: FastifyReply) => {
    const { menuItemId, locationId } = request.body as {
      menuItemId: string;
      locationId?: string;
    };

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      return reply.status(404).send({ error: 'Ürün bulunamadı' });
    }

    const originalPrice = Number(menuItem.price);

    // Check for active happy hours
    const happyHours = await prisma.happyHour.findMany({
      where: {
        active: true,
        ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}),
      },
      include: {
        items: {
          where: { menuItemId },
        },
      },
    });

    let finalPrice = originalPrice;
    let appliedHappyHour = null;

    for (const hh of happyHours) {
      if (!isHappyHourActive(hh)) continue;

      // Check if item has specific pricing
      const hhItem = hh.items[0];
      if (hhItem) {
        if (hhItem.specialPrice) {
          finalPrice = Number(hhItem.specialPrice);
        } else if (hhItem.discountPercent) {
          finalPrice = originalPrice * (1 - Number(hhItem.discountPercent) / 100);
        }
        appliedHappyHour = hh.name;
        break;
      }

      // Apply general discount
      if (hh.discountPercent) {
        finalPrice = originalPrice * (1 - Number(hh.discountPercent) / 100);
        appliedHappyHour = hh.name;
        break;
      }
    }

    return {
      originalPrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      discount: originalPrice - finalPrice,
      appliedHappyHour,
    };
  });
}

