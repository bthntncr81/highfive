// LoyaltyProgram CRUD — POS admin panel için
// Türleri: BASIC_POINTS, STAMP_CARD, BIRTHDAY, WELCOME, REFERRAL,
//         MILESTONE, STREAK, CASHBACK, PRODUCT_VIP, HAPPY_HOUR_POINTS,
//         SOCIAL, TIER_DISCOUNT

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '../middleware/auth';

export const PROGRAM_TYPES = [
  'BASIC_POINTS',
  'STAMP_CARD',
  'BIRTHDAY',
  'WELCOME',
  'REFERRAL',
  'MILESTONE',
  'STREAK',
  'CASHBACK',
  'PRODUCT_VIP',
  'HAPPY_HOUR_POINTS',
  'SOCIAL',
  'TIER_DISCOUNT',
] as const;

// Varsayılan template'ler — admin "Yeni X programı" tıklayınca form bunlarla doldurulur
export const PROGRAM_TEMPLATES: Record<string, any> = {
  BASIC_POINTS: {
    name: 'Klasik Puan Sistemi',
    description: 'Her 10₺ harcamada 1 puan, 100 puan = 10₺ indirim',
    icon: '⭐',
    color: '#F59E0B',
    config: { pointsPerTL: 10, redeemRatio: 10, minRedemption: 100, welcomeBonus: 50 },
  },
  STAMP_CARD: {
    name: 'Pizza Damga Kartı',
    description: '10 pizza al, 11.si bedava!',
    icon: '🍕',
    color: '#bb1e10',
    config: { stampsRequired: 10, rewardType: 'FREE_ITEM', rewardItemId: '', rewardValue: 0 },
  },
  BIRTHDAY: {
    name: 'Doğum Günü Sürprizi',
    description: 'Doğum gününde sana özel hediye!',
    icon: '🎂',
    color: '#EC4899',
    config: { discountPercent: 20, freeItemId: '', daysBeforeBirthday: 0, validDays: 7 },
  },
  WELCOME: {
    name: 'Hoş Geldin',
    description: 'İlk siparişe özel %25 indirim + 50 puan',
    icon: '👋',
    color: '#10B981',
    config: { discountPercent: 25, bonusPoints: 50, freeItemId: '' },
  },
  REFERRAL: {
    name: 'Arkadaşını Davet Et',
    description: 'İkiniz de 100 puan kazanın',
    icon: '🤝',
    color: '#8B5CF6',
    config: { referrerPoints: 100, refereeDiscount: 15, minOrderForReward: 50 },
  },
  MILESTONE: {
    name: 'Sipariş Hediyeleri',
    description: '5., 10., 25. siparişlerde özel ödüller',
    icon: '🎯',
    color: '#3B82F6',
    config: {
      milestones: [
        { orderCount: 5, discountPercent: 20, label: '5. siparişine %20 indirim' },
        { orderCount: 10, freeItemId: '', label: '10. siparişine bedava ürün' },
        { orderCount: 25, discountPercent: 50, label: '25. siparişe %50 indirim' },
      ],
    },
  },
  STREAK: {
    name: 'Süreklilik Bonusu',
    description: '5 hafta üst üste sipariş = 100 bonus puan',
    icon: '🔥',
    color: '#F97316',
    config: { period: 'WEEKLY', requiredCount: 5, bonusPoints: 100 },
  },
  CASHBACK: {
    name: 'Cashback Cüzdanı',
    description: 'Her sipariş %5 cüzdana, sonraki siparişte kullan',
    icon: '💰',
    color: '#22C55E',
    config: { cashbackPercent: 5, maxPerOrder: 50, minSpendForReward: 0 },
  },
  PRODUCT_VIP: {
    name: 'Pizza Tutkunu VIP',
    description: '20 pizza siparişi → 1 büyük pizza bedava',
    icon: '🏆',
    color: '#EAB308',
    config: { trackedItemIds: [], requiredCount: 20, rewardItemId: '' },
  },
  HAPPY_HOUR_POINTS: {
    name: 'Sakin Saatler 2x Puan',
    description: '14:00-17:00 arası tüm siparişlerde 2x puan',
    icon: '⏰',
    color: '#06B6D4',
    config: { startHour: 14, endHour: 17, multiplier: 2 },
  },
  SOCIAL: {
    name: 'Sosyal Puan',
    description: 'Google/Instagram paylaşım = puan',
    icon: '📱',
    color: '#A855F7',
    config: {
      platforms: [
        { name: 'Google Yorum', points: 50 },
        { name: 'Instagram Paylaşım', points: 30 },
      ],
    },
  },
  TIER_DISCOUNT: {
    name: 'Tier Indirimleri',
    description: 'Silver %5, Gold %10, Platinum %15 her zaman indirim',
    icon: '💎',
    color: '#0EA5E9',
    config: { applyToAllOrders: true },
  },
};

export default async function loyaltyProgramsRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== TEMPLATES ====================
  server.get('/templates', { preHandler: verifyAdmin }, async () => {
    return {
      types: PROGRAM_TYPES,
      templates: PROGRAM_TEMPLATES,
    };
  });

  // ==================== LIST ====================
  server.get('/', { preHandler: verifyAdmin }, async () => {
    const programs = await prisma.loyaltyProgram.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return { programs };
  });

  // ==================== GET DETAIL ====================
  server.get('/:id', { preHandler: verifyAdmin }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const { id } = request.params as { id: string };
    const program = await prisma.loyaltyProgram.findUnique({ where: { id } });
    if (!program) return reply.status(404).send({ error: 'Program bulunamadı' });
    return { program };
  });

  // ==================== CREATE ====================
  server.post('/', { preHandler: verifyAdmin }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const body = (request.body ?? {}) as any;
    if (!body.type || !PROGRAM_TYPES.includes(body.type)) {
      return reply.status(400).send({ error: 'Geçersiz program türü' });
    }
    if (!body.name) return reply.status(400).send({ error: 'name gerekli' });

    const program = await prisma.loyaltyProgram.create({
      data: {
        type: body.type,
        name: body.name,
        description: body.description ?? null,
        icon: body.icon ?? null,
        color: body.color ?? null,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
        config: body.config ?? {},
        tierConfig: body.tierConfig ?? undefined,
        applicableMenuItemIds: body.applicableMenuItemIds ?? [],
        applicableCategoryIds: body.applicableCategoryIds ?? [],
      },
    });
    return { program };
  });

  // ==================== UPDATE ====================
  server.patch('/:id', { preHandler: verifyAdmin }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as any;
    const data: any = {};
    for (const k of [
      'name', 'description', 'icon', 'color', 'isActive', 'sortOrder',
      'config', 'tierConfig', 'applicableMenuItemIds', 'applicableCategoryIds',
    ]) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    const program = await prisma.loyaltyProgram.update({ where: { id }, data });
    return { program };
  });

  // ==================== DELETE ====================
  server.delete('/:id', { preHandler: verifyAdmin }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const { id } = request.params as { id: string };
    await prisma.loyaltyProgram.delete({ where: { id } });
    return { ok: true };
  });

  // ==================== TOGGLE ACTIVE ====================
  server.post('/:id/toggle', { preHandler: verifyAdmin }, async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.loyaltyProgram.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'Program bulunamadı' });
    const program = await prisma.loyaltyProgram.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return { program };
  });
}
