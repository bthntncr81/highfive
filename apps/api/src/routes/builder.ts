// Pizza & Sandwich Builder — kullanıcı kendi pizzasını/sandviçini oluşturur.
// Müşteri base seçer + ingredient'lar ekler; her ingredient extraPrice ile
// temel fiyata eklenir. Fiyat hesaplama SERVER-SIDE (mobile-orders.ts içinde
// custom item olarak işlenir, client manipule edemez).

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, BuilderType } from '@prisma/client';
import { verifyAdmin } from '../middleware/auth';

// 5-step wizard yapısı — frontend bu adımlara göre UI render eder.
// Mobile + landing aynı yapıyı kullanır.
const PIZZA_STEPS = [
  {
    key: 'BASE',
    title: 'Hamurunu seç',
    helper: 'İnce, klasik veya kalın — sevdiğin tabanı seç',
    type: 'BASE' as const,
    multi: false,
    required: true,
  },
  {
    key: 'BASE_SAUCE',
    title: 'Taban sosunu seç',
    helper: 'Pizza tabanına sürülecek sos',
    type: 'INGREDIENT' as const,
    categories: ['BASE_SAUCE'],
    multi: false,
    required: true,
  },
  {
    key: 'CHEESE',
    title: 'Peynirini ekle',
    helper: 'En fazla 4 peynir karışımı seçebilirsin',
    type: 'INGREDIENT' as const,
    categories: ['CHEESE'],
    multi: true,
    required: false,
    max: 4,
  },
  {
    key: 'CONTENT',
    title: 'Üzerine ekle',
    helper: 'Et, sebze, mantar — en fazla 8 malzeme',
    type: 'INGREDIENT' as const,
    categories: ['MEAT', 'VEGETABLE'],
    multi: true,
    required: false,
    max: 8,
  },
  {
    key: 'TOP_SAUCE',
    title: 'Üst sos (opsiyonel)',
    helper: 'BBQ, pesto, sweet chili — istersen atlayabilirsin',
    type: 'INGREDIENT' as const,
    categories: ['TOP_SAUCE'],
    multi: false,
    required: false,
  },
];

const SANDWICH_STEPS = [
  {
    key: 'BASE',
    title: 'Ekmeğini seç',
    helper: 'Ciabatta, schiacciatta — favori ekmeğin',
    type: 'BASE' as const,
    multi: false,
    required: true,
  },
  {
    key: 'BASE_SAUCE',
    title: 'Taban sosunu seç',
    helper: 'Ekmeğin içine sürülecek sos',
    type: 'INGREDIENT' as const,
    categories: ['BASE_SAUCE'],
    multi: false,
    required: true,
  },
  {
    key: 'CHEESE',
    title: 'Peynirini ekle',
    helper: 'En fazla 4 peynir',
    type: 'INGREDIENT' as const,
    categories: ['CHEESE'],
    multi: true,
    required: false,
    max: 4,
  },
  {
    key: 'CONTENT',
    title: 'İçeriğini seç',
    helper: 'Et, sebze, mantar — en fazla 8 malzeme',
    type: 'INGREDIENT' as const,
    categories: ['MEAT', 'VEGETABLE'],
    multi: true,
    required: false,
    max: 8,
  },
  {
    key: 'TOP_SAUCE',
    title: 'Üst sos (opsiyonel)',
    helper: 'Hardal, BBQ, sweet chili — istersen atlayabilirsin',
    type: 'INGREDIENT' as const,
    categories: ['TOP_SAUCE'],
    multi: false,
    required: false,
  },
];

export default async function builderRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== PUBLIC LIST ====================
  // Mobile builder ekranı için: type=PIZZA veya SANDWICH
  server.get('/config', async (req: FastifyRequest) => {
    const { type } = (req.query ?? {}) as { type?: string };
    const t = (type === 'SANDWICH' ? 'SANDWICH' : 'PIZZA') as BuilderType;

    const [bases, ingredients] = await Promise.all([
      prisma.builderBase.findMany({
        where: { type: t, isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.builderIngredient.findMany({
        where: { type: t, isActive: true },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      }),
    ]);

    return {
      type: t,
      // Wizard step tanımı — frontend bu sıraya göre ekran gösterir
      steps: t === 'PIZZA' ? PIZZA_STEPS : SANDWICH_STEPS,
      bases: bases.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        basePrice: Number(b.basePrice),
        baseImage: b.baseImage,
      })),
      ingredients: ingredients.map((i) => ({
        id: i.id,
        category: i.category,
        name: i.name,
        description: i.description,
        extraPrice: Number(i.extraPrice),
        layerImage: i.layerImage,
        layerOrder: i.layerOrder,
        calories: i.calories,
      })),
    };
  });

  // ==================== ADMIN LIST ====================
  server.get('/admin/list', { preHandler: verifyAdmin }, async () => {
    const [bases, ingredients] = await Promise.all([
      prisma.builderBase.findMany({ orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] }),
      prisma.builderIngredient.findMany({
        orderBy: [{ type: 'asc' }, { category: 'asc' }, { sortOrder: 'asc' }],
      }),
    ]);
    return { bases, ingredients };
  });

  // ==================== BASE CRUD ====================
  server.post('/bases', { preHandler: verifyAdmin }, async (req, reply) => {
    const body = req.body as any;
    if (!body.type || !body.name || body.basePrice == null || !body.baseImage) {
      return reply.status(400).send({ error: 'type, name, basePrice, baseImage gerekli' });
    }
    const data = {
      type: body.type as BuilderType,
      name: body.name,
      description: body.description ?? null,
      basePrice: body.basePrice,
      baseImage: body.baseImage,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    };
    if (body.id) {
      const b = await prisma.builderBase.update({ where: { id: body.id }, data });
      return { base: b };
    }
    const b = await prisma.builderBase.create({ data });
    return { base: b };
  });

  server.delete('/bases/:id', { preHandler: verifyAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.builderBase.delete({ where: { id } });
    return { ok: true };
  });

  // ==================== INGREDIENT CRUD ====================
  server.post('/ingredients', { preHandler: verifyAdmin }, async (req, reply) => {
    const body = req.body as any;
    if (!body.type || !body.category || !body.name || !body.layerImage) {
      return reply.status(400).send({
        error: 'type, category, name, layerImage gerekli',
      });
    }
    const data = {
      type: body.type as BuilderType,
      category: body.category,
      name: body.name,
      description: body.description ?? null,
      extraPrice: body.extraPrice ?? 0,
      layerImage: body.layerImage,
      layerOrder: body.layerOrder ?? 5,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
      calories: body.calories ?? null,
    };
    if (body.id) {
      const i = await prisma.builderIngredient.update({
        where: { id: body.id },
        data,
      });
      return { ingredient: i };
    }
    const i = await prisma.builderIngredient.create({ data });
    return { ingredient: i };
  });

  server.delete('/ingredients/:id', { preHandler: verifyAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.builderIngredient.delete({ where: { id } });
    return { ok: true };
  });

  // ==================== PRICE CALCULATION ====================
  // Mobile cart eklemeden ÖNCE backend'den fiyat doğrulaması.
  // Body: { type, baseId, ingredientIds[] }
  // Yanıt: { totalPrice, baseName, ingredientNames[], breakdown }
  server.post('/calculate', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as {
      type?: string;
      baseId?: string;
      ingredientIds?: string[];
    };
    if (!body.baseId) return reply.status(400).send({ error: 'baseId gerekli' });

    const base = await prisma.builderBase.findUnique({ where: { id: body.baseId } });
    if (!base || !base.isActive) {
      return reply.status(404).send({ error: 'Taban bulunamadı' });
    }

    const ingredients = await prisma.builderIngredient.findMany({
      where: {
        id: { in: body.ingredientIds ?? [] },
        isActive: true,
        type: base.type,
      },
    });

    const baseTotal = Number(base.basePrice);
    const extras = ingredients.reduce((s, i) => s + Number(i.extraPrice), 0);
    const totalPrice = baseTotal + extras;

    return {
      totalPrice,
      baseName: base.name,
      basePrice: baseTotal,
      extras,
      ingredientList: ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        extraPrice: Number(i.extraPrice),
      })),
    };
  });
}
