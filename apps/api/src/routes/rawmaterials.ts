import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, RawMaterialUnit } from '@prisma/client';
import { verifyAuth, verifyAdmin } from '../middleware/auth';

export default async function rawMaterialRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== HAM MADDE (RAW MATERIAL) CRUD ====================

  // List all raw materials
  server.get('/', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { search, active } = request.query as {
      search?: string;
      active?: string;
    };

    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    const materials = await prisma.rawMaterial.findMany({
      where,
      include: {
        ingredients: {
          include: {
            menuItem: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { materials };
  });

  // Get single raw material
  server.get('/:id', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const material = await prisma.rawMaterial.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true },
            },
          },
        },
      },
    });

    if (!material) {
      return reply.status(404).send({ error: 'Ham madde bulunamadı' });
    }

    return { material };
  });

  // Create raw material
  server.post('/', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, unit, currentStock, minStock, costPerUnit, supplier } = request.body as {
      name: string;
      unit?: RawMaterialUnit;
      currentStock?: number;
      minStock?: number;
      costPerUnit?: number;
      supplier?: string;
    };

    if (!name) {
      return reply.status(400).send({ error: 'Ham madde adı gerekli' });
    }

    // Check for duplicate name
    const existing = await prisma.rawMaterial.findUnique({ where: { name } });
    if (existing) {
      return reply.status(400).send({ error: 'Bu isimde bir ham madde zaten var' });
    }

    const material = await prisma.rawMaterial.create({
      data: {
        name,
        unit: unit || 'GRAM',
        currentStock: currentStock || 0,
        minStock: minStock || 0,
        costPerUnit: costPerUnit || 0,
        supplier,
      },
    });

    return { material };
  });

  // Update raw material
  server.put('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { name, unit, currentStock, minStock, costPerUnit, supplier, active } = request.body as {
      name?: string;
      unit?: RawMaterialUnit;
      currentStock?: number;
      minStock?: number;
      costPerUnit?: number;
      supplier?: string;
      active?: boolean;
    };

    const material = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) {
      return reply.status(404).send({ error: 'Ham madde bulunamadı' });
    }

    const updated = await prisma.rawMaterial.update({
      where: { id },
      data: {
        name,
        unit,
        currentStock,
        minStock,
        costPerUnit,
        supplier,
        active,
      },
    });

    return { material: updated };
  });

  // Update stock quantity (quick stock update)
  server.patch('/:id/stock', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { amount, operation } = request.body as {
      amount: number;
      operation: 'SET' | 'ADD' | 'SUBTRACT';
    };

    const material = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) {
      return reply.status(404).send({ error: 'Ham madde bulunamadı' });
    }

    let newStock: number;
    const currentStock = Number(material.currentStock);

    switch (operation) {
      case 'ADD':
        newStock = currentStock + amount;
        break;
      case 'SUBTRACT':
        newStock = Math.max(0, currentStock - amount);
        break;
      case 'SET':
      default:
        newStock = amount;
        break;
    }

    const updated = await prisma.rawMaterial.update({
      where: { id },
      data: { currentStock: newStock },
    });

    return { material: updated };
  });

  // Delete raw material
  server.delete('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const material = await prisma.rawMaterial.findUnique({
      where: { id },
      include: { ingredients: true },
    });

    if (!material) {
      return reply.status(404).send({ error: 'Ham madde bulunamadı' });
    }

    // If used in menu items, soft delete (deactivate)
    if (material.ingredients.length > 0) {
      await prisma.rawMaterial.update({
        where: { id },
        data: { active: false },
      });
    } else {
      await prisma.rawMaterial.delete({ where: { id } });
    }

    return { success: true };
  });

  // Get low stock materials
  server.get('/alerts/low-stock', { preHandler: verifyAuth }, async () => {
    const materials = await prisma.rawMaterial.findMany({
      where: {
        active: true,
        currentStock: {
          lte: prisma.rawMaterial.fields.minStock as any,
        },
      },
      orderBy: { currentStock: 'asc' },
    });

    // Manual filter since Prisma doesn't support comparing two columns directly
    const allActive = await prisma.rawMaterial.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    const lowStock = allActive.filter(
      (m) => Number(m.currentStock) <= Number(m.minStock) && Number(m.minStock) > 0
    );

    return { materials: lowStock };
  });

  // ==================== MENU ITEM INGREDIENTS ====================

  // Get ingredients for a menu item
  server.get('/menu-item/:menuItemId/ingredients', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { menuItemId } = request.params as { menuItemId: string };

    const ingredients = await prisma.menuItemIngredient.findMany({
      where: { menuItemId },
      include: {
        rawMaterial: true,
      },
      orderBy: { rawMaterial: { name: 'asc' } },
    });

    return { ingredients };
  });

  // Add ingredient to menu item
  server.post('/menu-item/:menuItemId/ingredients', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { menuItemId } = request.params as { menuItemId: string };
    const { rawMaterialId, amount, optional } = request.body as {
      rawMaterialId: string;
      amount: number;
      optional?: boolean;
    };

    if (!rawMaterialId || !amount) {
      return reply.status(400).send({ error: 'Ham madde ve miktar gerekli' });
    }

    // Check if already exists
    const existing = await prisma.menuItemIngredient.findUnique({
      where: { menuItemId_rawMaterialId: { menuItemId, rawMaterialId } },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.menuItemIngredient.update({
        where: { id: existing.id },
        data: { amount, optional: optional ?? existing.optional },
        include: { rawMaterial: true },
      });
      return { ingredient: updated };
    }

    const ingredient = await prisma.menuItemIngredient.create({
      data: {
        menuItemId,
        rawMaterialId,
        amount,
        optional: optional ?? false,
      },
      include: { rawMaterial: true },
    });

    return { ingredient };
  });

  // Update ingredient amount
  server.put('/menu-item/:menuItemId/ingredients/:ingredientId', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { ingredientId } = request.params as { menuItemId: string; ingredientId: string };
    const { amount, optional } = request.body as { amount?: number; optional?: boolean };

    const ingredient = await prisma.menuItemIngredient.findUnique({ where: { id: ingredientId } });
    if (!ingredient) {
      return reply.status(404).send({ error: 'İçerik bulunamadı' });
    }

    const updated = await prisma.menuItemIngredient.update({
      where: { id: ingredientId },
      data: {
        amount: amount !== undefined ? amount : undefined,
        optional: optional !== undefined ? optional : undefined,
      },
      include: { rawMaterial: true },
    });

    return { ingredient: updated };
  });

  // Remove ingredient from menu item
  server.delete('/menu-item/:menuItemId/ingredients/:ingredientId', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { ingredientId } = request.params as { menuItemId: string; ingredientId: string };

    await prisma.menuItemIngredient.delete({
      where: { id: ingredientId },
    });

    return { success: true };
  });

  // Bulk set ingredients for a menu item
  server.post('/menu-item/:menuItemId/ingredients/bulk', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { menuItemId } = request.params as { menuItemId: string };
    const { ingredients } = request.body as {
      ingredients: { rawMaterialId: string; amount: number; optional?: boolean }[];
    };

    if (!ingredients || !Array.isArray(ingredients)) {
      return reply.status(400).send({ error: 'İçerik listesi gerekli' });
    }

    // Delete existing ingredients for this menu item
    await prisma.menuItemIngredient.deleteMany({
      where: { menuItemId },
    });

    // Create new ingredients
    if (ingredients.length > 0) {
      await prisma.menuItemIngredient.createMany({
        data: ingredients.map((ing) => ({
          menuItemId,
          rawMaterialId: ing.rawMaterialId,
          amount: ing.amount,
          optional: ing.optional ?? false,
        })),
      });
    }

    // Return the updated ingredients
    const updatedIngredients = await prisma.menuItemIngredient.findMany({
      where: { menuItemId },
      include: { rawMaterial: true },
    });

    return { ingredients: updatedIngredients };
  });
}
