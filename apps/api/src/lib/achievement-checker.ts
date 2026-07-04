import type { DbLike } from './tenant-db';
// Achievement Auto-Unlock — sipariş tamamlandığında customer'ın açabileceği
// rozetleri otomatik unlock eder. Yeni unlock olan rozetler için push gönderir.
//
// Kullanım: awardMobileOrderPoints sonrasında çağrılır (Customer.orderCount,
// totalSpent vb. zaten güncel). Yeni rozetler için CustomerAchievement.create.
//
// Tüm logic SERVER-SIDE. Client manipule edemez.

import { sendPushToTokens } from './push';

type Criteria = Record<string, any>;

/**
 * Customer için tüm aktif achievement'ları kontrol et, kazanılanları unlock et.
 * Yeni unlock olan rozetler döner.
 */
export async function checkAchievementsForCustomer(
  prisma: DbLike,
  customerId: string,
): Promise<{ id: string; key: string; name: string; icon: string; rewardPoints: number }[]> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      orderCount: true,
      totalSpent: true,
      currentStreak: true,
      longestStreak: true,
      referralCount: true,
      lifetimePoints: true,
    },
  });
  if (!customer) return [];

  const all = await prisma.achievement.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  const already = await prisma.customerAchievement.findMany({
    where: { customerId },
    select: { achievementId: true },
  });
  const alreadySet = new Set(already.map((a) => a.achievementId));

  const newly: typeof all = [];

  for (const a of all) {
    if (alreadySet.has(a.id)) continue;

    const c = a.criteria as Criteria;
    let unlock = false;

    switch (a.type) {
      case 'ORDER_COUNT':
        unlock = (customer.orderCount ?? 0) >= (c.threshold ?? Infinity);
        break;
      case 'TOTAL_SPENT':
        unlock = Number(customer.totalSpent ?? 0) >= (c.threshold ?? Infinity);
        break;
      case 'STREAK':
        unlock =
          (customer.longestStreak ?? customer.currentStreak ?? 0) >= (c.days ?? Infinity);
        break;
      case 'REFERRAL_COUNT':
        unlock = (customer.referralCount ?? 0) >= (c.threshold ?? Infinity);
        break;
      case 'CATEGORY_MASTER': {
        // Bu kategoriden kaç ürün sipariş edildi? (CustomerOrder.orderId üzerinden)
        const cat = c.categoryId;
        const needed = c.count ?? Infinity;
        if (!cat) break;
        const myOrders = await prisma.customerOrder.findMany({
          where: { customerId },
          select: { orderId: true },
        });
        const orderIds = myOrders.map((o) => o.orderId);
        if (orderIds.length === 0) break;
        const count = await prisma.orderItem.count({
          where: {
            orderId: { in: orderIds },
            menuItem: { categoryId: cat },
            order: { status: { in: ['COMPLETED', 'DELIVERED', 'SERVED'] } },
          },
        });
        unlock = count >= needed;
        break;
      }
      case 'TIME_BASED': {
        // Belirli saat aralığında kaç sipariş?
        // hourStart, hourEnd (24h modu, hourEnd > 24 ise next day'e geçer, modulo 24)
        const hourStart = c.hourStart ?? 0;
        const hourEnd = c.hourEnd ?? 24;
        const needed = c.count ?? Infinity;
        const co = await prisma.customerOrder.findMany({
          where: { customerId },
          select: { createdAt: true },
        });
        const inRange = co.filter((o) => {
          const h = o.createdAt.getHours();
          if (hourEnd > 24) {
            return h >= hourStart || h < (hourEnd - 24);
          }
          return h >= hourStart && h < hourEnd;
        });
        unlock = inRange.length >= needed;
        break;
      }
      case 'SPIN_WIN': {
        const minDiscount = c.minDiscount ?? Infinity;
        const wins = await prisma.spinAttempt.findMany({
          where: { customerId, prizeType: 'DISCOUNT_PERCENT' },
          select: { prizeValue: true },
        });
        unlock = wins.some((w) => Number(w.prizeValue ?? 0) >= minDiscount);
        break;
      }
      default:
        break;
    }

    if (unlock) {
      // Unlock + ödül puanı (varsa) ekle
      await prisma.$transaction([
        prisma.customerAchievement.create({
          data: { customerId, achievementId: a.id },
        }),
        ...(a.rewardPoints > 0
          ? [
              prisma.customer.update({
                where: { id: customerId },
                data: {
                  totalPoints: { increment: a.rewardPoints },
                  lifetimePoints: { increment: a.rewardPoints },
                },
              }),
              prisma.pointsTransaction.create({
                data: {
                  customerId,
                  points: a.rewardPoints,
                  type: 'BONUS',
                  description: `Rozet açıldı: ${a.name}`,
                },
              }),
            ]
          : []),
      ]);
      newly.push(a);
    }
  }

  // Push bildirim (en fazla 3 rozet bir araya — spam değil)
  if (newly.length > 0) {
    const tokens = await prisma.deviceToken.findMany({
      where: {
        customerId,
        isActive: true,
        NOT: { token: { startsWith: 'nopush-' } },
      },
      select: { token: true },
    });
    if (tokens.length > 0) {
      const titles = newly.slice(0, 3).map((a) => `${a.icon} ${a.name}`).join(', ');
      await sendPushToTokens(tokens.map((t) => t.token), {
        title:
          newly.length === 1
            ? `${newly[0].icon} Yeni rozet açıldı!`
            : `🏆 ${newly.length} yeni rozet açıldı!`,
        body:
          newly.length === 1
            ? `"${newly[0].name}" rozetini kazandın!${
                newly[0].rewardPoints > 0 ? ` +${newly[0].rewardPoints} puan` : ''
              }`
            : titles,
        data: { type: 'ACHIEVEMENT_UNLOCK', route: '/achievements' },
      }).catch(() => {});
    }
  }

  return newly.map((a) => ({
    id: a.id,
    key: a.key,
    name: a.name,
    icon: a.icon,
    rewardPoints: a.rewardPoints,
  }));
}
