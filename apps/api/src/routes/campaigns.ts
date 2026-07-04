// Campaigns, Bundles, Coupons Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAuth, verifyAdmin } from '../middleware/auth';
import { broadcastCampaignToMobile } from '../lib/auto-broadcast';
import { requireFeature } from '../lib/plan-limits';

export default async function campaignsRoutes(server: FastifyInstance) {
  // ==================== CAMPAIGNS ====================

  // Get all campaigns
  server.get('/campaigns', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const campaigns = await request.db.campaign.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { campaigns };
  });

  // Get active + upcoming campaigns (public)
  // - Mobil ve landing'de gösterilenler
  // - O gün aktif yoksa ileri tarihli kampanyalar da gözükür
  // - Bitmiş olanlar gizli
  server.get('/campaigns/active', async (request: FastifyRequest) => {
    const now = new Date();
    const campaigns = await request.db.campaign.findMany({
      where: {
        isActive: true,
        endDate: { gte: now }, // henüz bitmemiş olanlar
        // startDate filtresi YOK — gelecekteki başlayacak olanlar da gelir
      },
      orderBy: { startDate: 'asc' }, // yakın olanlar önce
    });
    return { campaigns };
  });

  // Create campaign (Pro+ paket özelliği — feature-flag)
  server.post('/campaigns', { preHandler: [verifyAdmin, requireFeature('campaigns')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as any;

    if (!data.name || !data.startDate || !data.endDate) {
      return reply.status(400).send({ error: 'Ad ve tarih alanları gerekli' });
    }

    const campaign = await request.db.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        image: data.image || null,
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

    // Otomatik mobil duyuru — admin POS'tan "notifyCustomers: true" gönderirse
    if (data.notifyCustomers === true) {
      broadcastCampaignToMobile(request.db, {
        campaignId: campaign.id,
        title: data.notifyTitle,
        body: data.notifyBody,
        imageUrl: data.notifyImageUrl,
      }).catch((err) => console.error('📱 Auto-broadcast error:', err));
    }

    return { campaign };
  });

  // Update campaign
  // Whitelist fields — formdan gelen `notifyCustomers` gibi Prisma'da olmayan
  // alanlar `...data` ile spread edilirse update patlıyor.
  server.put('/campaigns/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    const updateData: any = {};
    const allowed = [
      'name', 'description', 'image', 'type',
      'minPurchase', 'minItems', 'loyaltyTierIds', 'applicableItems', 'excludedItems',
      'discountType', 'discountValue', 'freeItemId', 'maxDiscount',
      'daysOfWeek', 'startTime', 'endTime',
      'usageLimit', 'usagePerCustomer',
      'isActive', 'autoApply', 'stackable',
    ];
    for (const k of allowed) {
      if (data[k] !== undefined) updateData[k] = data[k];
    }
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const campaign = await request.db.campaign.update({
      where: { id },
      data: updateData,
    });

    return { campaign };
  });

  // Delete campaign
  server.delete('/campaigns/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    await request.db.campaign.delete({ where: { id } });
    return { success: true };
  });

  // ==================== BUNDLES ====================

  // Reusable include shape — bundles always come back with their items + option groups
  const bundleInclude = {
    items: { include: { menuItem: true } },
    optionGroups: { orderBy: { sortOrder: 'asc' as const } },
    optionGroupAssignments: {
      orderBy: { sortOrder: 'asc' as const },
      include: {
        optionGroup: {
          include: {
            items: {
              orderBy: { sortOrder: 'asc' as const },
              include: {
                menuItem: { select: { id: true, name: true, price: true, image: true } },
              },
            },
          },
        },
      },
    },
  };

  // Get all bundles
  server.get('/bundles', async (request: FastifyRequest) => {
    const bundles = await request.db.bundleDeal.findMany({
      include: bundleInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return { bundles };
  });

  // Get active bundles (public)
  server.get('/bundles/active', async (request: FastifyRequest) => {
    const now = new Date();
    const bundles = await request.db.bundleDeal.findMany({
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
      include: bundleInclude,
      orderBy: { sortOrder: 'asc' },
    });
    return { bundles };
  });

  // Create bundle
  server.post('/bundles', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as any;

    // Need a name + price + (fixed items OR option groups). Pure-fixed bundles
    // and pure-customizable combos are both valid; an empty bundle is not.
    const hasFixedItems = Array.isArray(data.items) && data.items.length > 0;
    const hasLegacyGroups = Array.isArray(data.optionGroups) && data.optionGroups.length > 0;
    const hasReusableGroups =
      (Array.isArray(data.assignedOptionGroups) && data.assignedOptionGroups.length > 0) ||
      (Array.isArray(data.assignedOptionGroupIds) && data.assignedOptionGroupIds.length > 0);
    if (!data.name || data.bundlePrice == null || (!hasFixedItems && !hasLegacyGroups && !hasReusableGroups)) {
      return reply.status(400).send({
        error: 'Ad, fiyat ve en az bir sabit ürün ya da opsiyon grubu gerekli',
      });
    }

    const bundle = await request.db.bundleDeal.create({
      data: {
        name: data.name,
        description: data.description,
        image: data.image,
        categoryId: data.categoryId || null,
        originalPrice: data.originalPrice ?? 0,
        bundlePrice: data.bundlePrice,
        savings: data.savings ?? Math.max(0, (data.originalPrice ?? 0) - data.bundlePrice),
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        daysOfWeek: data.daysOfWeek || [],
        startTime: data.startTime,
        endTime: data.endTime,
        featured: data.featured || false,
        items: hasFixedItems
          ? {
              create: data.items.map((item: any) => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity || 1,
                isOptional: item.isOptional || false,
                optionGroup: item.optionGroup,
              })),
            }
          : undefined,
        optionGroups: hasLegacyGroups
          ? {
              create: data.optionGroups.map((g: any, i: number) => ({
                name: g.name,
                pickCount: Math.max(1, Number(g.pickCount) || 1),
                priceMode: g.priceMode === 'ADD_PRICE' ? 'ADD_PRICE' : 'INCLUDED',
                categoryId: g.categoryId || null,
                eligibleItemIds: Array.isArray(g.eligibleItemIds) ? g.eligibleItemIds : [],
                sortOrder: g.sortOrder ?? i,
              })),
            }
          : undefined,
        optionGroupAssignments: (() => {
          // Yeni format: assignedOptionGroups: [{ groupId, quantity }]
          if (Array.isArray(data.assignedOptionGroups) && data.assignedOptionGroups.length > 0) {
            return {
              create: data.assignedOptionGroups
                .filter((a: any) => a && a.groupId && (a.quantity ?? 1) > 0)
                .map((a: any, i: number) => ({
                  optionGroupId: a.groupId,
                  quantity: Math.max(1, Number(a.quantity) || 1),
                  sortOrder: i,
                })),
            };
          }
          // Eski format: assignedOptionGroupIds: string[]
          if (Array.isArray(data.assignedOptionGroupIds) && data.assignedOptionGroupIds.length > 0) {
            return {
              create: data.assignedOptionGroupIds.map((groupId: string, i: number) => ({
                optionGroupId: groupId,
                quantity: 1,
                sortOrder: i,
              })),
            };
          }
          return undefined;
        })(),
      },
      include: bundleInclude,
    });

    return { bundle };
  });

  // Update bundle
  server.put('/bundles/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;

    // If items are being updated, delete old and create new
    if (data.items) {
      await request.db.bundleItem.deleteMany({ where: { bundleId: id } });
    }
    if (data.optionGroups) {
      await request.db.bundleOptionGroup.deleteMany({ where: { bundleId: id } });
    }
    if (Array.isArray(data.assignedOptionGroupIds) || Array.isArray(data.assignedOptionGroups)) {
      await request.db.bundleOptionGroupAssignment.deleteMany({ where: { bundleId: id } });
    }

    const bundle = await request.db.bundleDeal.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        image: data.image,
        // categoryId açık olarak null gönderilmezse mevcut değer korunur;
        // undefined → no-op, null → "Paket Menüler" default'a dön
        categoryId: data.categoryId === undefined ? undefined : data.categoryId || null,
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
        optionGroups: Array.isArray(data.optionGroups)
          ? {
              create: data.optionGroups.map((g: any, i: number) => ({
                name: g.name,
                pickCount: Math.max(1, Number(g.pickCount) || 1),
                priceMode: g.priceMode === 'ADD_PRICE' ? 'ADD_PRICE' : 'INCLUDED',
                categoryId: g.categoryId || null,
                eligibleItemIds: Array.isArray(g.eligibleItemIds) ? g.eligibleItemIds : [],
                sortOrder: g.sortOrder ?? i,
              })),
            }
          : undefined,
        optionGroupAssignments: (() => {
          if (Array.isArray(data.assignedOptionGroups)) {
            return {
              create: data.assignedOptionGroups
                .filter((a: any) => a && a.groupId && (a.quantity ?? 1) > 0)
                .map((a: any, i: number) => ({
                  optionGroupId: a.groupId,
                  quantity: Math.max(1, Number(a.quantity) || 1),
                  sortOrder: i,
                })),
            };
          }
          if (Array.isArray(data.assignedOptionGroupIds)) {
            return {
              create: data.assignedOptionGroupIds.map((groupId: string, i: number) => ({
                optionGroupId: groupId,
                quantity: 1,
                sortOrder: i,
              })),
            };
          }
          return undefined;
        })(),
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
      include: bundleInclude,
    });

    return { bundle };
  });

  // Delete bundle
  server.delete('/bundles/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    await request.db.bundleDeal.delete({ where: { id } });
    return { success: true };
  });

  // ==================== COUPONS ====================

  // Get all coupons
  server.get('/coupons', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const coupons = await request.db.coupon.findMany({
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

    const coupon = await request.db.coupon.findFirst({
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
      const customerUsage = await request.db.couponUsage.count({
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
    const existing = await request.db.coupon.findFirst({ where: { code: data.code.toUpperCase() } });
    if (existing) {
      return reply.status(400).send({ error: 'Bu kupon kodu zaten mevcut' });
    }

    const coupon = await request.db.coupon.create({
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

    const coupon = await request.db.coupon.update({
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
    await request.db.coupon.delete({ where: { id } });
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

    await request.db.couponUsage.create({
      data: {
        couponId: id,
        customerId,
        orderId,
        discount,
      },
    });

    await request.db.coupon.update({
      where: { id },
      data: { currentUsage: { increment: 1 } },
    });

    return { success: true };
  });
}

