// Mobile (Customer) Favorites — Customer auth zorunlu
// GET    /api/mobile/favorites          - liste
// POST   /api/mobile/favorites/:menuItemId  - toggle (ekle/çıkar)

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyCustomerAuth } from '../lib/customer-auth';

export default async function mobileFavoritesRoutes(server: FastifyInstance) {
  // LIST — favori menüleri menuItem ile birlikte döner
  server.get('/', { preHandler: verifyCustomerAuth }, async (request: FastifyRequest) => {
    const customerId = (request as any).customerId as string;
    const favorites = await request.db.favoriteItem.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    if (favorites.length === 0) return { favorites: [], items: [] };

    const items = await request.db.menuItem.findMany({
      where: { id: { in: favorites.map((f) => f.menuItemId) } },
      include: { category: true },
    });

    return {
      favorites,
      items: items.map((it) => ({
        ...it,
        favoritedAt: favorites.find((f) => f.menuItemId === it.id)?.createdAt,
      })),
    };
  });

  // TOGGLE
  server.post('/:menuItemId', { preHandler: verifyCustomerAuth }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (request as any).customerId as string;
    const { menuItemId } = request.params as { menuItemId: string };

    const menuItem = await request.db.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) return reply.status(404).send({ error: 'Ürün bulunamadı' });

    const existing = await request.db.favoriteItem.findUnique({
      where: { customerId_menuItemId: { customerId, menuItemId } },
    });

    if (existing) {
      await request.db.favoriteItem.delete({ where: { id: existing.id } });
      return { favorited: false };
    } else {
      await request.db.favoriteItem.create({
        data: { customerId, menuItemId },
      });
      return { favorited: true };
    }
  });
}
