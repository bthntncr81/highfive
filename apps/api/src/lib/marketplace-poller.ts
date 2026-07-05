// ============================================================================
// Pazar yeri poller'ı — TGO paketlerini çekip mevcut sipariş hattına enjekte eder.
// ============================================================================
// Akış (30 sn'de bir, main.ts'ten startMarketplacePoller ile):
//   1. Aktif TRENDYOL_GO bağlantıları platform client'tan (owner) listelenir.
//   2. Her bağlantı için Created + Cancelled + UnSupplied paketleri poll edilir.
//   3. Yeni Created paket → normalize → Order oluştur (external.ts hattıyla aynı:
//      items, totals, stok düşümü, broadcastNewOrder) → TGO'ya pushPicked (kabul).
//   4. Bilinen siparişin paketi Cancelled/UnSupplied veya cancelInfo dolu →
//      CANCELLED + broadcastOrderUpdate.
//   5. İdempotency: externalOrderId ("tgo:{packageId}") — aynı paket iki kez
//      işlenmez. Hatalar connection.lastError'a yazılır, sweep ASLA ölmez.

import { OrderStatus, OrderType, PaymentStatus, PrismaClient } from '@prisma/client';
import type { MarketplaceConnection } from '@prisma/client';
import { dbFor, TenantDb } from './tenant-db';
import type { DbLike } from './tenant-db';
import { broadcastNewOrder, broadcastOrderUpdate } from '../websocket';
import { notifyNewOrder } from './order-notify';
import { fetchPackages, normalizePackage, pushPicked, NormalizedTgoOrder, TgoPackage } from './tgo-adapter';

const POLL_INTERVAL_MS = 30_000;
// Created dışındakiler bilinen siparişlerin iptal takibi için (blueprint 2.2.1:
// kabul edilmeyen sipariş platform tarafından reasonCode 625 ile Cancelled olur).
const POLL_STATUSES = ['Created', 'Cancelled', 'UnSupplied'];

// Sipariş verildiğinde ham madde stoklarını düş (external.ts ile aynı davranış)
async function deductRawMaterialStock(
  db: DbLike,
  orderItems: { menuItemId: string; quantity: number }[],
): Promise<void> {
  try {
    for (const orderItem of orderItems) {
      const ingredients = await db.menuItemIngredient.findMany({
        where: { menuItemId: orderItem.menuItemId },
        include: { rawMaterial: true },
      });
      for (const ingredient of ingredients) {
        const deductAmount = Number(ingredient.amount) * orderItem.quantity;
        if (deductAmount <= 0) continue;
        const currentStock = Number(ingredient.rawMaterial.currentStock);
        const newStock = Math.max(0, currentStock - deductAmount);
        await db.rawMaterial.update({
          where: { id: ingredient.rawMaterialId },
          data: { currentStock: newStock },
        });
      }
    }
  } catch (error) {
    console.error('❌ [Marketplace] Ham madde stok düşüm hatası:', error);
  }
}

// Normalize edilmiş TGO siparişini Order + OrderItem olarak oluştur ve yayınla.
async function createOrderFromNormalized(db: TenantDb, normalized: NormalizedTgoOrder) {
  const order = await db.order.create({
    data: {
      customerName: normalized.customerName,
      customerPhone: normalized.customerPhone,
      customerAddress: normalized.customerAddress,
      type: normalized.orderType === 'TAKEAWAY' ? OrderType.TAKEAWAY : OrderType.DELIVERY,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: normalized.paymentMethod,
      subtotal: normalized.subtotal,
      tax: 0,
      total: normalized.total,
      discount: 0,
      deliveryFee: 0,
      notes: normalized.notes,
      source: 'TRENDYOL_GO',
      externalOrderId: normalized.externalOrderId,
      items: {
        create: normalized.items.map((item) => ({
          menuItemId: item.menuItemId,
          menuItemName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          notes: item.notes,
          modifiers: item.modifiers,
          meta: item.meta, // packageItemId'ler — kısmi iptal (unsupplied) için zorunlu
        })),
      },
    },
    include: {
      table: true,
      items: { include: { menuItem: true } },
    },
  });

  // Eşlenmiş kalemler için ham madde stoğu düş (external.ts davranışı)
  const mappedItems = normalized.items
    .filter((i): i is typeof i & { menuItemId: string } => !!i.menuItemId)
    .map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity }));
  if (mappedItems.length) await deductRawMaterialStock(db, mappedItems);

  broadcastNewOrder(order);
  notifyNewOrder(db, order.id).catch(() => {});
  return order;
}

// Tek bağlantı için poll → sipariş oluştur/iptal et. Hata mesajı döner (yoksa null).
async function pollConnection(conn: MarketplaceConnection): Promise<string | null> {
  const db = dbFor(conn.tenantId);
  const errors: string[] = [];

  const packages = await fetchPackages(conn, POLL_STATUSES);

  // Eşleme tablosu: platformProductId → menuItemId
  const mappings = await db.marketplaceProductMapping.findMany({
    where: { platform: 'TRENDYOL_GO' },
    select: { platformProductId: true, menuItemId: true },
  });
  const mapping = new Map(mappings.map((m) => [m.platformProductId, m.menuItemId]));

  for (const pkg of packages) {
    try {
      const externalOrderId = `tgo:${pkg.id}`;
      const existing = await db.order.findFirst({
        where: { externalOrderId },
        select: { id: true, status: true, orderNumber: true, tenantId: true },
      });

      const isCancelled =
        pkg.packageStatus === 'Cancelled' || pkg.packageStatus === 'UnSupplied' || !!pkg.cancelInfo;

      if (isCancelled) {
        // Bilinen siparişi iptale çek (bizim başlattığımız unsupplied ise idempotent geçer)
        if (existing && existing.status !== OrderStatus.CANCELLED) {
          const cancelled = await db.order.update({
            where: { id: existing.id },
            data: { status: OrderStatus.CANCELLED },
            include: { items: { include: { menuItem: true } }, table: true },
          });
          broadcastOrderUpdate(cancelled);
          const reason = pkg.cancelInfo?.reasonCode
            ? ` (TGO sebep kodu ${pkg.cancelInfo.reasonCode})`
            : '';
          console.log(
            `🛑 [Marketplace] TGO iptali işlendi: #${existing.orderNumber}${reason}`,
          );
        }
        continue; // iptalli paketten yeni sipariş OLUŞTURULMAZ
      }

      if (pkg.packageStatus !== 'Created' || existing) continue; // idempotency

      const normalized = normalizePackage(pkg, mapping);
      const order = await createOrderFromNormalized(db, normalized);
      console.log(
        `🛒 [Marketplace] TGO siparişi oluşturuldu: #${order.orderNumber} (${normalized.externalOrderId})`,
      );

      if (normalized.unmappedProducts.length) {
        errors.push(
          `Eşlenmemiş TGO ürünü: ${normalized.unmappedProducts
            .map((u) => `${u.name} (${u.platformProductId})`)
            .join(', ')} — sipariş #${order.orderNumber} fallback adla oluşturuldu`,
        );
      }

      // Kabul bildirimi (Created → Picking). Başarısızlığı sipariş akışını bozmaz.
      try {
        await pushPicked(conn, pkg.id, normalized.preparationTime);
      } catch (err: any) {
        errors.push(`pushPicked başarısız (${pkg.id}): ${err?.message || err}`);
      }
    } catch (err: any) {
      errors.push(`Paket işlenemedi (${(pkg as TgoPackage)?.id || '?'}): ${err?.message || err}`);
    }
  }

  return errors.length ? errors.join(' | ').slice(0, 1000) : null;
}

/**
 * Tüm aktif TRENDYOL_GO bağlantılarını tara. Bağlantı başına hata yalıtımı:
 * hata connection.lastError'a yazılır, sweep diğer bağlantılarla devam eder.
 */
export async function runTgoPollSweep(prisma: PrismaClient): Promise<void> {
  const connections = await prisma.marketplaceConnection.findMany({
    where: { platform: 'TRENDYOL_GO', isActive: true },
  });

  for (const conn of connections) {
    try {
      const error = await pollConnection(conn);
      await prisma.marketplaceConnection.update({
        where: { id: conn.id },
        data: { lastPolledAt: new Date(), lastError: error },
      });
    } catch (err: any) {
      // fetchPackages / mapping okuma katmanı hatası — bağlantıya yaz, devam et
      await prisma.marketplaceConnection
        .update({
          where: { id: conn.id },
          data: {
            lastPolledAt: new Date(),
            lastError: String(err?.message || err).slice(0, 1000),
          },
        })
        .catch(() => {});
      console.error(`❌ [Marketplace] TGO poll hatası (tenant ${conn.tenantId}):`, err);
    }
  }
}

/** 30 sn'de bir TGO sweep'i — main.ts'ten diğer scheduler'ların yanına kaydedilir. */
export function startMarketplacePoller(
  prisma: PrismaClient,
  log: (msg: string, err?: unknown) => void,
): void {
  let running = false; // uzun süren sweep'te üst üste binmeyi engelle
  setInterval(() => {
    if (running) return;
    running = true;
    runTgoPollSweep(prisma)
      .catch((e) => log('[marketplace-poller] sweep failed', e))
      .finally(() => {
        running = false;
      });
  }, POLL_INTERVAL_MS);
  log('[marketplace-poller] TGO poller başlatıldı (30 sn aralık)');
}
