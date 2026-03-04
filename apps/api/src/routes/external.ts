import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, OrderStatus, OrderType } from '@prisma/client';
import { createHash } from 'crypto';
import { verifyApiKey, requirePermission } from '../middleware/api-key';
import { broadcastNewOrder } from '../websocket';

// Sipariş verildiğinde ham madde stoklarını düş (orders.ts'den kopyalanmış)
async function deductRawMaterialStock(
  prisma: PrismaClient,
  orderItems: { menuItemId: string; quantity: number }[],
) {
  try {
    for (const orderItem of orderItems) {
      const ingredients = await prisma.menuItemIngredient.findMany({
        where: { menuItemId: orderItem.menuItemId },
        include: { rawMaterial: true },
      });

      for (const ingredient of ingredients) {
        const deductAmount = Number(ingredient.amount) * orderItem.quantity;
        if (deductAmount <= 0) continue;

        const currentStock = Number(ingredient.rawMaterial.currentStock);
        const newStock = Math.max(0, currentStock - deductAmount);

        await prisma.rawMaterial.update({
          where: { id: ingredient.rawMaterialId },
          data: { currentStock: newStock },
        });

        console.log(
          `📦 [External] Stok düşüldü: ${ingredient.rawMaterial.name} -${deductAmount} (${currentStock} → ${newStock})`,
        );
      }
    }
  } catch (error) {
    console.error('❌ [External] Ham madde stok düşüm hatası:', error);
  }
}

export default async function externalRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== MENU ENDPOINTS ====================

  /**
   * GET /api/external/menu
   * Tüm menüyü çek (kategoriler + ürünler + modifierlar)
   * Permission: menu:read
   */
  server.get(
    '/menu',
    { preHandler: requirePermission('menu:read') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const partner = (request as any).partner;

      // Kategorileri getir
      const categories = await prisma.category.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          icon: true,
          image: true,
          sortOrder: true,
        },
      });

      // Menü öğelerini getir
      const whereMenuItem: any = { available: true };

      // Location filtresi (partner'ın erişebildiği lokasyon)
      const locationId = (request.query as any).locationId || partner.locationId;

      const menuItems = await prisma.menuItem.findMany({
        where: whereMenuItem,
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          categoryId: true,
          name: true,
          description: true,
          price: true,
          image: true,
          badges: true,
          allergens: true,
          calories: true,
          prepTime: true,
          available: true,
          discountPrice: true,
          discountUntil: true,
          stockQuantity: true,
          modifiers: {
            where: { available: true },
            select: {
              id: true,
              name: true,
              price: true,
              available: true,
            },
          },
          // Location-specific pricing
          locations: locationId
            ? {
                where: { locationId },
                select: {
                  available: true,
                  price: true,
                },
              }
            : undefined,
        },
      });

      // Filter out unavailable items at the location level
      const filteredItems = locationId
        ? menuItems.filter((item) => {
            const locOverride = item.locations?.[0];
            return locOverride ? locOverride.available : true;
          })
        : menuItems;

      // Format response
      const formattedItems = filteredItems.map((item) => {
        const locOverride = item.locations?.[0];
        return {
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          description: item.description,
          price: locOverride?.price ? Number(locOverride.price) : Number(item.price),
          image: item.image,
          badges: item.badges,
          allergens: item.allergens,
          calories: item.calories,
          prepTime: item.prepTime,
          available: item.available,
          discountPrice: item.discountPrice ? Number(item.discountPrice) : null,
          discountUntil: item.discountUntil?.toISOString() || null,
          stockQuantity: item.stockQuantity,
          modifiers: item.modifiers.map((mod) => ({
            id: mod.id,
            name: mod.name,
            price: Number(mod.price),
          })),
        };
      });

      return {
        categories,
        items: formattedItems,
        syncedAt: new Date().toISOString(),
        totalItems: formattedItems.length,
        totalCategories: categories.length,
      };
    },
  );

  /**
   * GET /api/external/menu/hash
   * Menü değişiklik kontrolü (hash)
   * Permission: menu:read
   */
  server.get(
    '/menu/hash',
    { preHandler: requirePermission('menu:read') },
    async (request: FastifyRequest) => {
      // Get latest menu update timestamps
      const latestItem = await prisma.menuItem.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });
      const latestCategory = await prisma.category.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });
      const latestModifier = await prisma.modifier.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      // Combine timestamps for hash
      const hashInput = [
        latestItem?.updatedAt?.toISOString() || '',
        latestCategory?.updatedAt?.toISOString() || '',
        latestModifier?.createdAt?.toISOString() || '',
      ].join('|');

      const hash = createHash('sha256').update(hashInput).digest('hex');

      return {
        hash,
        lastUpdated: latestItem?.updatedAt?.toISOString() || null,
      };
    },
  );

  // ==================== ORDER ENDPOINTS ====================

  /**
   * POST /api/external/orders
   * Dış sistemden sipariş oluştur
   * Permission: orders:write
   */
  server.post(
    '/orders',
    { preHandler: requirePermission('orders:write') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const partner = (request as any).partner;

      const {
        externalOrderId,
        type,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        notes,
        source,
        items,
        deliveryFee,
        locationId,
      } = request.body as {
        externalOrderId: string;
        type?: string;
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        customerAddress?: string;
        notes?: string;
        source?: string;
        items: {
          menuItemId: string;
          quantity: number;
          modifiers?: string[];
          notes?: string;
        }[];
        deliveryFee?: number;
        locationId?: string;
      };

      // Validations
      if (!externalOrderId) {
        return reply.status(400).send({ error: 'externalOrderId gerekli' });
      }

      if (!items || items.length === 0) {
        return reply.status(400).send({ error: 'En az bir ürün gerekli' });
      }

      // Check duplicate
      const existingOrder = await prisma.order.findFirst({
        where: { externalOrderId },
      });
      if (existingOrder) {
        return reply.status(409).send({
          error: 'Bu externalOrderId ile zaten bir siparis var',
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          status: existingOrder.status,
        });
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
        });

        if (!menuItem) {
          return reply.status(400).send({ error: `Ürün bulunamadı: ${item.menuItemId}` });
        }

        if (!menuItem.available) {
          return reply.status(400).send({
            error: `Ürün mevcut değil: ${menuItem.name} (${item.menuItemId})`,
          });
        }

        const itemTotal = Number(menuItem.price) * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
          total: itemTotal,
          notes: item.notes || null,
          modifiers: item.modifiers || [],
        });
      }

      // Get tax rate from settings
      const settings = await prisma.settings.findUnique({ where: { key: 'restaurant' } });
      const taxRate = (settings?.value as any)?.taxRate || 10;
      const tax = subtotal * (taxRate / 100);
      const deliveryAmount = deliveryFee || 0;
      const total = subtotal + tax + deliveryAmount;

      // Determine order type
      let orderType: OrderType;
      switch (type?.toUpperCase()) {
        case 'DELIVERY':
          orderType = OrderType.DELIVERY;
          break;
        case 'TAKEAWAY':
          orderType = OrderType.TAKEAWAY;
          break;
        case 'DINE_IN':
          orderType = OrderType.DINE_IN;
          break;
        default:
          orderType = OrderType.DELIVERY;
      }

      // Use partner's locationId or provided locationId
      const orderLocationId = locationId || partner.locationId || null;

      // Create order
      const order = await prisma.order.create({
        data: {
          locationId: orderLocationId,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          customerAddress: customerAddress || null,
          type: orderType,
          status: OrderStatus.PENDING,
          subtotal,
          tax,
          total,
          deliveryFee: deliveryAmount,
          notes: notes || null,
          source: source || 'WHATSAPP',
          externalOrderId,
          items: {
            create: orderItems,
          },
        },
        include: {
          table: true,
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      // Deduct raw material stock
      await deductRawMaterialStock(prisma, items);

      // Broadcast new order to POS and Kitchen
      broadcastNewOrder(order);

      console.log(
        `🔗 [External] Sipariş oluşturuldu: #${order.orderNumber} (${partner.name}, externalId: ${externalOrderId})`,
      );

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
      };
    },
  );

  /**
   * GET /api/external/orders/:externalOrderId
   * Sipariş durumu sorgula (externalOrderId ile)
   * Permission: orders:read
   */
  server.get(
    '/orders/:externalOrderId',
    { preHandler: requirePermission('orders:read') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { externalOrderId } = request.params as { externalOrderId: string };

      const order = await prisma.order.findFirst({
        where: { externalOrderId },
        include: {
          items: {
            include: {
              menuItem: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Siparis bulunamadi' });
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        externalOrderId: order.externalOrderId,
        status: order.status,
        type: order.type,
        customerName: order.customerName,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        completedAt: order.completedAt?.toISOString() || null,
        items: order.items.map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
          status: item.status,
          modifiers: item.modifiers,
          notes: item.notes,
        })),
      };
    },
  );

  /**
   * POST /api/external/webhook/test
   * Webhook URL'ini test et
   * Permission: orders:read
   */
  server.post(
    '/webhook/test',
    { preHandler: verifyApiKey },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const partner = (request as any).partner;

      if (!partner.webhookUrl) {
        return reply.status(400).send({ error: 'Webhook URL tanimlanmamis' });
      }

      try {
        const response = await fetch(partner.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'ping',
          },
          body: JSON.stringify({
            event: 'ping',
            timestamp: new Date().toISOString(),
            partner: { id: partner.id, name: partner.name },
          }),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        return {
          success: response.ok,
          statusCode: response.status,
          message: response.ok ? 'Webhook URL basariyla test edildi' : 'Webhook URL yanit vermedi',
        };
      } catch (error: any) {
        return reply.status(502).send({
          success: false,
          error: `Webhook URL'e ulasilamadi: ${error.message}`,
        });
      }
    },
  );

  // ==================== PARTNER MANAGEMENT (Admin) ====================

  /**
   * POST /api/external/partners
   * Yeni integration partner oluştur (admin only - JWT auth)
   */
  server.post(
    '/partners',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Simple admin check via a special admin key
      const adminKey = request.headers['x-admin-key'] as string;
      if (adminKey !== (process.env.EXTERNAL_ADMIN_KEY || 'highfive-admin-key')) {
        return reply.status(401).send({ error: 'Admin key gerekli' });
      }

      const { name, webhookUrl, webhookSecret, permissions, locationId } = request.body as {
        name: string;
        webhookUrl?: string;
        webhookSecret?: string;
        permissions?: string[];
        locationId?: string;
      };

      if (!name) {
        return reply.status(400).send({ error: 'Partner adi gerekli' });
      }

      // Generate API key
      const crypto = await import('crypto');
      const apiKey = crypto.randomBytes(32).toString('hex');
      const secret = webhookSecret || crypto.randomBytes(16).toString('hex');

      const partner = await prisma.integrationPartner.create({
        data: {
          name,
          apiKey,
          webhookUrl: webhookUrl || null,
          webhookSecret: secret,
          permissions: permissions || ['menu:read', 'orders:write', 'orders:read'],
          locationId: locationId || null,
        },
      });

      console.log(`🔗 [External] Yeni partner oluşturuldu: ${partner.name} (${partner.id})`);

      return {
        id: partner.id,
        name: partner.name,
        apiKey: partner.apiKey,
        webhookSecret: partner.webhookSecret,
        permissions: partner.permissions,
        locationId: partner.locationId,
        message: 'API key ve webhook secret guvenli bir yerde saklayin!',
      };
    },
  );
}
