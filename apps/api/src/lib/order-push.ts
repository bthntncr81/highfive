import type { DbLike } from './tenant-db';
// Order lifecycle push notifications (müşteri mobil uygulamasına)
// orders.ts içinde status değişimi sonrası çağrılır.

import type { Order } from '@prisma/client';
import { sendPushToTokens } from './push';

type OrderStatusKey =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SERVED';

const STATUS_TEMPLATES: Record<
  OrderStatusKey,
  { title: string; body: (orderNumber: number | string) => string } | null
> = {
  PENDING: {
    title: '📥 Sipariş alındı',
    body: (n) => `#${n} numaralı siparişin alındı, onay bekliyor.`,
  },
  CONFIRMED: {
    title: '✅ Sipariş onaylandı',
    body: (n) => `#${n} numaralı siparişin onaylandı, hazırlanmaya başlıyor.`,
  },
  PREPARING: {
    title: '👨‍🍳 Sipariş hazırlanıyor',
    body: (n) => `#${n} numaralı siparişin mutfakta hazırlanıyor.`,
  },
  READY: {
    title: '🛎️ Sipariş hazır',
    body: (n) => `#${n} numaralı siparişin hazır! Afiyet olsun.`,
  },
  OUT_FOR_DELIVERY: {
    title: '🛵 Kurye yola çıktı',
    body: (n) => `#${n} numaralı siparişin için kurye yolda.`,
  },
  DELIVERED: {
    title: '🎉 Sipariş teslim edildi',
    body: (n) => `#${n} numaralı siparişin teslim edildi. Afiyet olsun!`,
  },
  COMPLETED: null, // sessiz
  CANCELLED: {
    title: '❌ Sipariş iptal edildi',
    body: (n) => `#${n} numaralı siparişin iptal edildi.`,
  },
  SERVED: {
    title: '🍽️ Servis edildi',
    body: (n) => `#${n} numaralı siparişin servis edildi. Afiyet olsun!`,
  },
};

// Müşteriye bağlı aktif device token'ları getir (telefon match veya CustomerOrder bağlantısı)
async function findCustomerTokensForOrder(
  prisma: DbLike,
  order: Pick<Order, 'id' | 'customerPhone'>,
): Promise<{ tokens: string[]; customerId: string | null }> {
  // 1) CustomerOrder üzerinden direct bağ
  const customerOrder = await prisma.customerOrder.findUnique({
    where: { orderId: order.id },
  });

  let customerId: string | null = customerOrder?.customerId ?? null;

  // 2) Telefon match (siparişi POS açtıysa veya guest ise)
  if (!customerId && order.customerPhone) {
    const phoneNorm = normalizePhone(order.customerPhone);
    if (phoneNorm) {
      const customer = await prisma.customer.findUnique({
        where: { phone: phoneNorm },
        select: { id: true },
      });
      customerId = customer?.id ?? null;
    }
  }

  if (!customerId) return { tokens: [], customerId: null };

  const devices = await prisma.deviceToken.findMany({
    where: {
      customerId,
      isActive: true,
      NOT: { token: { startsWith: 'nopush-' } },
    },
    select: { token: true },
  });

  return { tokens: devices.map((d) => d.token), customerId };
}

function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  let p = digits;
  if (p.startsWith('90') && p.length === 12) p = p.slice(2);
  if (p.startsWith('0') && p.length === 11) p = p.slice(1);
  if (p.length !== 10 || !p.startsWith('5')) return null;
  return p;
}

export async function sendOrderStatusPush(
  prisma: DbLike,
  order: Pick<Order, 'id' | 'orderNumber' | 'customerPhone' | 'status'>,
  status: string,
): Promise<void> {
  const template = STATUS_TEMPLATES[status as OrderStatusKey];
  if (!template) return;

  const { tokens } = await findCustomerTokensForOrder(prisma, order);
  if (tokens.length === 0) return;

  await sendPushToTokens(tokens, {
    title: template.title,
    body: template.body(order.orderNumber),
    data: {
      type: 'ORDER_STATUS',
      orderId: order.id,
      orderNumber: order.orderNumber,
      status,
      route: `/orders/${order.id}`,
    },
  });
}

// Yeni sipariş oluşturulduğunda (mobile veya başka source)
export async function sendOrderCreatedPush(
  prisma: DbLike,
  order: Pick<Order, 'id' | 'orderNumber' | 'customerPhone' | 'status'>,
): Promise<void> {
  await sendOrderStatusPush(prisma, order, 'PENDING');
}
