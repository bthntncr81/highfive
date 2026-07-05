// ============================================================================
// Trendyol GO pazar yeri entegrasyonu — adapter normalize + connect akışı +
// poll sweep idempotency + feature-flag testleri.
// ============================================================================
// Gerçek TGO'ya ASLA istek atılmaz: global.fetch stub'lanır. Tüm kimlik
// bilgileri SAHTEDİR (gerçek supplier/apiKey repoya yazılmaz).
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaClient, MarketplacePlatform, OrderStatus, PaymentMethod } from '@prisma/client';
import { buildServer } from '../src/server';
import { platformDb } from '../src/lib/tenant-db';
import { runTgoPollSweep } from '../src/lib/marketplace-poller';
import {
  normalizePackage,
  mapTgoPayment,
  flattenModifiers,
  UNMAPPED_PREFIX,
  TgoPackage,
} from '../src/lib/tgo-adapter';

// ---------------------------------------------------------------------------
// Sahte kimlikler + paket fixture'ları (canlı prod yanıtıyla aynı alan adları)
// ---------------------------------------------------------------------------
const FAKE_SUPPLIER_ID = '1234567';
const FAKE_API_KEY = 'fake-tgo-api-key-abcd';
const FAKE_API_SECRET = 'fake-tgo-api-secret';
const FAKE_STORE_ID = '7654321';

const hex64 = (tag: string) => tag.padEnd(64, 'f').slice(0, 64);
const PKG_MAPPED = hex64('aaa1');
const PKG_UNMAPPED = hex64('bbb2');

function samplePackage(overrides: Partial<TgoPackage> = {}): TgoPackage {
  return {
    id: PKG_MAPPED,
    supplierId: Number(FAKE_SUPPLIER_ID),
    storeId: Number(FAKE_STORE_ID),
    orderCode: '006',
    storePickupSelected: false,
    deliveryType: 'STORE',
    packageStatus: 'Created',
    packageCreationDate: 1783271746968,
    packageModificationDate: 1783272641811,
    preparationTime: 15,
    orderId: '1011111111111',
    orderNumber: '11111111111',
    totalPrice: 550.0,
    callCenterPhone: '0212 000 00 00',
    customer: { id: 1, firstName: 'ipek', lastName: 'a', email: 'pf.fake@example.com' },
    payment: { paymentType: 'PAY_WITH_CARD', mealCard: null, onDelivery: null },
    address: {
      address1: 'Maskeli Mah. Örnek Sok. No:1',
      apartmentNumber: '5',
      floor: '2',
      doorNumber: '4',
      district: 'Kadıköy',
      city: 'İstanbul',
      phone: '0850 123 45 67',
    },
    customerNote: 'Zili çalmayın',
    lines: [
      {
        productId: 111,
        name: 'Karışık Pizza',
        quantity: 1,
        price: 550,
        unitSellingPrice: 550,
        items: [{ packageItemId: 9001 }],
        modifierProducts: [],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// global.fetch stub — TGO URL'leri senaryoya göre yanıtlanır, gerisi no-op
// ---------------------------------------------------------------------------
const mkRes = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  }) as any;

let tgoPackages: TgoPackage[] = [];
let tgoAuthFails = false;
const fetchCalls: Array<{ url: string; method: string; headers: any; body: any }> = [];

const fetchMock = vi.fn(async (input: any, init?: any) => {
  const url = String(input);
  const method = init?.method || 'GET';
  fetchCalls.push({
    url,
    method,
    headers: init?.headers ?? {},
    body: init?.body ? JSON.parse(init.body) : undefined,
  });
  if (url.includes('tgoapis.com')) {
    if (tgoAuthFails) return mkRes(401, { message: 'Unauthorized' });
    if (url.includes('/packages?')) {
      return mkRes(200, {
        totalCount: tgoPackages.length,
        totalPages: 1,
        page: 0,
        size: 50,
        content: tgoPackages,
      });
    }
    if (url.includes('/products')) return mkRes(200, { content: [], totalPages: 1 });
    return mkRes(200, {}); // picked / invoiced / unsupplied vb. statü PUT'ları
  }
  return mkRes(200, {}); // mailer vb. diğer fetch'ler — dışarı istek yok
});

// ---------------------------------------------------------------------------
// Test sunucusu + tenant'lar
// ---------------------------------------------------------------------------
let server: FastifyInstance;
const suffix = Math.random().toString(36).slice(2, 7);
const proSub = 'tgopro' + suffix;
const starterSub = 'tgostart' + suffix;
let proToken = '';
let starterToken = '';
let proTenantId = '';
let starterTenantId = '';
let menuItemId = '';

const auth = (t: string) => ({ authorization: `Bearer ${t}` });

async function signup(sub: string, planKey: string) {
  const res = await server.inject({
    method: 'POST',
    url: '/api/platform/signup',
    payload: {
      name: 'Owner',
      email: `o@${sub}.local`,
      password: 'gizli123',
      restaurantName: sub,
      subdomain: sub,
      planKey,
    },
  });
  return res.json();
}

beforeAll(async () => {
  vi.stubGlobal('fetch', fetchMock);

  // Planlar mevcut değilse/eskiyse marketplace bayrağını garanti et (seed eşleniği)
  const planFeatures: Record<string, Record<string, boolean>> = {
    STARTER: { loyalty: false, campaigns: false, analytics: false, whatsappLink: false, brandedApp: false, customLanding: false, marketplace: false },
    PRO: { loyalty: true, campaigns: true, analytics: true, whatsappLink: true, brandedApp: false, customLanding: false, marketplace: true },
    ENTERPRISE: { loyalty: true, campaigns: true, analytics: true, whatsappLink: true, brandedApp: true, customLanding: true, marketplace: true },
  };
  for (const [key, features] of Object.entries(planFeatures)) {
    await platformDb.plan.upsert({
      where: { key },
      update: { features },
      create: {
        key,
        name: key,
        monthlyPrice: 0,
        annualPrice: 0,
        maxLocations: key === 'ENTERPRISE' ? -1 : key === 'PRO' ? 3 : 1,
        maxUsers: key === 'ENTERPRISE' ? -1 : key === 'PRO' ? 15 : 5,
        features,
      },
    });
  }

  server = await buildServer({ prisma: new PrismaClient(), logger: false });
  await server.ready();
  const pro = await signup(proSub, 'PRO');
  proToken = pro.token;
  proTenantId = pro.tenant.id;
  const st = await signup(starterSub, 'STARTER');
  starterToken = st.token;
  starterTenantId = st.tenant.id;

  // Eşleme testleri için menü ürünü
  const cat = await platformDb.category.create({
    data: { tenantId: proTenantId, name: 'TGO Test Kategori' },
  });
  const item = await platformDb.menuItem.create({
    data: { tenantId: proTenantId, categoryId: cat.id, name: 'Karışık Pizza (POS)', price: 500 },
  });
  menuItemId = item.id;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  for (const tid of [proTenantId, starterTenantId]) {
    if (!tid) continue;
    try {
      // Tenant silinince tüm tenant-owned satırlar cascade ile temizlenir
      await platformDb.subscription.deleteMany({ where: { tenantId: tid } });
      await platformDb.membership.deleteMany({ where: { tenantId: tid } });
      await platformDb.tenant.delete({ where: { id: tid } });
    } catch {
      /* temizlik hatası testleri düşürmesin */
    }
  }
  await server.close();
  await platformDb.$disconnect();
});

// ---------------------------------------------------------------------------
// normalizePackage — saf normalize testleri
// ---------------------------------------------------------------------------
describe('normalizePackage', () => {
  it('gerçek örnek paket → eşlenmiş kalem + DELIVERY + idempotency anahtarı', () => {
    const mapping = new Map([['111', 'menu-item-1']]);
    const n = normalizePackage(samplePackage(), mapping);

    expect(n.externalOrderId).toBe(`tgo:${PKG_MAPPED}`);
    expect(n.orderType).toBe('DELIVERY');
    expect(n.deliveryType).toBe('STORE');
    expect(n.paymentMethod).toBe(PaymentMethod.ONLINE);
    expect(n.total).toBe(550);
    expect(n.preparationTime).toBe(15);
    expect(n.customerName).toBe('ipek a');
    expect(n.customerPhone).toBe('0850 123 45 67'); // proxy santral
    expect(n.customerAddress).toContain('Maskeli Mah.');
    expect(n.notes).toContain('Trendyol GO #11111111111');
    expect(n.notes).toContain('Zili çalmayın');

    expect(n.items).toHaveLength(1);
    expect(n.items[0].menuItemId).toBe('menu-item-1');
    expect(n.items[0].name).toBe('Karışık Pizza');
    expect(n.items[0].meta.packageItemIds).toEqual(['9001']);
    expect(n.items[0].meta.platformProductId).toBe('111');
    expect(n.unmappedProducts).toHaveLength(0);
  });

  it('storePickupSelected=true → TAKEAWAY', () => {
    const n = normalizePackage(samplePackage({ storePickupSelected: true }), new Map());
    expect(n.orderType).toBe('TAKEAWAY');
  });

  it('eşlenmemiş ürün → sipariş reddedilmez, fallback ad + rapor', () => {
    const n = normalizePackage(samplePackage(), new Map()); // boş eşleme
    expect(n.items[0].menuItemId).toBeNull();
    expect(n.items[0].name).toBe(`${UNMAPPED_PREFIX}Karışık Pizza`);
    expect(n.unmappedProducts).toEqual([{ platformProductId: '111', name: 'Karışık Pizza' }]);
  });

  it('modifier ağacı düzleştirilir (nested + extra + removed)', () => {
    const pkg = samplePackage({
      lines: [
        {
          productId: 222,
          name: 'Menü Burger',
          quantity: 2,
          unitSellingPrice: 100,
          items: [{ packageItemId: 9101 }, { packageItemId: 9102 }],
          modifierProducts: [
            {
              productId: 301,
              name: 'İçecek Seçimi',
              modifierProducts: [{ productId: 302, name: 'Kola Zero' }],
              extraIngredients: [{ id: 1, name: 'Peynir' }],
              removedIngredients: [{ id: 2, name: 'Soğan' }],
            },
          ],
        },
      ],
    });
    const n = normalizePackage(pkg, new Map());
    expect(n.items[0].quantity).toBe(2);
    expect(n.items[0].meta.packageItemIds).toEqual(['9101', '9102']);
    expect(n.items[0].modifiers).toEqual([
      'İçecek Seçimi',
      'Ekstra: Peynir',
      'Soğan (çıkarıldı)',
      'Kola Zero',
    ]);
  });
});

describe('mapTgoPayment (toleranslı ödeme eşlemesi)', () => {
  it('blueprint tablosu + bilinmeyenler OTHER', () => {
    expect(mapTgoPayment({ paymentType: 'PAY_WITH_CARD' })).toBe(PaymentMethod.ONLINE);
    expect(
      mapTgoPayment({ paymentType: 'PAY_WITH_MEAL_CARD', mealCard: { cardSourceType: 'SODEXO' } }),
    ).toBe(PaymentMethod.SODEXO);
    expect(
      mapTgoPayment({ paymentType: 'PAY_WITH_MEAL_CARD', mealCard: { cardSourceType: 'PLUXEE_NEW' } }),
    ).toBe(PaymentMethod.SODEXO);
    expect(
      mapTgoPayment({ paymentType: 'PAY_WITH_MEAL_CARD', mealCard: { cardSourceType: 'MULTINET_X' } }),
    ).toBe(PaymentMethod.MULTINET);
    expect(
      mapTgoPayment({ paymentType: 'PAY_WITH_MEAL_CARD', mealCard: { cardSourceType: 'YENI_KART' } }),
    ).toBe(PaymentMethod.OTHER);
    expect(
      mapTgoPayment({ paymentType: 'PAY_WITH_ON_DELIVERY', onDelivery: { paymentType: 'CASH' } }),
    ).toBe(PaymentMethod.CASH);
    expect(
      mapTgoPayment({ paymentType: 'PAY_WITH_ON_DELIVERY', onDelivery: { paymentType: 'CARD' } }),
    ).toBe(PaymentMethod.CREDIT_CARD);
    expect(
      mapTgoPayment({
        paymentType: 'PAY_WITH_ON_DELIVERY',
        onDelivery: { paymentType: 'MEAL_CARD', cardSourceType: 'TICKET_RESTAURANT' },
      }),
    ).toBe(PaymentMethod.TICKET);
    expect(mapTgoPayment({ paymentType: 'YEPYENI_ODEME' })).toBe(PaymentMethod.OTHER);
    expect(mapTgoPayment(null)).toBe(PaymentMethod.OTHER);
  });

  it('flattenModifiers boş girdilerde boş dizi döner', () => {
    expect(flattenModifiers(undefined)).toEqual([]);
    expect(flattenModifiers([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Connect akışı (PRO)
// ---------------------------------------------------------------------------
describe('TGO connect akışı (PRO)', () => {
  it('canlı doğrulama başarısız → 400 + TGO hata detayı', async () => {
    tgoAuthFails = true;
    const res = await server.inject({
      method: 'POST',
      url: '/api/marketplace/tgo/connect',
      headers: auth(proToken),
      payload: { supplierId: FAKE_SUPPLIER_ID, apiKey: 'yanlis', apiSecret: 'yanlis' },
    });
    tgoAuthFails = false;
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('doğrulaması başarısız');
  });

  it('eksik alan → 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/marketplace/tgo/connect',
      headers: auth(proToken),
      payload: { supplierId: FAKE_SUPPLIER_ID },
    });
    expect(res.statusCode).toBe(400);
  });

  it('doğrulama başarılı → connection upsert + maskeli özet', async () => {
    fetchCalls.length = 0;
    const res = await server.inject({
      method: 'POST',
      url: '/api/marketplace/tgo/connect',
      headers: auth(proToken),
      payload: {
        supplierId: FAKE_SUPPLIER_ID,
        apiKey: FAKE_API_KEY,
        apiSecret: FAKE_API_SECRET,
        storeId: FAKE_STORE_ID,
        executorEmail: 'test@otorder.com',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.connected).toBe(true);
    expect(body.apiKeyMasked).toBe('****abcd');
    expect(JSON.stringify(body)).not.toContain(FAKE_API_SECRET); // sır asla dönmez

    // Doğrulama isteği zorunlu header'larla gitti mi?
    const verifyCall = fetchCalls.find((c) => c.url.includes('/packages?page=0&size=1'));
    expect(verifyCall).toBeTruthy();
    expect(verifyCall!.headers.Authorization).toMatch(/^Basic /);
    expect(verifyCall!.headers['x-agentname']).toBe(`${FAKE_SUPPLIER_ID} - SelfIntegration`);
    expect(verifyCall!.headers['x-executor-user']).toBe('test@otorder.com');

    const row = await platformDb.marketplaceConnection.findFirst({
      where: { tenantId: proTenantId, platform: MarketplacePlatform.TRENDYOL_GO },
    });
    expect(row?.isActive).toBe(true);
    expect(row?.supplierId).toBe(FAKE_SUPPLIER_ID);
  });

  it('status → bağlantı özeti (maskeli) + eşleme sayıları', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/marketplace/tgo/status',
      headers: auth(proToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.connected).toBe(true);
    expect(body.apiKeyMasked).toBe('****abcd');
    expect(body.mappedProductCount).toBe(0);
    expect(JSON.stringify(body)).not.toContain(FAKE_API_SECRET);
  });
});

describe('feature-lock (STARTER)', () => {
  it('STARTER connect → 403 FEATURE_LOCKED', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/marketplace/tgo/connect',
      headers: auth(starterToken),
      payload: { supplierId: FAKE_SUPPLIER_ID, apiKey: 'x', apiSecret: 'y' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('FEATURE_LOCKED');
  });
});

// ---------------------------------------------------------------------------
// Eşleme (mapping) CRUD
// ---------------------------------------------------------------------------
describe('TGO ürün eşleme', () => {
  it('PUT mappings → toplu upsert', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/marketplace/tgo/mappings',
      headers: auth(proToken),
      payload: {
        mappings: [
          { platformProductId: '111', menuItemId, platformProductName: 'Karışık Pizza' },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ success: true, upserted: 1 });

    // Aynı platformProductId ikinci kez → update (duplicate satır oluşmaz)
    const res2 = await server.inject({
      method: 'PUT',
      url: '/api/marketplace/tgo/mappings',
      headers: auth(proToken),
      payload: { mappings: [{ platformProductId: '111', menuItemId }] },
    });
    expect(res2.json().upserted).toBe(1);
    const count = await platformDb.marketplaceProductMapping.count({
      where: { tenantId: proTenantId, platform: MarketplacePlatform.TRENDYOL_GO },
    });
    expect(count).toBe(1);
  });

  it('geçersiz menuItemId → kayıt atlanır + hata raporu', async () => {
    const res = await server.inject({
      method: 'PUT',
      url: '/api/marketplace/tgo/mappings',
      headers: auth(proToken),
      payload: { mappings: [{ platformProductId: '555', menuItemId: 'yok-boyle-urun' }] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.upserted).toBe(0);
    expect(body.errors[0]).toContain('bulunamadı');
  });
});

// ---------------------------------------------------------------------------
// Poll sweep — sipariş enjeksiyonu + idempotency + iptal
// ---------------------------------------------------------------------------
describe('TGO poll sweep', () => {
  it('Created paketler → Order oluşur (eşlenmiş + eşlenmemiş fallback) + picked', async () => {
    tgoPackages = [
      samplePackage(), // productId 111 → eşlenmiş (önceki describe'da mapping yazıldı)
      samplePackage({
        id: PKG_UNMAPPED,
        orderNumber: '22222222222',
        preparationTime: undefined, // varsayılan 20 dk devreye girmeli
        lines: [
          {
            productId: 999,
            name: 'Gizemli Ürün',
            quantity: 1,
            unitSellingPrice: 75,
            items: [{ packageItemId: 9201 }],
          },
        ],
        totalPrice: 75,
      }),
    ];
    fetchCalls.length = 0;
    await runTgoPollSweep(platformDb);

    const mappedOrder = await platformDb.order.findFirst({
      where: { tenantId: proTenantId, externalOrderId: `tgo:${PKG_MAPPED}` },
      include: { items: true },
    });
    expect(mappedOrder).toBeTruthy();
    expect(mappedOrder!.source).toBe('TRENDYOL_GO');
    expect(mappedOrder!.type).toBe('DELIVERY');
    expect(Number(mappedOrder!.total)).toBe(550);
    expect(mappedOrder!.items[0].menuItemId).toBe(menuItemId);
    expect((mappedOrder!.items[0].meta as any).packageItemIds).toEqual(['9001']);

    const unmappedOrder = await platformDb.order.findFirst({
      where: { tenantId: proTenantId, externalOrderId: `tgo:${PKG_UNMAPPED}` },
      include: { items: true },
    });
    expect(unmappedOrder).toBeTruthy();
    expect(unmappedOrder!.items[0].menuItemId).toBeNull();
    expect(unmappedOrder!.items[0].menuItemName).toBe(`${UNMAPPED_PREFIX}Gizemli Ürün`);

    // Eşlenmemiş ürün bağlantı hatasına not düşüldü
    const conn = await platformDb.marketplaceConnection.findFirst({
      where: { tenantId: proTenantId, platform: MarketplacePlatform.TRENDYOL_GO },
    });
    expect(conn?.lastError).toContain('Eşlenmemiş');
    expect(conn?.lastPolledAt).toBeTruthy();

    // Kabul bildirimi (picked) preparationTime ile gitti
    const picked = fetchCalls.filter(
      (c) => c.url.includes('/packages/picked') && c.method === 'PUT',
    );
    expect(picked.some((c) => c.body?.packageId === PKG_MAPPED && c.body?.preparationTime === 15)).toBe(true);
    expect(picked.some((c) => c.body?.packageId === PKG_UNMAPPED && c.body?.preparationTime === 20)).toBe(true);
  });

  it('idempotency: aynı paket ikinci sweep\'te tekrar işlenmez', async () => {
    await runTgoPollSweep(platformDb);
    const count = await platformDb.order.count({
      where: { tenantId: proTenantId, externalOrderId: `tgo:${PKG_MAPPED}` },
    });
    expect(count).toBe(1);
  });

  it('Cancelled paket → bilinen sipariş CANCELLED olur', async () => {
    tgoPackages = [
      samplePackage({
        packageStatus: 'Cancelled',
        cancelInfo: { reasonType: 'PLATFORM', reason: 'kabul edilmedi', reasonCode: 625 },
      }),
    ];
    await runTgoPollSweep(platformDb);
    const order = await platformDb.order.findFirst({
      where: { tenantId: proTenantId, externalOrderId: `tgo:${PKG_MAPPED}` },
    });
    expect(order?.status).toBe(OrderStatus.CANCELLED);

    // İptalli paketten YENİ sipariş oluşmadı
    const count = await platformDb.order.count({
      where: { tenantId: proTenantId, externalOrderId: `tgo:${PKG_MAPPED}` },
    });
    expect(count).toBe(1);
  });

  it('disconnect sonrası bağlantı poll edilmez', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/marketplace/tgo/disconnect',
      headers: auth(proToken),
    });
    expect(res.json().connected).toBe(false);

    tgoPackages = [samplePackage({ id: hex64('ccc3'), orderNumber: '33333333333' })];
    await runTgoPollSweep(platformDb);
    const order = await platformDb.order.findFirst({
      where: { tenantId: proTenantId, externalOrderId: `tgo:${hex64('ccc3')}` },
    });
    expect(order).toBeNull();
  });
});
