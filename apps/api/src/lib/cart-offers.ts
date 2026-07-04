import type { DbLike } from './tenant-db';
// Cart Offers — sepete uygun en avantajlı sadakat programı/kuponu hesaplar
// Stacking yok: birden çok program uygunsa, indirim değeri en yüksek olan seçilir.


export type CartItem = {
  menuItemId: string;
  quantity: number;
  unitPrice: number; // ₺
};

export type CartOffer = {
  source: 'PROGRAM' | 'COUPON' | 'TIER';
  programId?: string;
  programType?: string;
  couponId?: string;
  couponCode?: string;
  name: string;
  description?: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  // Hesaplanmış indirim tutarı (₺) — comparison için
  calculatedDiscount: number;
  // Ne kaldı / koşul (UI için)
  meta?: any;
};

const MAX_DISCOUNT_PCT = 0.5; // güvenlik: %50'den fazla indirim yok

function calcDiscount(
  type: 'PERCENT' | 'FIXED',
  value: number,
  subtotal: number,
  maxDiscount?: number | null,
): number {
  let d = 0;
  if (type === 'PERCENT') d = subtotal * (value / 100);
  else d = value;
  if (maxDiscount && d > maxDiscount) d = maxDiscount;
  const cap = subtotal * MAX_DISCOUNT_PCT;
  if (d > cap) d = cap;
  return Math.max(0, Math.round(d * 100) / 100);
}

/**
 * Sepete uygun tüm sadakat tekliflerini değerlendir
 * Döner: { bestOffer (en avantajlı), allOffers (görsel için sıralı liste) }
 */
export async function evaluateCartOffers(
  prisma: DbLike,
  customerId: string | null,
  cart: CartItem[],
): Promise<{ bestOffer: CartOffer | null; allOffers: CartOffer[] }> {
  const subtotal = cart.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  if (subtotal <= 0) return { bestOffer: null, allOffers: [] };

  const offers: CartOffer[] = [];

  const customer = customerId
    ? await prisma.customer.findUnique({
        where: { id: customerId },
        include: { loyaltyTier: true },
      })
    : null;

  // 1) Aktif kuponlar (kullanıcının elinde olan)
  if (customer) {
    const usableCoupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });

    for (const c of usableCoupons) {
      // Min purchase kontrolü
      if (c.minPurchase && subtotal < Number(c.minPurchase)) continue;
      // Loyalty tier kontrolü
      if (c.loyaltyTierIds.length > 0 && !c.loyaltyTierIds.includes(customer.loyaltyTierId ?? '')) continue;
      // Kullanım sayısı kontrolü
      if (c.usageLimit && c.currentUsage >= c.usageLimit) continue;
      const usageCount = await prisma.couponUsage.count({
        where: { couponId: c.id, customerId: customer.id },
      });
      if (usageCount >= c.usagePerCustomer) continue;
      // İlk sipariş kontrolü
      if (c.isFirstOrder && customer.orderCount > 0) continue;

      const type = (c.discountType as 'PERCENT' | 'FIXED') ?? 'PERCENT';
      const value = Number(c.discountValue);
      const calc = calcDiscount(type, value, subtotal, c.maxDiscount ? Number(c.maxDiscount) : null);
      if (calc > 0) {
        offers.push({
          source: 'COUPON',
          couponId: c.id,
          couponCode: c.code,
          name: c.name,
          description: c.description ?? undefined,
          discountType: type,
          discountValue: value,
          calculatedDiscount: calc,
        });
      }
    }
  }

  // 2) Tier discount (otomatik)
  if (customer?.loyaltyTier) {
    const tierDiscount = Number(customer.loyaltyTier.discountPercent ?? 0);
    if (tierDiscount > 0) {
      const calc = calcDiscount('PERCENT', tierDiscount, subtotal);
      offers.push({
        source: 'TIER',
        name: `${customer.loyaltyTier.name} Tier İndirimi`,
        description: `%${tierDiscount} otomatik tier indirimi`,
        discountType: 'PERCENT',
        discountValue: tierDiscount,
        calculatedDiscount: calc,
        meta: { tierId: customer.loyaltyTier.id },
      });
    }
  }

  // 3) Aktif sadakat programlarından otomatik uygulananlar
  //    (HAPPY_HOUR_POINTS gibi puan-bazlı olanlar değil, indirim verebilenler)
  const programs = await prisma.loyaltyProgram.findMany({
    where: { isActive: true },
  });

  for (const p of programs) {
    const cfg = (p.config ?? {}) as any;

    // WELCOME — kullanıcı ilk siparişi vermemiş, % veya ₺ indirim varsa
    if (p.type === 'WELCOME' && customer && customer.orderCount === 0) {
      const type: 'PERCENT' | 'FIXED' = cfg.discountType === 'FIXED' ? 'FIXED' : 'PERCENT';
      const value =
        type === 'PERCENT'
          ? Number(cfg.discountPercent ?? 0)
          : Number(cfg.discountValue ?? 0);
      const minOrder = Number(cfg.minOrder ?? 0);
      if (value > 0 && subtotal >= minOrder) {
        const calc = calcDiscount(type, value, subtotal);
        offers.push({
          source: 'PROGRAM',
          programId: p.id,
          programType: p.type,
          name: p.name,
          description: 'Hoş Geldin teklifin',
          discountType: type,
          discountValue: value,
          calculatedDiscount: calc,
        });
      }
    }

    // REFERRAL — bu müşteri davet edildi, ilk siparişi
    if (p.type === 'REFERRAL' && customer && customer.referredByCode && customer.orderCount === 0) {
      const type: 'PERCENT' | 'FIXED' = cfg.refereeDiscountType === 'FIXED' ? 'FIXED' : 'PERCENT';
      const value =
        type === 'PERCENT'
          ? Number(cfg.refereeDiscount ?? 15)
          : Number(cfg.refereeFixedAmount ?? 25);
      const minOrder = Number(cfg.minOrderForReward ?? 0);
      if (value > 0 && subtotal >= minOrder) {
        const calc = calcDiscount(type, value, subtotal);
        offers.push({
          source: 'PROGRAM',
          programId: p.id,
          programType: p.type,
          name: 'Davet İndirimi',
          description: 'Davet edildiğin için ilk siparişine özel',
          discountType: type,
          discountValue: value,
          calculatedDiscount: calc,
        });
      }
    }
  }

  // En avantajlı tek teklif (stacking yok)
  offers.sort((a, b) => b.calculatedDiscount - a.calculatedDiscount);
  const bestOffer = offers[0] ?? null;

  return { bestOffer, allOffers: offers };
}
