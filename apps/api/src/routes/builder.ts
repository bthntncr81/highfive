// Pizza & Sandwich Builder — kullanıcı kendi pizzasını/sandviçini oluşturur.
// Müşteri base seçer + ingredient'lar ekler; her ingredient extraPrice ile
// temel fiyata eklenir. Fiyat hesaplama SERVER-SIDE (mobile-orders.ts içinde
// custom item olarak işlenir, client manipule edemez).

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BuilderType } from '@prisma/client';
import { verifyAdmin } from '../middleware/auth';
import { verifyCustomerAuth } from '../lib/customer-auth';

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
    helper: 'Pizza tabanına sürülecek sos(lar) — birden fazla seçebilirsin (max 3)',
    type: 'INGREDIENT' as const,
    categories: ['BASE_SAUCE'],
    multi: true,
    required: true,
    max: 3,
  },
  {
    key: 'CHEESE',
    title: 'Peynirini seç',
    helper: 'En az 1, en fazla 4 peynir',
    type: 'INGREDIENT' as const,
    categories: ['CHEESE'],
    multi: true,
    required: true,
    max: 4,
  },
  {
    key: 'CONTENT',
    title: 'Üzerine ekle',
    helper: 'Et, sebze — en fazla 6 malzeme (opsiyonel)',
    type: 'INGREDIENT' as const,
    categories: ['MEAT', 'VEGETABLE'],
    multi: true,
    required: false,
    max: 6,
  },
  {
    key: 'TOP_SAUCE',
    title: 'Üst sos (opsiyonel)',
    helper: 'Pesto, BBQ, hardal, trüflü mayonez — birden fazla seçebilirsin (max 3)',
    type: 'INGREDIENT' as const,
    categories: ['TOP_SAUCE'],
    multi: true,
    required: false,
    max: 3,
  },
];

const SANDWICH_STEPS = [
  {
    key: 'BASE',
    title: 'Ekmeğini seç',
    helper: 'Yarım veya tam — porsiyon büyüklüğünü seç',
    type: 'BASE' as const,
    multi: false,
    required: true,
  },
  {
    key: 'BASE_SAUCE',
    title: 'Sosunu seç',
    helper: 'Ekmeğin içine sürülecek sos(lar) — birden fazla seçebilirsin (max 3)',
    type: 'INGREDIENT' as const,
    categories: ['BASE_SAUCE'],
    multi: true,
    required: true,
    max: 3,
  },
  {
    key: 'CHEESE',
    title: 'Peynirini seç',
    helper: 'En az 1, en fazla 3 peynir',
    type: 'INGREDIENT' as const,
    categories: ['CHEESE'],
    multi: true,
    required: true,
    max: 3,
  },
  {
    key: 'CONTENT',
    title: 'İçeriğini seç',
    helper: 'Et, sebze — en fazla 5 malzeme',
    type: 'INGREDIENT' as const,
    categories: ['MEAT', 'VEGETABLE'],
    multi: true,
    required: false,
    max: 5,
  },
  {
    key: 'TOP_SAUCE',
    title: 'Üst sos (opsiyonel)',
    helper: 'Pesto, hardal, BBQ, sweet chili — birden fazla seçebilirsin (max 3)',
    type: 'INGREDIENT' as const,
    categories: ['TOP_SAUCE'],
    multi: true,
    required: false,
    max: 3,
  },
];

export default async function builderRoutes(server: FastifyInstance) {
  // ==================== PUBLIC LIST ====================
  // Mobile builder ekranı için: type=PIZZA veya SANDWICH
  server.get('/config', async (req: FastifyRequest) => {
    const { type } = (req.query ?? {}) as { type?: string };
    const t = (type === 'SANDWICH' ? 'SANDWICH' : 'PIZZA') as BuilderType;

    const [bases, ingredients] = await Promise.all([
      req.db.builderBase.findMany({
        where: { type: t, isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      req.db.builderIngredient.findMany({
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
  server.get('/admin/list', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const [bases, ingredients] = await Promise.all([
      request.db.builderBase.findMany({ orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] }),
      request.db.builderIngredient.findMany({
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
      const b = await req.db.builderBase.update({ where: { id: body.id }, data });
      return { base: b };
    }
    const b = await req.db.builderBase.create({ data });
    return { base: b };
  });

  server.delete('/bases/:id', { preHandler: verifyAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await req.db.builderBase.delete({ where: { id } });
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
      const i = await req.db.builderIngredient.update({
        where: { id: body.id },
        data,
      });
      return { ingredient: i };
    }
    const i = await req.db.builderIngredient.create({ data });
    return { ingredient: i };
  });

  server.delete('/ingredients/:id', { preHandler: verifyAdmin }, async (req) => {
    const { id } = req.params as { id: string };
    await req.db.builderIngredient.delete({ where: { id } });
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

    const base = await req.db.builderBase.findUnique({ where: { id: body.baseId } });
    if (!base || !base.isActive) {
      return reply.status(404).send({ error: 'Taban bulunamadı' });
    }

    const ingredients = await req.db.builderIngredient.findMany({
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

  // ==================== SAVED DESIGNS (üye-özel) ====================
  // "Kendin Tasarla" ekranında oluşturulan tasarımı kaydet — sonradan tek tıkla
  // tekrar sipariş etmek için. Sadece üyelere açık (verifyCustomerAuth).

  // Kayıt et
  server.post('/designs', { preHandler: verifyCustomerAuth }, async (
    req: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (req as any).customerId as string;
    const body = req.body as {
      name?: string;
      builderType?: 'PIZZA' | 'SANDWICH';
      baseId?: string;
      ingredientIds?: string[];
    };
    const name = (body.name ?? '').trim();
    if (!name || name.length < 2 || name.length > 60) {
      return reply.status(400).send({ error: 'İsim 2-60 karakter olmalı' });
    }
    const builderType = body.builderType === 'SANDWICH' ? BuilderType.SANDWICH : BuilderType.PIZZA;
    if (!body.baseId) return reply.status(400).send({ error: 'Taban seçili değil' });
    const ingredientIds = Array.isArray(body.ingredientIds) ? body.ingredientIds : [];

    // Server-side fiyat doğrula (client manipüle edemez)
    const base = await req.db.builderBase.findUnique({ where: { id: body.baseId } });
    if (!base || !base.isActive || base.type !== builderType) {
      return reply.status(400).send({ error: 'Taban bulunamadı veya aktif değil' });
    }
    const ingredients =
      ingredientIds.length > 0
        ? await req.db.builderIngredient.findMany({
            where: { id: { in: ingredientIds }, isActive: true, type: builderType },
          })
        : [];
    const totalPrice =
      Number(base.basePrice) + ingredients.reduce((s, i) => s + Number(i.extraPrice), 0);

    // Aynı isimle tasarım varsa üzerine yaz (UX iyileştirmesi)
    const existing = await req.db.savedBuilderDesign.findFirst({
      where: { customerId, name, builderType },
    });
    if (existing) {
      const updated = await req.db.savedBuilderDesign.update({
        where: { id: existing.id },
        data: { baseId: body.baseId, ingredientIds, totalPrice },
      });
      return { design: updated, replaced: true };
    }

    // Çok sayıda kayıt önlensin diye limit (max 20)
    const count = await req.db.savedBuilderDesign.count({ where: { customerId } });
    if (count >= 20) {
      return reply.status(400).send({
        error: 'Maksimum 20 tasarım kaydedebilirsin. Önce birini sil.',
      });
    }

    const design = await req.db.savedBuilderDesign.create({
      data: { customerId, name, builderType, baseId: body.baseId, ingredientIds, totalPrice },
    });
    return { design, replaced: false };
  });

  // Listele
  server.get('/designs', { preHandler: verifyCustomerAuth }, async (req: FastifyRequest) => {
    const customerId = (req as any).customerId as string;
    const { type } = (req.query ?? {}) as { type?: 'PIZZA' | 'SANDWICH' };
    const builderTypeFilter =
      type === 'SANDWICH' ? BuilderType.SANDWICH : type === 'PIZZA' ? BuilderType.PIZZA : undefined;
    const designs = await req.db.savedBuilderDesign.findMany({
      where: { customerId, ...(builderTypeFilter ? { builderType: builderTypeFilter } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return {
      designs: designs.map((d) => ({
        id: d.id,
        name: d.name,
        builderType: d.builderType,
        baseId: d.baseId,
        ingredientIds: d.ingredientIds,
        totalPrice: Number(d.totalPrice),
        createdAt: d.createdAt,
      })),
    };
  });

  // Sil
  server.delete('/designs/:id', { preHandler: verifyCustomerAuth }, async (
    req: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (req as any).customerId as string;
    const { id } = req.params as { id: string };
    const design = await req.db.savedBuilderDesign.findUnique({ where: { id } });
    if (!design || design.customerId !== customerId) {
      return reply.status(404).send({ error: 'Tasarım bulunamadı' });
    }
    await req.db.savedBuilderDesign.delete({ where: { id } });
    return { ok: true };
  });
}
