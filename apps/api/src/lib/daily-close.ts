// Daily auto-close — her gece 00:00'da çalışır:
//   - Bir önceki gün açılmış ve hala tamamlanmamış (PENDING, CONFIRMED,
//     PREPARING, READY, SERVED) tüm siparişleri COMPLETED yapar.
//   - Bu siparişlerin bağlı olduğu DINE_IN masalarını FREE'ye çeker.
//   - Ödeme durumuna (paymentStatus) DOKUNMAZ — gerçekten ödenmemişse
//     gün sonu raporunda görünür.
//
// Restoran context: müşteri gittiğinde garson "ödendi" tuşuna basmayı
// unutursa veya masada saat 12'yi geçen siparişler kalırsa, ertesi gün
// POS açıldığında masalar temiz olur.

import { PrismaClient, OrderStatus, TableStatus } from '@prisma/client';

const OPEN_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

export async function closeOpenOrdersAtEndOfDay(prisma: PrismaClient): Promise<{
  closedOrderIds: string[];
  freedTableIds: string[];
}> {
  // Bugünün 00:00:00'ı (server saatine göre)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Bugünden önce oluşturulup hala tamamlanmamış siparişler
  const openOrders = await prisma.order.findMany({
    where: {
      status: { in: OPEN_STATUSES },
      createdAt: { lt: startOfToday },
    },
    select: { id: true, tableId: true, orderNumber: true },
  });

  if (openOrders.length === 0) {
    return { closedOrderIds: [], freedTableIds: [] };
  }

  const orderIds = openOrders.map((o) => o.id);
  const tableIdsRaw = openOrders.map((o) => o.tableId).filter((x): x is string => !!x);
  const tableIds = Array.from(new Set(tableIdsRaw));

  await prisma.$transaction([
    // Siparişleri COMPLETED'a çek
    prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      },
    }),
    // Eğer ilgili masada başka açık sipariş yoksa masayı FREE yap
    // (önce hepsini güncelle, sonra yeniden değerlendirmek yerine
    //  basit yaklaşım: doğrudan FREE — açık sipariş kalsaydı zaten
    //  yukarıdaki updateMany onu da kapatırdı çünkü hepsi <bugün)
    ...tableIds.map((tableId) =>
      prisma.table.update({
        where: { id: tableId },
        data: { status: TableStatus.FREE },
      }),
    ),
  ]);

  console.log(
    `[daily-close] ${openOrders.length} sipariş COMPLETED, ${tableIds.length} masa FREE yapıldı.`,
    openOrders.map((o) => `#${o.orderNumber}`).join(', '),
  );

  return { closedOrderIds: orderIds, freedTableIds: tableIds };
}

/**
 * Server başlatıldığında çağrılır. Her dakikada bir saat kontrolü
 * yapar; saat 00:00-00:00'a girince closeOpenOrdersAtEndOfDay çalışır.
 * (Cron paketi import etmek istemediğim için basit polling.)
 *
 * Aynı gün içinde iki kere çalışmasın diye `lastRunDay` cache'i tutulur.
 */
let lastRunDay: string | null = null;

export function startDailyCloseScheduler(prisma: PrismaClient): NodeJS.Timeout {
  return setInterval(async () => {
    const now = new Date();
    // Gece 00:00 — 00:04 arasıysa tetikle (5 dakikalık güvenli pencere)
    if (now.getHours() !== 0 || now.getMinutes() > 4) return;

    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (lastRunDay === dayKey) return; // bugün için zaten çalıştı

    lastRunDay = dayKey;
    try {
      await closeOpenOrdersAtEndOfDay(prisma);
    } catch (err) {
      console.error('[daily-close] tick failed:', err);
    }
  }, 60_000); // her dakika kontrol
}
