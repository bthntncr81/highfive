// Games — Spin Wheel + Achievements + Scratch Card
// Tüm ödül outcome'ları SERVER-SIDE üretilir; client'a sadece sonuç döner.
// Bu güvenlik garantisi: kullanıcı request manipule ederek farklı ödül kazanamaz.

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, Prisma } from '@prisma/client';
import { verifyCustomerAuth } from '../lib/customer-auth';
import { verifyAdmin } from '../middleware/auth';
import { randomBytes } from 'crypto';
import { checkAchievementsForCustomer } from '../lib/achievement-checker';

type Slice = {
  label: string;
  weight: number;
  type: 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED' | 'POINTS' | 'FREE_ITEM' | 'TRY_AGAIN' | 'NOTHING';
  value: number;
  color: string;
  emoji?: string;
};

/** Weighted random — server-side outcome. */
function weightedPick(slices: Slice[]): number {
  const totalWeight = slices.reduce((sum, s) => sum + Math.max(0, s.weight), 0);
  if (totalWeight === 0) return 0;
  let r = Math.random() * totalWeight;
  for (let i = 0; i < slices.length; i++) {
    r -= Math.max(0, slices[i].weight);
    if (r <= 0) return i;
  }
  return slices.length - 1;
}

function generateCouponCode(prefix: string): string {
  return `${prefix}${randomBytes(4).toString('hex').toUpperCase()}`;
}

export default async function gamesRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== SPIN WHEEL — admin config ====================
  server.get('/spin/config', async () => {
    const config = await prisma.spinWheelConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!config) return { config: null };
    // Slices'ı UI için döndür — weight'leri client'tan gizle (manipülasyona karşı)
    const slices = ((config.slices as any[]) ?? []).map((s: Slice) => ({
      label: s.label,
      type: s.type,
      value: s.value,
      color: s.color,
      emoji: s.emoji ?? null,
    }));
    return {
      config: {
        id: config.id,
        name: config.name,
        description: config.description,
        cooldownHours: config.cooldownHours,
        minCartTotal: Number(config.minCartTotal),
        slices,
      },
    };
  });

  // Admin: yeni config oluştur veya güncelle (aktif olanı deaktive eder)
  server.post('/spin/config', { preHandler: verifyAdmin }, async (req, reply) => {
    const body = req.body as {
      name?: string;
      description?: string;
      cooldownHours?: number;
      minCartTotal?: number;
      slices: Slice[];
      isActive?: boolean;
    };
    if (!Array.isArray(body.slices) || body.slices.length < 2) {
      return reply.status(400).send({ error: 'En az 2 dilim gerekli' });
    }
    // Eski aktif çarkı pasif yap
    if (body.isActive ?? true) {
      await prisma.spinWheelConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    const config = await prisma.spinWheelConfig.create({
      data: {
        name: body.name ?? 'Şans Çarkı',
        description: body.description ?? null,
        cooldownHours: body.cooldownHours ?? 24,
        minCartTotal: body.minCartTotal ?? 0,
        slices: body.slices as Prisma.InputJsonValue,
        isActive: body.isActive ?? true,
      },
    });
    return { config };
  });

  // ==================== SPIN WHEEL — play ====================
  // Customer çark çevirir. Cooldown + min sepet kontrolü + weighted outcome.
  server.post('/spin/play', { preHandler: verifyCustomerAuth }, async (
    req: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (req as any).customerId as string;

    const config = await prisma.spinWheelConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!config) return reply.status(400).send({ error: 'Aktif çark yok' });

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, lastSpinAt: true, totalPoints: true, lifetimePoints: true },
    });
    if (!customer) return reply.status(404).send({ error: 'Müşteri yok' });

    // Cooldown kontrolü
    if (customer.lastSpinAt) {
      const ms = Date.now() - new Date(customer.lastSpinAt).getTime();
      const cooldownMs = config.cooldownHours * 60 * 60 * 1000;
      if (ms < cooldownMs) {
        const next = new Date(new Date(customer.lastSpinAt).getTime() + cooldownMs);
        return reply.status(429).send({
          error: 'Çark çevirme süresi dolmadı',
          nextSpinAt: next.toISOString(),
          remainingMs: cooldownMs - ms,
        });
      }
    }

    const slices = config.slices as unknown as Slice[];
    if (!Array.isArray(slices) || slices.length === 0) {
      return reply.status(500).send({ error: 'Çark konfigürasyonu hatalı' });
    }

    const prizeIndex = weightedPick(slices);
    const winning = slices[prizeIndex];

    // Ödüle göre işlem
    let couponId: string | null = null;
    let pointsAwarded = 0;

    if (winning.type === 'DISCOUNT_PERCENT' || winning.type === 'DISCOUNT_FIXED') {
      // Kupon oluştur — 7 gün geçerli, 1 kez kullanılır
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const code = generateCouponCode('SPIN');
      const c = await prisma.coupon.create({
        data: {
          code,
          name: `Şans Çarkı: ${winning.label}`,
          description: `Çark ödülü — ${winning.label}`,
          discountType: winning.type === 'DISCOUNT_PERCENT' ? 'PERCENT' : 'FIXED',
          discountValue: winning.value,
          startDate,
          endDate,
          usageLimit: 1,
          usagePerCustomer: 1,
          isActive: true,
        },
      });
      couponId = c.id;
    } else if (winning.type === 'POINTS' && winning.value > 0) {
      pointsAwarded = Math.floor(winning.value);
      await prisma.$transaction([
        prisma.customer.update({
          where: { id: customerId },
          data: {
            totalPoints: { increment: pointsAwarded },
            lifetimePoints: { increment: pointsAwarded },
          },
        }),
        prisma.pointsTransaction.create({
          data: {
            customerId,
            points: pointsAwarded,
            type: 'BONUS',
            description: `Şans Çarkı ödülü: ${winning.label}`,
          },
        }),
      ]);
    }

    // Attempt kaydı + cooldown güncelle
    const attempt = await prisma.spinAttempt.create({
      data: {
        customerId,
        configId: config.id,
        prizeIndex,
        prizeLabel: winning.label,
        prizeType: winning.type,
        prizeValue: winning.value,
        couponId,
      },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastSpinAt: new Date() },
    });

    // SPIN_WIN achievement kontrolü (büyük ödül kazandıysa rozet açılabilir)
    await checkAchievementsForCustomer(prisma, customerId).catch(() => {});

    return {
      attempt: {
        id: attempt.id,
        prizeIndex,
        prizeLabel: winning.label,
        prizeType: winning.type,
        prizeValue: winning.value,
        couponId,
        pointsAwarded,
      },
    };
  });

  // ==================== ACHIEVEMENTS ====================
  // Liste — kullanıcının kazandığı + kazanabileceği rozetler
  server.get('/achievements/me', { preHandler: verifyCustomerAuth }, async (
    req: FastifyRequest,
  ) => {
    const customerId = (req as any).customerId as string;
    const [all, mine] = await Promise.all([
      prisma.achievement.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.customerAchievement.findMany({
        where: { customerId },
        include: { achievement: true },
      }),
    ]);
    const minSet = new Map(mine.map((m) => [m.achievementId, m]));
    const result = all.map((a) => {
      const earned = minSet.get(a.id);
      return {
        id: a.id,
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
        type: a.type,
        rewardPoints: a.rewardPoints,
        unlocked: !!earned,
        unlockedAt: earned?.unlockedAt ?? null,
        seenAt: earned?.seenAt ?? null,
      };
    });
    return { achievements: result };
  });

  // Modal görüldü işaretle (her achievement için 1x)
  server.post('/achievements/:id/seen', { preHandler: verifyCustomerAuth }, async (
    req: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (req as any).customerId as string;
    const { id } = req.params as { id: string };
    const updated = await prisma.customerAchievement.updateMany({
      where: { customerId, achievementId: id, seenAt: null },
      data: { seenAt: new Date() },
    });
    return { updated: updated.count };
  });

  // Admin: achievement oluştur / güncelle
  server.post('/achievements', { preHandler: verifyAdmin }, async (req, reply) => {
    const body = req.body as any;
    if (!body.key || !body.name || !body.type || !body.criteria) {
      return reply.status(400).send({ error: 'key, name, type, criteria gerekli' });
    }
    const a = await prisma.achievement.upsert({
      where: { key: body.key },
      update: {
        name: body.name,
        description: body.description ?? '',
        icon: body.icon ?? '🏅',
        type: body.type,
        criteria: body.criteria,
        rewardPoints: body.rewardPoints ?? 0,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
      create: {
        key: body.key,
        name: body.name,
        description: body.description ?? '',
        icon: body.icon ?? '🏅',
        type: body.type,
        criteria: body.criteria,
        rewardPoints: body.rewardPoints ?? 0,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    return { achievement: a };
  });

  // ==================== SCRATCH CARD ====================
  // Sipariş sonrası bir scratch card oluştur (server outcome).
  // Returns nothing if minSpend yetersizse veya zaten oluşturulmuşsa.
  server.post('/scratch/issue/:orderId', { preHandler: verifyCustomerAuth }, async (
    req: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (req as any).customerId as string;
    const { orderId } = req.params as { orderId: string };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, total: true, paymentStatus: true },
    });
    if (!order) return reply.status(404).send({ error: 'Sipariş yok' });
    if (Number(order.total) < 100) return { reward: null }; // 100₺ altı bonus yok

    // Aynı sipariş için zaten kart varsa onu döndür
    const existing = await prisma.scratchReward.findFirst({
      where: { customerId, orderId },
    });
    if (existing) return { reward: existing };

    // Basit weighted random — 30% indirim%5, 20% puan, 10% kupon büyük, 40% nothing
    const r = Math.random();
    let prizeType: string;
    let prizeLabel: string;
    let prizeValue: number | null = null;
    let couponId: string | null = null;

    if (r < 0.3) {
      prizeType = 'DISCOUNT_PERCENT';
      prizeValue = 5;
      prizeLabel = '%5 İndirim';
      const code = generateCouponCode('SCRATCH');
      const c = await prisma.coupon.create({
        data: {
          code,
          name: 'Kazı Kazan: %5 İndirim',
          description: 'Kazı kazan ödülü',
          discountType: 'PERCENT',
          discountValue: 5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          usageLimit: 1,
          usagePerCustomer: 1,
          isActive: true,
        },
      });
      couponId = c.id;
    } else if (r < 0.5) {
      prizeType = 'POINTS';
      prizeValue = 50;
      prizeLabel = '50 Puan';
      await prisma.$transaction([
        prisma.customer.update({
          where: { id: customerId },
          data: { totalPoints: { increment: 50 }, lifetimePoints: { increment: 50 } },
        }),
        prisma.pointsTransaction.create({
          data: {
            customerId,
            points: 50,
            type: 'BONUS',
            description: 'Kazı kazan bonus',
          },
        }),
      ]);
    } else if (r < 0.6) {
      prizeType = 'DISCOUNT_PERCENT';
      prizeValue = 15;
      prizeLabel = '%15 BÜYÜK İNDİRİM';
      const code = generateCouponCode('SCRATCH');
      const c = await prisma.coupon.create({
        data: {
          code,
          name: 'Kazı Kazan: %15 İndirim',
          description: 'Kazı kazan büyük ödül',
          discountType: 'PERCENT',
          discountValue: 15,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          usageLimit: 1,
          usagePerCustomer: 1,
          isActive: true,
        },
      });
      couponId = c.id;
    } else {
      prizeType = 'NOTHING';
      prizeLabel = 'Bu sefer şans yok 😔';
    }

    const reward = await prisma.scratchReward.create({
      data: {
        customerId,
        orderId,
        prizeType,
        prizeLabel,
        prizeValue: prizeValue ?? null,
        couponId,
      },
    });
    return { reward };
  });

  // Müşteri kart kazıdığında işaretle
  server.post('/scratch/:id/scratch', { preHandler: verifyCustomerAuth }, async (
    req: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const customerId = (req as any).customerId as string;
    const { id } = req.params as { id: string };
    const r = await prisma.scratchReward.findUnique({ where: { id } });
    if (!r || r.customerId !== customerId) {
      return reply.status(404).send({ error: 'Kart bulunamadı' });
    }
    if (r.scratchedAt) return { reward: r };
    const updated = await prisma.scratchReward.update({
      where: { id },
      data: { scratchedAt: new Date() },
    });
    return { reward: updated };
  });
}
