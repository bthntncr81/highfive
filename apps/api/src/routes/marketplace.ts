// ============================================================================
// Pazar yeri "Bağlan" akışı — Trendyol GO (TGO) tenant self-servis uçları.
// ============================================================================
// integrations.ts'teki WhatsApp connect/status/disconnect deseninin pazar yeri
// karşılığı. Tüm uçlar verifyAdmin + requireFeature('marketplace') arkasında.
// Sipariş çekme işini routes değil, lib/marketplace-poller.ts yapar; burada
// yalnız bağlantı yönetimi + ürün eşleme (mapping) CRUD'u vardır.

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MarketplacePlatform } from '@prisma/client';
import { verifyAdmin } from '../middleware/auth';
import { requireFeature } from '../lib/plan-limits';
import { fetchProducts, tgoRequest, TgoConnectionInfo } from '../lib/tgo-adapter';

const PLATFORM = MarketplacePlatform.TRENDYOL_GO;

const maskKey = (key: string) => `****${key.slice(-4)}`;

// TGO ürün yanıtı şekli değişebilir — id alanını toleranslı çöz
const productIdOf = (p: any): string => String(p?.id ?? p?.productId ?? '');
const productNameOf = (p: any): string => String(p?.name ?? p?.title ?? '');

export default async function marketplaceRoutes(server: FastifyInstance) {
  const guards = { preHandler: [verifyAdmin, requireFeature('marketplace')] };

  // Bağlan — canlı doğrulama (packages GET) + MarketplaceConnection upsert
  server.post('/tgo/connect', guards, async (request: FastifyRequest, reply: FastifyReply) => {
    const { supplierId, apiKey, apiSecret, storeId, executorEmail } = (request.body ?? {}) as {
      supplierId?: string | number;
      apiKey?: string;
      apiSecret?: string;
      storeId?: string | number;
      executorEmail?: string;
    };

    if (!supplierId || !apiKey || !apiSecret) {
      return reply.status(400).send({ error: 'supplierId, apiKey ve apiSecret zorunlu' });
    }

    const connInfo: TgoConnectionInfo = {
      supplierId: String(supplierId),
      apiKey,
      apiSecret,
      storeId: storeId !== undefined && storeId !== null ? String(storeId) : null,
      executorEmail: executorEmail || null,
    };

    // Canlı doğrulama: kimlik bilgileri gerçekten çalışıyor mu?
    try {
      await tgoRequest(
        connInfo,
        'GET',
        `order/meal/suppliers/${connInfo.supplierId}/packages?page=0&size=1`,
      );
    } catch (err: any) {
      return reply.status(400).send({
        error: 'TGO bağlantı doğrulaması başarısız — kimlik bilgilerini kontrol edin',
        detail: String(err?.message || err).slice(0, 300),
      });
    }

    const existing = await request.db.marketplaceConnection.findFirst({
      where: { platform: PLATFORM },
    });
    const data = {
      supplierId: connInfo.supplierId,
      apiKey,
      apiSecret,
      storeId: connInfo.storeId,
      executorEmail: connInfo.executorEmail,
      isActive: true,
      lastError: null,
    };
    const connection = existing
      ? await request.db.marketplaceConnection.update({ where: { id: existing.id }, data })
      : await request.db.marketplaceConnection.create({ data: { ...data, platform: PLATFORM } });

    return {
      success: true,
      connected: true,
      connectionId: connection.id,
      platform: connection.platform,
      supplierId: connection.supplierId,
      storeId: connection.storeId,
      apiKeyMasked: maskKey(connection.apiKey),
    };
  });

  // Durum — bağlantı özeti (apiKey maskeli) + eşleme sayıları
  server.get('/tgo/status', guards, async (request: FastifyRequest) => {
    const connection = await request.db.marketplaceConnection.findFirst({
      where: { platform: PLATFORM },
    });
    if (!connection) return { connected: false };

    const mappedProductCount = await request.db.marketplaceProductMapping.count({
      where: { platform: PLATFORM },
    });

    // Eşlenmemiş sayısı canlı TGO menüsünden hesaplanır — ulaşılamazsa null
    let unmappedProductCount: number | null = null;
    if (connection.isActive && connection.storeId) {
      try {
        const products = await fetchProducts(connection);
        const mappings = await request.db.marketplaceProductMapping.findMany({
          where: { platform: PLATFORM },
          select: { platformProductId: true },
        });
        const mappedIds = new Set(mappings.map((m) => m.platformProductId));
        unmappedProductCount = products.filter((p) => !mappedIds.has(productIdOf(p))).length;
      } catch {
        unmappedProductCount = null;
      }
    }

    return {
      connected: connection.isActive,
      connectionId: connection.id,
      platform: connection.platform,
      supplierId: connection.supplierId,
      storeId: connection.storeId,
      executorEmail: connection.executorEmail,
      apiKeyMasked: maskKey(connection.apiKey),
      lastPolledAt: connection.lastPolledAt?.toISOString() || null,
      lastError: connection.lastError,
      mappedProductCount,
      unmappedProductCount,
    };
  });

  // Bağlantıyı kes — poller bu bağlantıyı taramayı bırakır
  server.post('/tgo/disconnect', guards, async (request: FastifyRequest) => {
    const connection = await request.db.marketplaceConnection.findFirst({
      where: { platform: PLATFORM },
    });
    if (connection) {
      await request.db.marketplaceConnection.update({
        where: { id: connection.id },
        data: { isActive: false },
      });
    }
    return { success: true, connected: false };
  });

  // TGO menüsü + mevcut eşlemeler — eşleme UI'ının veri kaynağı
  server.get('/tgo/products', guards, async (request: FastifyRequest, reply: FastifyReply) => {
    const connection = await request.db.marketplaceConnection.findFirst({
      where: { platform: PLATFORM },
    });
    if (!connection) {
      return reply.status(400).send({ error: 'TGO bağlantısı yok — önce bağlanın' });
    }
    if (!connection.storeId) {
      return reply
        .status(400)
        .send({ error: 'TGO ürün listesi için storeId gerekli — bağlantıya storeId ekleyin' });
    }

    let products: any[];
    try {
      products = await fetchProducts(connection);
    } catch (err: any) {
      return reply.status(502).send({
        error: 'TGO menüsü çekilemedi',
        detail: String(err?.message || err).slice(0, 300),
      });
    }

    const mappings = await request.db.marketplaceProductMapping.findMany({
      where: { platform: PLATFORM },
      include: { menuItem: { select: { id: true, name: true } } },
    });
    const byPlatformId = new Map(mappings.map((m) => [m.platformProductId, m]));

    const merged = products.map((p) => {
      const pid = productIdOf(p);
      const mapping = byPlatformId.get(pid);
      return {
        platformProductId: pid,
        name: productNameOf(p),
        price: p?.price ?? p?.sellingPrice ?? null,
        status: p?.status ?? null,
        mapped: !!mapping,
        menuItemId: mapping?.menuItemId ?? null,
        menuItemName: mapping?.menuItem?.name ?? null,
      };
    });

    return {
      products: merged,
      totalCount: merged.length,
      mappedCount: merged.filter((p) => p.mapped).length,
      unmappedCount: merged.filter((p) => !p.mapped).length,
    };
  });

  // Toplu eşleme upsert — {mappings: [{platformProductId, menuItemId, platformProductName?}]}
  server.put('/tgo/mappings', guards, async (request: FastifyRequest, reply: FastifyReply) => {
    const { mappings } = (request.body ?? {}) as {
      mappings?: Array<{
        platformProductId?: string | number;
        menuItemId?: string;
        platformProductName?: string;
      }>;
    };
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return reply.status(400).send({ error: 'mappings dizisi zorunlu' });
    }

    let upserted = 0;
    const errors: string[] = [];

    for (const entry of mappings) {
      const platformProductId =
        entry.platformProductId !== undefined && entry.platformProductId !== null
          ? String(entry.platformProductId)
          : '';
      if (!platformProductId || !entry.menuItemId) {
        errors.push('platformProductId ve menuItemId zorunlu — kayıt atlandı');
        continue;
      }

      const menuItem = await request.db.menuItem.findFirst({
        where: { id: entry.menuItemId },
        select: { id: true },
      });
      if (!menuItem) {
        errors.push(`Menü ürünü bulunamadı: ${entry.menuItemId} (${platformProductId} atlandı)`);
        continue;
      }

      const existing = await request.db.marketplaceProductMapping.findFirst({
        where: { platform: PLATFORM, platformProductId },
      });
      if (existing) {
        await request.db.marketplaceProductMapping.update({
          where: { id: existing.id },
          data: {
            menuItemId: entry.menuItemId,
            platformProductName: entry.platformProductName ?? existing.platformProductName,
          },
        });
      } else {
        await request.db.marketplaceProductMapping.create({
          data: {
            platform: PLATFORM,
            platformProductId,
            menuItemId: entry.menuItemId,
            platformProductName: entry.platformProductName ?? null,
          },
        });
      }
      upserted++;
    }

    return { success: errors.length === 0, upserted, errors };
  });
}
