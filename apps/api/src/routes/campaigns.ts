// Campaigns, Bundles, Coupons Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAuth, verifyAdmin } from '../middleware/auth';

export default async function campaignsRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== CAMPAIGNS ====================

  // Get all campaigns
  server.get('/campaigns', { preHandler: verifyAuth }, async () => {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { campaigns };
  });

  // Get active campaigns (public)
  server.get('/campaigns/active', async () => {
    const now = new Date();
    const campaigns = await prisma.campaign.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    return { campaigns };
  });

  // Create campaign
  server.post('/campaigns', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as any;

    if (!data.name || !data.startDate || !data.endDate) {
      return reply.status(400).send({ error: 'Ad ve tarih alanları gerekli' });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type || 'DISCOUNT',
        minPurchase: data.minPurchase,
        minItems: data.minItems,
        loyaltyTierIds: data.loyaltyTierIds || [],
        applicableItems: data.applicableItems || [],
        excludedItems: data.excludedItems || [],
        discountType: data.discountType,
        discountValue: data.discountValue,
        freeItemId: data.freeItemId,
        maxDiscount: data.maxDiscount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        daysOfWeek: data.daysOfWeek || [],
        startTime: data.startTime,
        endTime: data.endTime,
        usageLimit: data.usageLimit,
        usagePerCustomer: data.usagePerCustomer,
        autoApply: data.autoApply || false,
        stackable: data.stackable || false,
      },
    });

    return { campaign };
  });

  // Update campaign
  server.put('/campaigns/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    return { campaign };
  });

  // Delete campaign
  server.delete('/campaigns/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    await prisma.campaign.delete({ where: { id } });
    return { success: true };
  });

  // ==================== BUNDLES ====================

  // Get all bundles
  server.get('/bundles', async () => {
    const bundles = await prisma.bundleDeal.findMany({
      include: {
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { bundles };
  });

  // Get active bundles (public)
  server.get('/bundles/active', async () => {
    const now = new Date();
    const bundles = await prisma.bundleDeal.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { bundles };
  });

  // Create bundle
  server.post('/bundles', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as any;

    if (!data.name || !data.bundlePrice || !data.items?.length) {
      return reply.status(400).send({ error: 'Ad, fiyat ve ürünler gerekli' });
    }

    const bundle = await prisma.bundleDeal.create({
      data: {
        name: data.name,
        description: data.description,
        image: data.image,
        originalPrice: data.originalPrice,
        bundlePrice: data.bundlePrice,
        savings: data.savings || (data.originalPrice - data.bundlePrice),
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        daysOfWeek: data.daysOfWeek || [],
        startTime: data.startTime,
        endTime: data.endTime,
        featured: data.featured || false,
        items: {
          create: data.items.map((item: any, index: number) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity || 1,
            isOptional: item.isOptional || false,
            optionGroup: item.optionGroup,
          })),
        },
      },
      include: {
        items: { include: { menuItem: true } },
      },
    });

    return { bundle };
  });

  // Update bundle
  server.put('/bundles/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    // If items are being updated, delete old and create new
    if (data.items) {
      await prisma.bundleItem.deleteMany({ where: { bundleId: id } });
    }

    const bundle = await prisma.bundleDeal.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        image: data.image,
        originalPrice: data.originalPrice,
        bundlePrice: data.bundlePrice,
        savings: data.savings,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        daysOfWeek: data.daysOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isActive: data.isActive,
        featured: data.featured,
        items: data.items
          ? {
              create: data.items.map((item: any) => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity || 1,
                isOptional: item.isOptional || false,
                optionGroup: item.optionGroup,
              })),
            }
          : undefined,
      },
      include: {
        items: { include: { menuItem: true } },
      },
    });

    return { bundle };
  });

  // Delete bundle
  server.delete('/bundles/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    await prisma.bundleDeal.delete({ where: { id } });
    return { success: true };
  });

  // ==================== COUPONS ====================

  // Get all coupons
  server.get('/coupons', { preHandler: verifyAuth }, async () => {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { coupons };
  });

  // Validate coupon (public)
  server.post('/coupons/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code, customerId, orderTotal } = request.body as {
      code: string;
      customerId?: string;
      orderTotal: number;
    };

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return reply.status(404).send({ error: 'Kupon bulunamadı', valid: false });
    }

    const now = new Date();
    if (!coupon.isActive) {
      return reply.status(400).send({ error: 'Kupon aktif değil', valid: false });
    }
    if (now < coupon.startDate) {
      return reply.status(400).send({ error: 'Kupon henüz başlamadı', valid: false });
    }
    if (now > coupon.endDate) {
      return reply.status(400).send({ error: 'Kupon süresi dolmuş', valid: false });
    }
    if (coupon.usageLimit && coupon.currentUsage >= coupon.usageLimit) {
      return reply.status(400).send({ error: 'Kupon kullanım limiti dolmuş', valid: false });
    }
    if (coupon.minPurchase && orderTotal < Number(coupon.minPurchase)) {
      return reply.status(400).send({ 
        error: `Min. sepet tutarı ₺${coupon.minPurchase}`, 
        valid: false 
      });
    }

    // Check customer usage
    if (customerId) {
      const customerUsage = await prisma.couponUsage.count({
        where: { couponId: coupon.id, customerId },
      });
      if (customerUsage >= coupon.usagePerCustomer) {
        return reply.status(400).send({ error: 'Bu kuponu daha önce kullandınız', valid: false });
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'PERCENT') {
      discount = orderTotal * (Number(coupon.discountValue) / 100);
    } else {
      discount = Number(coupon.discountValue);
    }

    if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
      discount = Number(coupon.maxDiscount);
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
      },
      discount: Math.min(discount, orderTotal),
    };
  });

  // Create coupon
  server.post('/coupons', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as any;

    if (!data.code || !data.name || !data.discountType || data.discountValue === undefined) {
      return reply.status(400).send({ error: 'Kod, ad ve indirim bilgisi gerekli' });
    }

    // Check if code exists
    const existing = await prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) {
      return reply.status(400).send({ error: 'Bu kupon kodu zaten mevcut' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxDiscount: data.maxDiscount,
        minPurchase: data.minPurchase,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        usageLimit: data.usageLimit,
        usagePerCustomer: data.usagePerCustomer || 1,
        loyaltyTierIds: data.loyaltyTierIds || [],
        isFirstOrder: data.isFirstOrder || false,
      },
    });

    return { coupon };
  });

  // Update coupon
  server.put('/coupons/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        code: data.code?.toUpperCase(),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    return { coupon };
  });

  // Delete coupon
  server.delete('/coupons/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    await prisma.coupon.delete({ where: { id } });
    return { success: true };
  });

  // Use coupon (internal - called after order)
  server.post('/coupons/:id/use', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const { customerId, orderId, discount } = request.body as {
      customerId?: string;
      orderId: string;
      discount: number;
    };

    await prisma.couponUsage.create({
      data: {
        couponId: id,
        customerId,
        orderId,
        discount,
      },
    });

    await prisma.coupon.update({
      where: { id },
      data: { currentUsage: { increment: 1 } },
    });

    return { success: true };
  });
}

