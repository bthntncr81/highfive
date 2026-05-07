// Loyalty Engine
// Sipariş COMPLETED olunca aktif sadakat programlarını işler.
// Her program tipi için ayrı handler. Ödülleri Coupon modeli üzerinden veya
// direkt Customer alanlarına yazar.

import type { PrismaClient, Order, Customer } from '@prisma/client';
import { sendPushToTokens } from './push';
import * as crypto from 'crypto';

type AnyProgram = any;
type ProgramData = Record<string, any>;

// Yeni kupon kodu üret — REWARD-XXXXX
function generateCouponCode(prefix: string): string {
  const r = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${r}`;
}

// Müşterinin telefon push token'larını çek
async function getCustomerPushTokens(prisma: PrismaClient, customerId: string): Promise<string[]> {
  const devices = await prisma.deviceToken.findMany({
    where: { customerId, isActive: true },
    select: { token: true },
  });
  return devices.map((d) => d.token);
}

// Müşteriye push gönder (preference kontrol)
async function sendLoyaltyPush(
  prisma: PrismaClient,
  customerId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const prefs = await prisma.notificationPreference.findUnique({ where: { customerId } });
  if (prefs && (!prefs.pushEnabled || !prefs.loyalty)) return;
  const tokens = await getCustomerPushTokens(prisma, customerId);
  if (tokens.length === 0) return;
  await sendPushToTokens(tokens, { title, body, data });
}

// Progress kaydını upsert et
async function getOrCreateProgress(
  prisma: PrismaClient,
  customerId: string,
  programId: string,
  defaultData: ProgramData = {},
) {
  const existing = await prisma.customerLoyaltyProgress.findUnique({
    where: { customerId_programId: { customerId, programId } },
  });
  if (existing) return existing;
  return prisma.customerLoyaltyProgress.create({
    data: { customerId, programId, data: defaultData as any },
  });
}

async function updateProgress(
  prisma: PrismaClient,
  customerId: string,
  programId: string,
  data: ProgramData,
) {
  await prisma.customerLoyaltyProgress.upsert({
    where: { customerId_programId: { customerId, programId } },
    create: { customerId, programId, data: data as any },
    update: { data: data as any },
  });
}

// Tier bazlı override — belirli config field'ı için
function tierConfig(program: AnyProgram, customer: Customer & { loyaltyTier?: any }, key: string, fallback: any) {
  const tierId = customer.loyaltyTierId;
  if (tierId && program.tierConfig && program.tierConfig[tierId] && program.tierConfig[tierId][key] !== undefined) {
    return program.tierConfig[tierId][key];
  }
  return program.config?.[key] ?? fallback;
}

// =====================================================
// HANDLER'LAR
// =====================================================

// 1) STAMP_CARD — sipariş kalemleri (applicableMenuItemIds ile filter) eşleşiyorsa damga ekle
async function handleStampCard(
  prisma: PrismaClient,
  program: AnyProgram,
  customer: Customer & { loyaltyTier?: any },
  order: Order & { items: any[] },
) {
  const target = Number(tierConfig(program, customer, 'stampsRequired', 10));
  const applicable = program.applicableMenuItemIds ?? [];

  // Bu siparişte kaç tane uygun ürün var?
  let stampsToAdd = 0;
  if (applicable.length === 0) {
    // Boş ise her sipariş 1 damga
    stampsToAdd = 1;
  } else {
    for (const it of order.items) {
      if (it.menuItemId && applicable.includes(it.menuItemId)) {
        stampsToAdd += it.quantity;
      }
    }
  }
  if (stampsToAdd === 0) return;

  const cur = await getOrCreateProgress(prisma, customer.id, program.id, { count: 0, claimedRewards: 0 });
  const data = (cur.data as any) ?? {};
  let count = (data.count ?? 0) + stampsToAdd;
  let claimed = data.claimedRewards ?? 0;
  let rewardCreated = false;

  // Hedefe ulaştı mı (birden çok ödül de olabilir)
  while (count >= target) {
    count -= target;
    claimed += 1;

    // Kupon yarat
    await createStampReward(prisma, program, customer);
    rewardCreated = true;
  }

  await updateProgress(prisma, customer.id, program.id, { count, claimedRewards: claimed });

  if (rewardCreated) {
    await sendLoyaltyPush(
      prisma,
      customer.id,
      `🎉 ${program.name}`,
      `Ödülün hazır! Profilinden kuponu kullanabilirsin.`,
      { type: 'STAMP_REWARD', programId: program.id, route: '/loyalty' },
    );
  }
}

async function createStampReward(prisma: PrismaClient, program: AnyProgram, customer: Customer) {
  const rewardType = program.config?.rewardType ?? 'FREE_ITEM';
  const code = generateCouponCode('STAMP');
  const validUntil = new Date(Date.now() + 30 * 86400_000); // 30 gün

  if (rewardType === 'FREE_ITEM') {
    // %100 indirim, sınırlı belirli ürün üzerinde
    await prisma.coupon.create({
      data: {
        code,
        name: `${program.name} - Bedava Ürün`,
        description: 'Damga kartı ödülü',
        discountType: 'PERCENT',
        discountValue: 100,
        startDate: new Date(),
        endDate: validUntil,
        usageLimit: 1,
        usagePerCustomer: 1,
        isActive: true,
        loyaltyTierIds: [],
      },
    });
  } else {
    // Tutar indirimi
    await prisma.coupon.create({
      data: {
        code,
        name: `${program.name} - İndirim`,
        description: 'Damga kartı ödülü',
        discountType: 'FIXED',
        discountValue: program.config?.rewardValue ?? 50,
        startDate: new Date(),
        endDate: validUntil,
        usageLimit: 1,
        usagePerCustomer: 1,
        isActive: true,
        loyaltyTierIds: [],
      },
    });
  }
}

// 2) CASHBACK — harcamanın %X'ini wallet'a ekle
async function handleCashback(
  prisma: PrismaClient,
  program: AnyProgram,
  customer: Customer,
  order: Order,
) {
  const pct = Number(program.config?.cashbackPercent ?? 5);
  const max = Number(program.config?.maxPerOrder ?? 50);
  const minSpend = Number(program.config?.minSpendForReward ?? 0);

  const subtotal = Number(order.subtotal);
  if (subtotal < minSpend) return;

  const cashback = Math.min(max, (subtotal * pct) / 100);
  if (cashback <= 0) return;

  await prisma.customer.update({
    where: { id: customer.id },
    data: { cashbackBalance: { increment: cashback } },
  });

  await sendLoyaltyPush(
    prisma,
    customer.id,
    `💰 ${cashback.toFixed(2)}₺ cashback kazandın!`,
    `Cüzdanına eklendi, sonraki siparişinde kullan.`,
    { type: 'CASHBACK_EARNED', amount: cashback, route: '/loyalty' },
  );
}

// 3) MILESTONE — orderCount kontrol et, yeni milestone aşıldıysa kupon
async function handleMilestone(
  prisma: PrismaClient,
  program: AnyProgram,
  customer: Customer,
) {
  const milestones: any[] = program.config?.milestones ?? [];
  const orderCount = customer.orderCount; // Bu sipariş tamamlanmış olarak sayılıyor

  const cur = await getOrCreateProgress(prisma, customer.id, program.id, { lastClaimedAt: 0 });
  const data = (cur.data as any) ?? {};
  const lastClaimed = data.lastClaimedAt ?? 0;

  // Bu siparişle ulaşılan milestone(lar)
  const newOnes = milestones.filter((m) => m.orderCount <= orderCount && m.orderCount > lastClaimed);
  if (newOnes.length === 0) return;

  for (const m of newOnes) {
    const code = generateCouponCode(`MS${m.orderCount}`);
    if (m.discountPercent) {
      await prisma.coupon.create({
        data: {
          code,
          name: m.label || `${m.orderCount}. Sipariş`,
          description: 'Milestone ödülü',
          discountType: 'PERCENT',
          discountValue: m.discountPercent,
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 86400_000),
          usageLimit: 1,
          usagePerCustomer: 1,
          isActive: true,
          loyaltyTierIds: [],
        },
      });
    } else if (m.freeItemId) {
      await prisma.coupon.create({
        data: {
          code,
          name: m.label || `${m.orderCount}. Sipariş - Bedava Ürün`,
          description: 'Milestone ödülü',
          discountType: 'PERCENT',
          discountValue: 100,
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 86400_000),
          usageLimit: 1,
          usagePerCustomer: 1,
          isActive: true,
          loyaltyTierIds: [],
        },
      });
    }

    await sendLoyaltyPush(
      prisma,
      customer.id,
      `🎯 ${m.orderCount}. siparişin tamamlandı!`,
      m.label || `Özel ödülün hazır`,
      { type: 'MILESTONE_REWARD', milestone: m.orderCount, route: '/loyalty' },
    );
  }

  await updateProgress(prisma, customer.id, program.id, {
    lastClaimedAt: Math.max(...newOnes.map((m) => m.orderCount), lastClaimed),
  });
}

// 4) STREAK — periyot kontrolü
async function handleStreak(
  prisma: PrismaClient,
  program: AnyProgram,
  customer: Customer,
) {
  const period = program.config?.period ?? 'WEEKLY';
  const target = Number(program.config?.requiredCount ?? 5);
  const bonusPoints = Number(program.config?.bonusPoints ?? 100);

  const now = new Date();
  const last = customer.lastStreakDate ?? null;

  // Periyot kontrolü
  const isContiguous = (() => {
    if (!last) return false;
    const diffMs = now.getTime() - new Date(last).getTime();
    const diffDays = diffMs / 86400_000;
    if (period === 'DAILY') return diffDays >= 0.5 && diffDays <= 2;
    if (period === 'WEEKLY') return diffDays >= 4 && diffDays <= 14;
    if (period === 'MONTHLY') return diffDays >= 20 && diffDays <= 45;
    return false;
  })();

  let current = customer.currentStreak;
  if (isContiguous) {
    current += 1;
  } else {
    current = 1; // resetle
  }

  const longest = Math.max(customer.longestStreak, current);

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      currentStreak: current,
      longestStreak: longest,
      lastStreakDate: now,
    },
  });

  // Hedefe ulaştıysa bonus puan
  if (current >= target && (current - target) % target === 0) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalPoints: { increment: bonusPoints },
        lifetimePoints: { increment: bonusPoints },
      },
    });
    await prisma.pointsTransaction.create({
      data: {
        customerId: customer.id,
        points: bonusPoints,
        type: 'BONUS',
        description: `${target} ${period} streak bonusu`,
      },
    });
    await sendLoyaltyPush(
      prisma,
      customer.id,
      `🔥 ${current} ${period === 'DAILY' ? 'gün' : period === 'WEEKLY' ? 'hafta' : 'ay'} üst üste!`,
      `${bonusPoints} bonus puan kazandın!`,
      { type: 'STREAK_BONUS', route: '/loyalty' },
    );
  }
}

// 5) WELCOME — ilk siparişte tetiklenir
async function handleWelcome(
  prisma: PrismaClient,
  program: AnyProgram,
  customer: Customer,
) {
  const cur = await getOrCreateProgress(prisma, customer.id, program.id, { claimed: false });
  const data = (cur.data as any) ?? {};
  if (data.claimed) return;

  if (customer.orderCount === 1) {
    const bonusPoints = Number(program.config?.bonusPoints ?? 50);
    if (bonusPoints > 0) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalPoints: { increment: bonusPoints },
          lifetimePoints: { increment: bonusPoints },
        },
      });
      await prisma.pointsTransaction.create({
        data: {
          customerId: customer.id,
          points: bonusPoints,
          type: 'BONUS',
          description: 'Hoş geldin bonusu',
        },
      });
    }

    await updateProgress(prisma, customer.id, program.id, { claimed: true });

    await sendLoyaltyPush(
      prisma,
      customer.id,
      `👋 Hoş geldin!`,
      `${bonusPoints} puan + sıradaki siparişine özel teklifler hazır`,
      { type: 'WELCOME', route: '/loyalty' },
    );
  }
}

// 6) REFERRAL — bu müşteri ilk siparişini tamamladı, davet edenine puan ver
async function handleReferral(
  prisma: PrismaClient,
  program: AnyProgram,
  customer: Customer,
  order: Order,
) {
  if (customer.orderCount !== 1) return; // sadece ilk siparişte
  if (!customer.referredByCode) return;

  const minOrder = Number(program.config?.minOrderForReward ?? 0);
  if (Number(order.subtotal) < minOrder) return;

  const referrer = await prisma.customer.findUnique({
    where: { referralCode: customer.referredByCode },
  });
  if (!referrer) return;

  const referrerPoints = Number(program.config?.referrerPoints ?? 100);

  await prisma.customer.update({
    where: { id: referrer.id },
    data: {
      totalPoints: { increment: referrerPoints },
      lifetimePoints: { increment: referrerPoints },
      referralCount: { increment: 1 },
    },
  });
  await prisma.pointsTransaction.create({
    data: {
      customerId: referrer.id,
      points: referrerPoints,
      type: 'BONUS',
      description: `${customer.name ?? customer.phone} davet ödülü`,
    },
  });

  await sendLoyaltyPush(
    prisma,
    referrer.id,
    `🤝 Davet ettiğin arkadaşın geldi!`,
    `${referrerPoints} puan kazandın 🎉`,
    { type: 'REFERRAL_REWARD', route: '/loyalty' },
  );
}

// 7) HAPPY_HOUR_POINTS — sipariş saati aralıktaysa bonus puan
async function handleHappyHourPoints(
  prisma: PrismaClient,
  program: AnyProgram,
  customer: Customer,
  order: Order,
) {
  const start = Number(program.config?.startHour ?? 14);
  const end = Number(program.config?.endHour ?? 17);
  const mult = Number(program.config?.multiplier ?? 2);

  const orderHour = new Date(order.createdAt).getHours();
  if (orderHour < start || orderHour >= end) return;

  // Mevcut puan kazanımına ek puan ekle (subtotal/10 * (mult - 1))
  const basePoints = Math.floor(Number(order.subtotal) / 10);
  const bonus = Math.floor(basePoints * (mult - 1));
  if (bonus <= 0) return;

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      totalPoints: { increment: bonus },
      lifetimePoints: { increment: bonus },
    },
  });
  await prisma.pointsTransaction.create({
    data: {
      customerId: customer.id,
      orderId: order.id,
      points: bonus,
      type: 'BONUS',
      description: `Happy hour ${mult}x bonus`,
    },
  });
}

// 8) PRODUCT_VIP — belirli ürünleri saymak
async function handleProductVip(
  prisma: PrismaClient,
  program: AnyProgram,
  customer: Customer,
  order: Order & { items: any[] },
) {
  const tracked: string[] = program.applicableMenuItemIds ?? [];
  if (tracked.length === 0) return;

  const target = Number(program.config?.requiredCount ?? 20);
  const cur = await getOrCreateProgress(prisma, customer.id, program.id, { itemCounts: {} });
  const data = (cur.data as any) ?? {};
  const itemCounts: Record<string, number> = { ...(data.itemCounts ?? {}) };

  let added = 0;
  for (const it of order.items) {
    if (it.menuItemId && tracked.includes(it.menuItemId)) {
      itemCounts[it.menuItemId] = (itemCounts[it.menuItemId] ?? 0) + it.quantity;
      added += it.quantity;
    }
  }
  if (added === 0) return;

  const total = Object.values(itemCounts).reduce((a, b) => a + b, 0);
  let claimed = data.claimedRewards ?? 0;
  let rewardFired = false;

  if (total >= target * (claimed + 1)) {
    // Yeni ödül
    claimed += 1;
    rewardFired = true;
    const code = generateCouponCode('VIP');
    await prisma.coupon.create({
      data: {
        code,
        name: `${program.name} - VIP Ödül`,
        description: 'Ürün VIP ödülü',
        discountType: 'PERCENT',
        discountValue: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 86400_000),
        usageLimit: 1,
        usagePerCustomer: 1,
        isActive: true,
        loyaltyTierIds: [],
      },
    });
  }

  await updateProgress(prisma, customer.id, program.id, { itemCounts, claimedRewards: claimed });

  if (rewardFired) {
    await sendLoyaltyPush(
      prisma,
      customer.id,
      `🏆 ${program.name}`,
      `${target} ürüne ulaştın, ödülün hazır!`,
      { type: 'VIP_REWARD', route: '/loyalty' },
    );
  }
}

// =====================================================
// ANA İŞLEM — sipariş tamamlandığında çağrılır
// =====================================================

export async function processOrderForLoyalty(
  prisma: PrismaClient,
  orderId: string,
): Promise<void> {
  // Bu order için CustomerOrder bağı var mı?
  const co = await prisma.customerOrder.findUnique({ where: { orderId } });
  if (!co) return; // Mobile/customer-bound order değil

  const customer = await prisma.customer.findUnique({
    where: { id: co.customerId },
    include: { loyaltyTier: true },
  });
  if (!customer) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  const programs = await prisma.loyaltyProgram.findMany({
    where: { isActive: true },
  });

  for (const p of programs) {
    try {
      switch (p.type) {
        case 'STAMP_CARD':
          await handleStampCard(prisma, p, customer, order);
          break;
        case 'CASHBACK':
          await handleCashback(prisma, p, customer, order);
          break;
        case 'MILESTONE':
          await handleMilestone(prisma, p, customer);
          break;
        case 'STREAK':
          await handleStreak(prisma, p, customer);
          break;
        case 'WELCOME':
          await handleWelcome(prisma, p, customer);
          break;
        case 'REFERRAL':
          await handleReferral(prisma, p, customer, order);
          break;
        case 'HAPPY_HOUR_POINTS':
          await handleHappyHourPoints(prisma, p, customer, order);
          break;
        case 'PRODUCT_VIP':
          await handleProductVip(prisma, p, customer, order);
          break;
        // BIRTHDAY ve diğerleri günlük cron ile
      }
    } catch (e) {
      console.error(`[loyalty-engine] ${p.type} error`, e);
      // Diğer programlar etkilenmesin
    }
  }
}

// =====================================================
// BIRTHDAY CRON — günlük (sabah 09:00 gibi) çalışır
// =====================================================

export async function processBirthdayPrograms(prisma: PrismaClient): Promise<void> {
  const programs = await prisma.loyaltyProgram.findMany({
    where: { isActive: true, type: 'BIRTHDAY' },
  });
  if (programs.length === 0) return;

  const today = new Date();

  for (const p of programs) {
    const cfg = (p.config ?? {}) as any;
    const daysBefore = Number(cfg.daysBeforeBirthday ?? 0);
    const validDays = Number(cfg.validDays ?? 7);
    const discount = Number(cfg.discountPercent ?? 20);

    // Hedef tarih: bugün + daysBefore
    const target = new Date();
    target.setDate(today.getDate() + daysBefore);
    const targetMonth = target.getMonth() + 1;
    const targetDay = target.getDate();

    // Bugün doğum günü olan müşterileri bul
    const customers = await prisma.customer.findMany({
      where: {
        isVerified: true,
        birthDate: { not: null },
      },
    });

    for (const customer of customers) {
      if (!customer.birthDate) continue;
      const bd = new Date(customer.birthDate);
      if (bd.getMonth() + 1 !== targetMonth || bd.getDate() !== targetDay) continue;

      // Bu yıl daha kupon vermiş miyiz?
      const cur = await getOrCreateProgress(prisma, customer.id, p.id, { lastClaimedYear: null });
      const data = (cur.data as any) ?? {};
      if (data.lastClaimedYear === today.getFullYear()) continue;

      // Kupon yarat
      const code = generateCouponCode('BDAY');
      await prisma.coupon.create({
        data: {
          code,
          name: 'Doğum Günü İndirimi',
          description: 'Mutlu yıllar! 🎂',
          discountType: 'PERCENT',
          discountValue: discount,
          startDate: new Date(),
          endDate: new Date(Date.now() + validDays * 86400_000),
          usageLimit: 1,
          usagePerCustomer: 1,
          isActive: true,
          loyaltyTierIds: [],
        },
      });

      await updateProgress(prisma, customer.id, p.id, { lastClaimedYear: today.getFullYear() });

      await sendLoyaltyPush(
        prisma,
        customer.id,
        `🎂 İyi ki doğdun, ${customer.name ?? 'değerli müşterimiz'}!`,
        `%${discount} indirim kuponun hazır: ${code}`,
        { type: 'BIRTHDAY', code, route: '/loyalty' },
      );
    }
  }
}
