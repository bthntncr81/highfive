import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Allergen } from '@prisma/client';
import { verifyAuth, verifyAdmin } from '../middleware/auth';

export default async function menuRoutes(server: FastifyInstance) {
  // Get all menu items (optionally filtered)
  server.get('/', async (request: FastifyRequest) => {
    const { category, available, search } = request.query as {
      category?: string;
      available?: string;
      search?: string;
    };

    const where: any = {};
    
    if (category) {
      where.categoryId = category;
    }
    
    if (available !== undefined) {
      where.available = available === 'true';
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Kategorileri ve menü öğelerini + aktif bundle'ları birlikte getir
    const now = new Date();
    const [categories, items, bundles] = await Promise.all([
      request.db.category.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      request.db.menuItem.findMany({
        where,
        include: {
          category: true,
          modifiers: true,
          ingredients: {
            include: { rawMaterial: true },
            orderBy: { rawMaterial: { name: 'asc' } },
          },
        },
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
        ],
      }),
      // Aktif paket menüler
      request.db.bundleDeal.findMany({
        where: {
          isActive: true,
          OR: [{ startDate: null }, { startDate: { lte: now } }],
          AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
        },
        include: {
          items: {
            include: { menuItem: true },
          },
          // Reusable opsiyon grupları (mobile bundle detayında seçim ekranı)
          optionGroupAssignments: {
            orderBy: { sortOrder: 'asc' },
            include: {
              optionGroup: {
                include: {
                  items: {
                    where: { menuItem: { available: true } },
                    orderBy: { sortOrder: 'asc' },
                    include: {
                      menuItem: {
                        select: { id: true, name: true, price: true, image: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return { categories, items, bundles };
  });

  // Get single menu item
  server.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const item = await request.db.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        modifiers: true,
        ingredients: {
          include: { rawMaterial: true },
          orderBy: { rawMaterial: { name: 'asc' } },
        },
      },
    });

    if (!item) {
      return reply.status(404).send({ error: 'Ürün bulunamadı' });
    }

    return { item };
  });

  // Create menu item (admin only)
  server.post('/', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      categoryId,
      name,
      description,
      price,
      image,
      badges,
      allergens,
      calories,
      prepTime,
      featured,
      modifiers,
    } = request.body as {
      categoryId: string;
      name: string;
      description?: string;
      price: number;
      image?: string;
      badges?: string[];
      allergens?: Allergen[];
      calories?: number;
      prepTime?: number;
      featured?: boolean;
      modifiers?: { name: string; price: number }[];
    };

    if (!categoryId || !name || price === undefined) {
      return reply.status(400).send({ error: 'Kategori, ad ve fiyat gerekli' });
    }

    const item = await request.db.menuItem.create({
      data: {
        categoryId,
        name,
        description,
        price,
        image,
        badges: badges || [],
        allergens: allergens || [],
        calories,
        prepTime,
        featured: featured || false,
        modifiers: modifiers
          ? {
              create: modifiers.map((m) => ({
                name: m.name,
                price: m.price,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        modifiers: true,
      },
    });

    return { item };
  });

  // Update menu item (admin only)
  server.put('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const {
      categoryId,
      name,
      description,
      price,
      image,
      badges,
      allergens,
      calories,
      prepTime,
      available,
      featured,
      discountPrice,
      discountUntil,
      sortOrder,
    } = request.body as {
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      image?: string;
      badges?: string[];
      allergens?: Allergen[];
      calories?: number;
      prepTime?: number;
      available?: boolean;
      featured?: boolean;
      discountPrice?: number;
      discountUntil?: string;
      sortOrder?: number;
    };

    const item = await request.db.menuItem.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: 'Ürün bulunamadı' });
    }

    const updatedItem = await request.db.menuItem.update({
      where: { id },
      data: {
        categoryId,
        name,
        description,
        price,
        image,
        badges,
        allergens,
        calories,
        prepTime,
        featured,
        discountPrice,
        discountUntil: discountUntil ? new Date(discountUntil) : undefined,
        available,
        sortOrder,
      },
      include: {
        category: true,
        modifiers: true,
      },
    });

    return { item: updatedItem };
  });

  // Toggle availability (quick toggle)
  server.patch('/:id/availability', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { available } = request.body as { available: boolean };

    const item = await request.db.menuItem.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: 'Ürün bulunamadı' });
    }

    const updatedItem = await request.db.menuItem.update({
      where: { id },
      data: { available },
    });

    return { item: updatedItem };
  });

  // Delete menu item (admin only)
  server.delete('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const item = await request.db.menuItem.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: 'Ürün bulunamadı' });
    }

    // Force delete - remove all related records including order references
    try {
      await request.db.$transaction(async (tx) => {
        // Save item name to order items before disconnecting
        await tx.orderItem.updateMany({
          where: { menuItemId: id },
          data: { menuItemName: item.name },
        });
        // Delete all related records
        await tx.menuItemIngredient.deleteMany({ where: { menuItemId: id } });
        await tx.modifier.deleteMany({ where: { menuItemId: id } });
        await tx.menuItemCrossSell.deleteMany({ where: { OR: [{ fromItemId: id }, { toItemId: id }] } });
        await tx.menuItemUpsell.deleteMany({ where: { OR: [{ fromItemId: id }, { toItemId: id }] } });
        await tx.menuItemLocation.deleteMany({ where: { menuItemId: id } });
        await tx.happyHourItem.deleteMany({ where: { menuItemId: id } });
        await tx.bundleItem.deleteMany({ where: { menuItemId: id } });
        // Now safely delete the menu item
        await tx.menuItem.delete({ where: { id } });
      });
      return { success: true };
    } catch (error: any) {
      console.error('Delete menu item error:', error);
      return reply.status(500).send({ error: 'Ürün silinirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata') });
    }
  });

  // Manage modifiers
  server.post('/:id/modifiers', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { name, price } = request.body as { name: string; price: number };

    if (!name) {
      return reply.status(400).send({ error: 'Seçenek adı gerekli' });
    }

    const modifier = await request.db.modifier.create({
      data: {
        menuItemId: id,
        name,
        price: price || 0,
      },
    });

    return { modifier };
  });

  server.delete('/:id/modifiers/:modifierId', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { modifierId } = request.params as { id: string; modifierId: string };

    await request.db.modifier.delete({
      where: { id: modifierId },
    });

    return { success: true };
  });
}

