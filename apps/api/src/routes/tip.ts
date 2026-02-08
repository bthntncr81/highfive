// Tipping & Service Charge Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, PaymentMethod } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';
import { broadcastOrderUpdate } from '../websocket';

export default async function tipRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Predefined tip percentages
  const TIP_PERCENTAGES = [10, 15, 20, 25];

  // Get tip suggestions for an order
  server.get('/orders/:id/tip-suggestions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const order = await prisma.order.findUnique({
      where: { id },
      select: { subtotal: true, total: true },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    const baseAmount = Number(order.subtotal);

    const suggestions = TIP_PERCENTAGES.map((percent) => ({
      percent,
      amount: Math.round(baseAmount * (percent / 100) * 100) / 100,
    }));

    return {
      baseAmount,
      suggestions,
      customAllowed: true,
    };
  });

  // Add tip to order
  server.post('/orders/:id/tip', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { amount, percent } = request.body as { amount?: number; percent?: number };

    const order = await prisma.order.findUnique({
      where: { id },
      select: { subtotal: true, total: true, tip: true },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    }

    let tipAmount = 0;

    if (amount !== undefined) {
      tipAmount = amount;
    } else if (percent !== undefined) {
      tipAmount = Math.round(Number(order.subtotal) * (percent / 100) * 100) / 100;
    } else {
      return reply.status(400).send({ error: 'Bahşiş miktarı veya yüzdesi gerekli' });
    }

    if (tipAmount < 0) {
      return reply.status(400).send({ error: 'Bahşiş negatif olamaz' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { tip: tipAmount },
      include: { items: { include: { menuItem: true } }, table: true },
    });

    broadcastOrderUpdate(updatedOrder);

    return {
      success: true,
      tip: tipAmount,
      newTotal: Number(updatedOrder.total) + tipAmount,
    };
  });

  // Add tip during payment
  server.post(
    '/payments/with-tip',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { orderId, amount, tipAmount, method } = request.body as {
        orderId: string;
        amount: number;
        tipAmount: number;
        method: PaymentMethod;
      };

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Sipariş bulunamadı' });
      }

      // Create payment with tip
      const payment = await prisma.payment.create({
        data: {
          orderId,
          amount,
          tipAmount,
          method,
        },
      });

      // Update order tip total
      const currentTip = Number(order.tip) || 0;
      await prisma.order.update({
        where: { id: orderId },
        data: { tip: currentTip + tipAmount },
      });

      return { success: true, payment };
    }
  );

  // Get service charge settings
  server.get('/settings/service-charge', async (request: FastifyRequest, reply: FastifyReply) => {
    const { locationId } = request.query as { locationId?: string };

    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { serviceCharge: true, serviceChargeType: true },
      });

      if (location) {
        return {
          serviceCharge: location.serviceCharge,
          serviceChargeType: location.serviceChargeType,
        };
      }
    }

    // Return default from settings
    const settings = await prisma.settings.findUnique({
      where: { key: 'serviceCharge' },
    });

    return settings?.value || { rate: 0, type: 'PERCENTAGE', enabled: false };
  });

  // Update service charge settings
  server.put(
    '/settings/service-charge',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { rate, type, enabled, locationId } = request.body as {
        rate: number;
        type: 'PERCENTAGE' | 'FIXED';
        enabled: boolean;
        locationId?: string;
      };

      if (locationId) {
        await prisma.location.update({
          where: { id: locationId },
          data: {
            serviceCharge: rate,
            serviceChargeType: type,
          },
        });
      } else {
        await prisma.settings.upsert({
          where: { key: 'serviceCharge' },
          update: { value: { rate, type, enabled } },
          create: { key: 'serviceCharge', value: { rate, type, enabled } },
        });
      }

      return { success: true };
    }
  );

  // Calculate order with service charge
  server.post('/orders/calculate-service-charge', async (request: FastifyRequest, reply: FastifyReply) => {
    const { subtotal, locationId, orderType } = request.body as {
      subtotal: number;
      locationId?: string;
      orderType?: string;
    };

    let serviceChargeRate = 0;
    let serviceChargeType = 'PERCENTAGE';

    // Get service charge from location or settings
    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { serviceCharge: true, serviceChargeType: true },
      });
      if (location) {
        serviceChargeRate = Number(location.serviceCharge);
        serviceChargeType = location.serviceChargeType;
      }
    } else {
      const settings = await prisma.settings.findUnique({
        where: { key: 'serviceCharge' },
      });
      if (settings?.value) {
        const sc = settings.value as any;
        if (sc.enabled) {
          serviceChargeRate = sc.rate;
          serviceChargeType = sc.type;
        }
      }
    }

    // Don't apply service charge for takeaway
    if (orderType === 'TAKEAWAY' || orderType === 'DELIVERY') {
      serviceChargeRate = 0;
    }

    let serviceChargeAmount = 0;
    if (serviceChargeType === 'PERCENTAGE') {
      serviceChargeAmount = Math.round(subtotal * (serviceChargeRate / 100) * 100) / 100;
    } else {
      serviceChargeAmount = serviceChargeRate;
    }

    return {
      subtotal,
      serviceCharge: serviceChargeAmount,
      serviceChargeRate,
      serviceChargeType,
      total: subtotal + serviceChargeAmount,
    };
  });

  // Get tip statistics
  server.get(
    '/reports/tips',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { startDate, endDate, locationId } = request.query as {
        startDate?: string;
        endDate?: string;
        locationId?: string;
      };

      const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
      const end = endDate ? new Date(endDate) : new Date();

      const orderTips = await prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          tip: { gt: 0 },
          ...(locationId ? { locationId } : {}),
        },
        _sum: { tip: true },
        _count: { tip: true },
        _avg: { tip: true },
      });

      // Daily breakdown
      const dailyTips = await prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          SUM(tip) as total_tip,
          COUNT(*) as order_count,
          AVG(tip) as avg_tip
        FROM "Order"
        WHERE tip > 0 
          AND created_at >= ${start}
          AND created_at <= ${end}
          ${locationId ? prisma.$queryRaw`AND location_id = ${locationId}` : prisma.$queryRaw``}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      return {
        summary: {
          totalTips: Number(orderTips._sum.tip) || 0,
          orderCount: orderTips._count.tip || 0,
          averageTip: Number(orderTips._avg.tip) || 0,
        },
        dailyBreakdown: dailyTips,
      };
    }
  );
}

