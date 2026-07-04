// Pizza Şefi mini-oyunu — herkese açık global liderlik tablosu.
// POST /api/pizza-game/score        { name, score }  -> skoru kaydet, sıralamayı döndür
// GET  /api/pizza-game/leaderboard                    -> en yüksek 20 skor
// Auth yok (public arcade). Skor sunucuda clamp'lenir; isim 16 karaktere kırpılır.

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function pizzaGameRoutes(server: FastifyInstance) {
  server.get('/leaderboard', async () => {
    const leaderboard = await request.db.pizzaGameScore.findMany({
      orderBy: { score: 'desc' },
      take: 20,
      select: { name: true, score: true, createdAt: true },
    });
    return { leaderboard };
  });

  server.post('/score', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body || {}) as { name?: string; score?: number };
    let name = String(body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 16);
    if (!name) name = 'Şef';
    const score = Math.floor(Number(body.score));
    if (!Number.isFinite(score) || score <= 0 || score > 1_000_000) {
      return reply.status(400).send({ error: 'Geçersiz skor' });
    }

    const row = await request.db.pizzaGameScore.create({ data: { name, score } });
    const higher = await request.db.pizzaGameScore.count({ where: { score: { gt: score } } });
    const leaderboard = await request.db.pizzaGameScore.findMany({
      orderBy: { score: 'desc' },
      take: 20,
      select: { name: true, score: true, createdAt: true },
    });
    return { ok: true, id: row.id, rank: higher + 1, leaderboard };
  });
}
