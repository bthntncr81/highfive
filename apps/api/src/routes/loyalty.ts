// Loyalty Program Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAuth, verifyAdmin } from '../middleware/auth';

export default async function loyaltyRoutes(server: FastifyInstance) {
  // ==================== TIERS ====================

  // Get all loyalty tiers
  server.get('/tiers', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const tiers = await request.db.loyaltyTier.findMany({
      where: { isActive: true },
      orderBy: { minPoints: 'asc' },
      include: {
        _count: { select: { customers: true } },
      },
    });

    return {
      tiers: tiers.map((t) => ({
        ...t,
        customerCount: t._count.customers,
        benefits: t.benefits || [],
      })),
    };
  });

  // Create tier
  server.post('/tiers', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, minPoints, pointsMultiplier, discountPercent, benefits, color, icon } = request.body as {
      name: string;
      minPoints: number;
      pointsMultiplier?: number;
      discountPercent?: number;
      benefits?: string[];
      color?: string;
      icon?: string;
    };

    if (!name || minPoints === undefined) {
      return reply.status(400).send({ error: 'Ad ve minimum puan gerekli' });
    }

    const tier = await request.db.loyaltyTier.create({
      data: {
        name,
        minPoints,
        pointsMultiplier: pointsMultiplier || 1,
        discountPercent: discountPercent || 0,
        benefits: benefits || [],
        color,
        icon,
      },
    });

    return { tier };
  });

  // Update tier
  server.put('/tiers/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    const tier = await request.db.loyaltyTier.update({
      where: { id },
      data,
    });

    return { tier };
  });

  // ==================== CUSTOMERS ====================

  // Get all customers
  server.get('/customers', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { search, tierId } = request.query as { search?: string; tierId?: string };

    const where: any = {};
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tierId) {
      where.loyaltyTierId = tierId;
    }

    const customers = await request.db.customer.findMany({
      where,
      include: { loyaltyTier: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { customers };
  });

  // Get single customer
  server.get('/customers/:id', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const customer = await request.db.customer.findUnique({
      where: { id },
      include: {
        loyaltyTier: true,
        pointsHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
        orders: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!customer) {
      return reply.status(404).send({ error: 'Müşteri bulunamadı' });
    }

    return { customer };
  });

  // Customer lookup by phone (public - for order flow)
  server.get('/customers/phone/:phone', async (request: FastifyRequest) => {
    const { phone } = request.params as { phone: string };

    const customer = await request.db.customer.findFirst({
      where: { phone },
      include: { loyaltyTier: true },
    });

    if (!customer) {
      return { customer: null };
    }

    return {
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        totalPoints: customer.totalPoints,
        loyaltyTier: customer.loyaltyTier,
      },
    };
  });

  // Register customer (public)
  server.post('/customers/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { phone, name, email, birthDate, smsConsent, emailConsent } = request.body as {
      phone: string;
      name?: string;
      email?: string;
      birthDate?: string;
      smsConsent?: boolean;
      emailConsent?: boolean;
    };

    if (!phone) {
      return reply.status(400).send({ error: 'Telefon numarası gerekli' });
    }

    // Check if already exists
    const existing = await request.db.customer.findFirst({ where: { phone } });
    if (existing) {
      return reply.status(400).send({ error: 'Bu telefon numarası zaten kayıtlı' });
    }

    // Get bronze tier (lowest)
    const bronzeTier = await request.db.loyaltyTier.findFirst({
      where: { isActive: true },
      orderBy: { minPoints: 'asc' },
    });

    const customer = await request.db.customer.create({
      data: {
        phone,
        name,
        email,
        birthDate: birthDate ? new Date(birthDate) : null,
        smsConsent: smsConsent || false,
        emailConsent: emailConsent || false,
        loyaltyTierId: bronzeTier?.id,
      },
      include: { loyaltyTier: true },
    });

    // Give welcome bonus points
    if (customer) {
      await request.db.pointsTransaction.create({
        data: {
          customerId: customer.id,
          points: 50,
          type: 'BONUS',
          description: 'Hoş geldin bonusu 🎉',
        },
      });

      await request.db.customer.update({
        where: { id: customer.id },
        data: { totalPoints: 50, lifetimePoints: 50 },
      });
    }

    return { customer, message: '50 hoş geldin puanı hesabınıza tanımlandı!' };
  });

  // Add points to customer
  server.post('/customers/:id/points', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { points, type, description, orderId } = request.body as {
      points: number;
      type: 'EARN' | 'SPEND' | 'BONUS' | 'ADJUSTMENT';
      description?: string;
      orderId?: string;
    };

    const customer = await request.db.customer.findUnique({ where: { id } });
    if (!customer) {
      return reply.status(404).send({ error: 'Müşteri bulunamadı' });
    }

    // Create transaction
    await request.db.pointsTransaction.create({
      data: {
        customerId: id,
        points,
        type,
        description,
        orderId,
      },
    });

    // Update customer points
    const newTotalPoints = customer.totalPoints + points;
    const newLifetimePoints = type === 'EARN' || type === 'BONUS'
      ? customer.lifetimePoints + points
      : customer.lifetimePoints;

    // Check for tier upgrade
    const newTier = await request.db.loyaltyTier.findFirst({
      where: {
        isActive: true,
        minPoints: { lte: newLifetimePoints },
      },
      orderBy: { minPoints: 'desc' },
    });

    await request.db.customer.update({
      where: { id },
      data: {
        totalPoints: Math.max(0, newTotalPoints),
        lifetimePoints: newLifetimePoints,
        loyaltyTierId: newTier?.id,
      },
    });

    return {
      success: true,
      newTotalPoints: Math.max(0, newTotalPoints),
      tierUpgrade: newTier?.id !== customer.loyaltyTierId ? newTier : null,
    };
  });

  // ==================== CALCULATE POINTS ====================

  // Calculate points for order amount
  server.post('/calculate-points', async (request: FastifyRequest) => {
    const { amount, customerId } = request.body as { amount: number; customerId?: string };

    let multiplier = 1;
    if (customerId) {
      const customer = await request.db.customer.findUnique({
        where: { id: customerId },
        include: { loyaltyTier: true },
      });
      if (customer?.loyaltyTier?.pointsMultiplier) {
        multiplier = Number(customer.loyaltyTier.pointsMultiplier);
      }
    }

    // Base: 1 point per 10₺
    const basePoints = Math.floor(amount / 10);
    const finalPoints = Math.floor(basePoints * multiplier);

    return {
      basePoints,
      multiplier,
      finalPoints,
    };
  });

  // Redeem points
  server.post('/redeem-points', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId, points } = request.body as { customerId: string; points: number };

    const customer = await request.db.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return reply.status(404).send({ error: 'Müşteri bulunamadı' });
    }

    if (customer.totalPoints < points) {
      return reply.status(400).send({ error: 'Yetersiz puan' });
    }

    // 100 points = 10₺
    const discountAmount = (points / 100) * 10;

    return {
      pointsToRedeem: points,
      discountAmount,
      remainingPoints: customer.totalPoints - points,
    };
  });
}

