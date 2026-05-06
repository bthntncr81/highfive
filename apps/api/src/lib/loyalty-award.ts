// Sipariş tamamlandığında customer'a puan ekle
// Tetikleyici: order COMPLETED (POS) veya DELIVERED (kurye)
// Güvenli idempotent — çift puanlama yapmaz.

import type { PrismaClient, Order } from '@prisma/client';
import { sendPushToTokens } from './push';

export async function awardMobileOrderPoints(
  prisma: PrismaClient,
  order: Pick<Order, 'id' | 'orderNumber' | 'subtotal' | 'customerPhone'>,
): Promise<void> {
  // CustomerOrder bağlantısı var mı?
  const co = await prisma.customerOrder.findUnique({
    where: { orderId: order.id },
  });
  if (!co) return; // mobile dışı sipariş

  // Zaten puanlandı mı?
  if (co.pointsEarned > 0) return;

  const customer = await prisma.customer.findUnique({
    where: { id: co.customerId },
    include: { loyaltyTier: true },
  });
  if (!customer) return;

  const subtotal = Number(order.subtotal);
  const basePoints = Math.floor(subtotal / 10); // 10 ₺ = 1 puan
  const multiplier = customer.loyaltyTier?.pointsMultiplier
    ? Number(customer.loyaltyTier.pointsMultiplier)
    : 1;
  const finalPoints = Math.floor(basePoints * multiplier);

  if (finalPoints <= 0) return;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalPoints: { increment: finalPoints },
        lifetimePoints: { increment: finalPoints },
        totalSpent: { increment: subtotal },
        orderCount: { increment: 1 },
        lastOrderAt: new Date(),
      },
    }),
    prisma.pointsTransaction.create({
      data: {
        customerId: customer.id,
        orderId: order.id,
        points: finalPoints,
        type: 'EARN',
        description: `Sipariş #${order.orderNumber} — ${finalPoints} puan kazandın`,
      },
    }),
    prisma.customerOrder.update({
      where: { id: co.id },
      data: { pointsEarned: finalPoints },
    }),
  ]);

  // Tier upgrade kontrolü
  await maybeUpgradeTier(prisma, customer.id);

  // Push: puan kazandın bildirimi (notif prefs kontrolü)
  const prefs = await prisma.notificationPreference.findUnique({
    where: { customerId: customer.id },
  });
  const wantsLoyalty = !prefs || (prefs.pushEnabled && prefs.loyalty);
  if (wantsLoyalty) {
    const devices = await prisma.deviceToken.findMany({
      where: { customerId: customer.id, isActive: true },
      select: { token: true },
    });
    if (devices.length > 0) {
      await sendPushToTokens(devices.map((d) => d.token), {
        title: '⭐ Puan kazandın!',
        body: `#${order.orderNumber} siparişinden ${finalPoints} puan kazandın. Toplam: ${customer.totalPoints + finalPoints} puan.`,
        data: { type: 'LOYALTY_EARN', orderId: order.id, route: '/loyalty' },
      });
    }
  }
}

async function maybeUpgradeTier(prisma: PrismaClient, customerId: string): Promise<void> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return;

  const tiers = await prisma.loyaltyTier.findMany({
    where: { isActive: true },
    orderBy: { minPoints: 'desc' },
  });

  // Lifetime puana göre uygun en yüksek tier'ı bul
  const eligibleTier = tiers.find((t) => customer.lifetimePoints >= t.minPoints);
  if (!eligibleTier) return;
  if (customer.loyaltyTierId === eligibleTier.id) return;

  await prisma.customer.update({
    where: { id: customerId },
    data: { loyaltyTierId: eligibleTier.id },
  });

  // Push: tier upgrade
  const devices = await prisma.deviceToken.findMany({
    where: { customerId, isActive: true },
    select: { token: true },
  });
  if (devices.length > 0) {
    await sendPushToTokens(devices.map((d) => d.token), {
      title: `${eligibleTier.icon ?? '🏆'} ${eligibleTier.name} üyesi oldun!`,
      body: `Tebrikler! ${eligibleTier.name} üyeliği ile %${eligibleTier.discountPercent} indirim ve ${eligibleTier.pointsMultiplier}x puan kazanıyorsun.`,
      data: { type: 'TIER_UPGRADE', tierId: eligibleTier.id, route: '/loyalty' },
    });
  }
}
