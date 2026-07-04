// Gider kategorileri CRUD.
// Sabit (isSystem=true) kategoriler seed'den gelir — silinemez, name değişmez.
// Custom kategorileri ADMIN/MANAGER ekleyebilir.

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAuth, verifyAdmin } from '../middleware/auth';

export default async function expenseCategoryRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // List — dropdown için herkes okuyabilir
  server.get('/', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { active } = (request.query ?? {}) as { active?: string };
    const where: any = {};
    if (active === 'true') where.active = true;

    const categories = await prisma.expenseCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { categories };
  });

  // Create
  server.post('/', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name?: string;
      icon?: string | null;
      color?: string | null;
      sortOrder?: number;
    };
    const name = body.name?.trim();
    if (!name) return reply.status(400).send({ error: 'Kategori adı gerekli' });

    const existing = await prisma.expenseCategory.findUnique({ where: { name } });
    if (existing) return reply.status(409).send({ error: 'Bu kategori zaten var' });

    const category = await prisma.expenseCategory.create({
      data: {
        name,
        icon: body.icon ?? null,
        color: body.color ?? null,
        sortOrder: body.sortOrder ?? 50,
        isSystem: false,
        active: true,
      },
    });
    return { category };
  });

  // Update
  server.put('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Kategori bulunamadı' });

    const body = request.body as {
      name?: string;
      icon?: string | null;
      color?: string | null;
      sortOrder?: number;
      active?: boolean;
    };

    // Sistem kategorisi: name değişmez, sadece görsel + sortOrder + active
    const data: any = {
      icon: body.icon ?? existing.icon,
      color: body.color ?? existing.color,
      sortOrder: body.sortOrder ?? existing.sortOrder,
      active: body.active ?? existing.active,
    };
    if (!existing.isSystem && body.name?.trim()) data.name = body.name.trim();

    const category = await prisma.expenseCategory.update({ where: { id }, data });
    return { category };
  });

  // Delete — sistem reject; bağlı expense varsa soft delete (active:false)
  server.delete('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Kategori bulunamadı' });
    if (existing.isSystem) {
      return reply.status(403).send({ error: 'Sistem kategorisi silinemez. Pasif yapabilirsiniz.' });
    }

    const expenseCount = await prisma.expense.count({ where: { categoryId: id } });
    if (expenseCount > 0) {
      // Soft delete
      await prisma.expenseCategory.update({ where: { id }, data: { active: false } });
      return { ok: true, soft: true, message: 'Kategoriye bağlı gider var, pasif yapıldı' };
    }
    await prisma.expenseCategory.delete({ where: { id } });
    return { ok: true };
  });
}
