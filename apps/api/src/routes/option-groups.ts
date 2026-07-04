// Option Groups CRUD — POS admin için reusable opsiyon grupları
// GET    /api/option-groups            — liste
// GET    /api/option-groups/:id        — tek grup + items
// POST   /api/option-groups            — yeni grup
// PATCH  /api/option-groups/:id        — güncelle
// DELETE /api/option-groups/:id        — sil
// POST   /api/option-groups/:id/items  — ürün ekle (extraPrice ile)
// PATCH  /api/option-groups/:id/items/:itemId — ürün güncelle
// DELETE /api/option-groups/:id/items/:itemId — ürün sil
// POST   /api/bundles/:bundleId/option-groups — bundle'a grup ata
// DELETE /api/bundles/:bundleId/option-groups/:groupId — atamayı kaldır

import { FastifyInstance, FastifyRequest } from 'fastify';
import { verifyAdmin } from '../middleware/auth';

export default async function optionGroupsRoutes(server: FastifyInstance) {
  // ==================== LIST ====================
  server.get('/', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const groups = await request.db.optionGroup.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            menuItem: {
              select: { id: true, name: true, price: true, image: true },
            },
          },
        },
        _count: { select: { assignments: true } },
      },
    });
    return { groups };
  });

  // ==================== GET ONE ====================
  server.get('/:id', { preHandler: verifyAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const group = await req.db.optionGroup.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            menuItem: {
              select: { id: true, name: true, price: true, image: true },
            },
          },
        },
      },
    });
    if (!group) return reply.status(404).send({ error: 'Grup bulunamadı' });
    return { group };
  });

  // ==================== CREATE ====================
  server.post('/', { preHandler: verifyAdmin }, async (req, reply) => {
    const body = req.body as {
      name?: string;
      description?: string;
      minSelect?: number;
      maxSelect?: number;
      sortOrder?: number;
    };
    if (!body.name) return reply.status(400).send({ error: 'name gerekli' });
    const group = await req.db.optionGroup.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        minSelect: body.minSelect ?? 1,
        maxSelect: body.maxSelect ?? 1,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return { group };
  });

  // ==================== UPDATE ====================
  server.patch('/:id', { preHandler: verifyAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    const data: any = {};
    for (const k of ['name', 'description', 'minSelect', 'maxSelect', 'sortOrder', 'isActive']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const group = await req.db.optionGroup.update({ where: { id }, data });
    return { group };
  });

  // ==================== DELETE ====================
  server.delete('/:id', { preHandler: verifyAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await req.db.optionGroup.delete({ where: { id } });
    return { ok: true };
  });

  // ==================== ADD ITEM ====================
  server.post('/:id/items', { preHandler: verifyAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as {
      menuItemId?: string;
      extraPrice?: number;
      sortOrder?: number;
      isDefault?: boolean;
    };
    if (!body.menuItemId) return reply.status(400).send({ error: 'menuItemId gerekli' });
    const item = await req.db.optionGroupItem.upsert({
      where: { optionGroupId_menuItemId: { optionGroupId: id, menuItemId: body.menuItemId } },
      update: {
        extraPrice: body.extraPrice ?? 0,
        sortOrder: body.sortOrder ?? 0,
        isDefault: body.isDefault ?? false,
      },
      create: {
        optionGroupId: id,
        menuItemId: body.menuItemId,
        extraPrice: body.extraPrice ?? 0,
        sortOrder: body.sortOrder ?? 0,
        isDefault: body.isDefault ?? false,
      },
      include: { menuItem: { select: { id: true, name: true, price: true, image: true } } },
    });
    return { item };
  });

  // ==================== UPDATE ITEM ====================
  server.patch('/:id/items/:itemId', { preHandler: verifyAdmin }, async (req) => {
    const { itemId } = req.params as { id: string; itemId: string };
    const body = req.body as any;
    const data: any = {};
    for (const k of ['extraPrice', 'sortOrder', 'isDefault']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const item = await req.db.optionGroupItem.update({ where: { id: itemId }, data });
    return { item };
  });

  // ==================== DELETE ITEM ====================
  server.delete('/:id/items/:itemId', { preHandler: verifyAdmin }, async (req) => {
    const { itemId } = req.params as { id: string; itemId: string };
    await req.db.optionGroupItem.delete({ where: { id: itemId } });
    return { ok: true };
  });

  // ==================== ASSIGN TO BUNDLE ====================
  server.post('/assign/:bundleId/:groupId', { preHandler: verifyAdmin }, async (req) => {
    const { bundleId, groupId } = req.params as { bundleId: string; groupId: string };
    const a = await req.db.bundleOptionGroupAssignment.upsert({
      where: { bundleId_optionGroupId: { bundleId, optionGroupId: groupId } },
      update: {},
      create: { bundleId, optionGroupId: groupId },
    });
    return { assignment: a };
  });

  // ==================== UNASSIGN ====================
  server.delete('/assign/:bundleId/:groupId', { preHandler: verifyAdmin }, async (req) => {
    const { bundleId, groupId } = req.params as { bundleId: string; groupId: string };
    await req.db.bundleOptionGroupAssignment.deleteMany({
      where: { bundleId, optionGroupId: groupId },
    });
    return { ok: true };
  });
}
