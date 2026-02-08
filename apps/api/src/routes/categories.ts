import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '../middleware/auth';

export default async function categoryRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Get all categories
  server.get('/', async () => {
    const categories = await prisma.category.findMany({
      where: { active: true },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { categories };
  });

  // Get category with items
  server.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        items: {
          where: { available: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!category) {
      return reply.status(404).send({ error: 'Kategori bulunamadı' });
    }

    return { category };
  });

  // Create category (admin only)
  server.post('/', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, icon, sortOrder } = request.body as {
      name: string;
      icon?: string;
      sortOrder?: number;
    };

    if (!name) {
      return reply.status(400).send({ error: 'Kategori adı gerekli' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        icon,
        sortOrder: sortOrder || 0,
      },
    });

    return { category };
  });

  // Update category (admin only)
  server.put('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { name, icon, sortOrder, active } = request.body as {
      name?: string;
      icon?: string;
      sortOrder?: number;
      active?: boolean;
    };

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return reply.status(404).send({ error: 'Kategori bulunamadı' });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        icon,
        sortOrder,
        active,
      },
    });

    return { category: updatedCategory };
  });

  // Delete category (admin only)
  server.delete('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return reply.status(404).send({ error: 'Kategori bulunamadı' });
    }

    // Check if category has items
    const itemCount = await prisma.menuItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      // Soft delete
      await prisma.category.update({
        where: { id },
        data: { active: false },
      });
    } else {
      // Hard delete if no items
      await prisma.category.delete({ where: { id } });
    }

    return { success: true };
  });

  // Reorder categories (admin only)
  server.post('/reorder', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { order } = request.body as { order: { id: string; sortOrder: number }[] };

    await Promise.all(
      order.map(({ id, sortOrder }) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder },
        })
      )
    );

    return { success: true };
  });
}

