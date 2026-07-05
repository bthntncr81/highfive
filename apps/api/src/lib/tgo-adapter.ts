// ============================================================================
// Trendyol GO (TGO) Yemek adapter — saf HTTP istemcisi + sipariş normalize.
// ============================================================================
// Kimlik: her istekte Basic Auth (apiKey:apiSecret) + zorunlu header'lar:
//   User-Agent / x-agentname: "{supplierId} - SelfIntegration", x-executor-user.
// Sipariş alma modeli POLLING'dir (webhook yok) — bkz. docs/marketplace-integrations.md 2.2.
// Bu dosya DB'ye dokunmaz; poller (marketplace-poller.ts) ve route'lar
// (routes/marketplace.ts) burayı çağırır.

import { PaymentMethod } from '@prisma/client';

const TGO_BASE_URL = process.env.TGO_BASE_URL || 'https://api.tgoapis.com/integrator/';
const DEFAULT_EXECUTOR_EMAIL = process.env.TGO_EXECUTOR_EMAIL || 'entegrasyon@otorder.com';
const MAX_PAGES = 20; // sayfalama emniyet freni (20 x 50 = 1000 paket/sweep)

export const UNMAPPED_PREFIX = '[EŞLENMEMİŞ] ';

// Adapter'ın ihtiyaç duyduğu bağlantı alt kümesi (MarketplaceConnection uyumlu)
export interface TgoConnectionInfo {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  storeId?: string | null;
  executorEmail?: string | null;
}

// ---------------------------------------------------------------------------
// TGO payload tipleri (canlı prod yanıtından doğrulanmış alan adları)
// ---------------------------------------------------------------------------

export interface TgoModifierProduct {
  productId?: number | string;
  name?: string;
  price?: number;
  modifierProducts?: TgoModifierProduct[];
  extraIngredients?: Array<{ id?: number | string; name?: string }>;
  removedIngredients?: Array<{ id?: number | string; name?: string }>;
}

export interface TgoLine {
  productId?: number | string;
  name?: string;
  quantity?: number;
  price?: number;
  unitSellingPrice?: number;
  items?: Array<{ packageItemId?: number | string }>;
  modifierProducts?: TgoModifierProduct[];
}

export interface TgoPackage {
  id: string; // 64 hex — statü servislerinde packageId olarak kullanılır
  supplierId?: number;
  storeId?: number;
  orderCode?: string;
  storePickupSelected?: boolean;
  deliveryType?: string; // "STORE" (Model 1) | "GO" (Model 2)
  packageStatus?: string; // Created | Picking | Invoiced | Shipped | Delivered | Cancelled | UnSupplied
  packageCreationDate?: number; // epoch ms
  packageModificationDate?: number;
  preparationTime?: number;
  orderId?: string;
  orderNumber?: string;
  totalPrice?: number;
  callCenterPhone?: string;
  customerNote?: string;
  testPackage?: boolean;
  cancelInfo?: { reasonType?: string; reason?: string; reasonCode?: number } | null;
  customer?: { id?: number; firstName?: string; lastName?: string; email?: string } | null;
  payment?: {
    paymentType?: string;
    mealCard?: { cardSourceType?: string } | null;
    onDelivery?: { paymentType?: string; cardSourceType?: string } | null;
  } | null;
  address?: Record<string, unknown> | null;
  lines?: TgoLine[];
}

export interface TgoPackagePage {
  totalCount: number;
  totalPages: number;
  page: number;
  size: number;
  content: TgoPackage[];
}

// ---------------------------------------------------------------------------
// HTTP istemcisi
// ---------------------------------------------------------------------------

function tgoHeaders(conn: TgoConnectionInfo, hasBody: boolean): Record<string, string> {
  const agent = `${conn.supplierId} - SelfIntegration`;
  const headers: Record<string, string> = {
    Authorization: 'Basic ' + Buffer.from(`${conn.apiKey}:${conn.apiSecret}`).toString('base64'),
    'User-Agent': agent,
    'x-agentname': agent,
    'x-executor-user': conn.executorEmail || DEFAULT_EXECUTOR_EMAIL,
    Accept: 'application/json',
  };
  if (hasBody) headers['Content-Type'] = 'application/json';
  return headers;
}

/** TGO API'sine tek istek. 2xx dışında Türkçe mesajlı hata fırlatır. */
export async function tgoRequest<T = unknown>(
  conn: TgoConnectionInfo,
  method: 'GET' | 'PUT' | 'POST',
  path: string, // base URL'e göre relatif, örn. "order/meal/suppliers/123/packages?page=0"
  body?: unknown,
): Promise<T> {
  const url = TGO_BASE_URL + path.replace(/^\//, '');
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: tgoHeaders(conn, body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err: any) {
    throw new Error(`TGO'ya ulaşılamadı (${method} ${path}): ${err?.message || err}`);
  }

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(
      `TGO isteği başarısız (HTTP ${res.status} — ${method} ${path}): ${text.slice(0, 300) || 'yanıt gövdesi yok'}`,
    );
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`TGO yanıtı JSON değil (${method} ${path}): ${text.slice(0, 120)}`);
  }
}

/** Verilen statülerdeki paketleri sayfalayarak topla. */
export async function fetchPackages(
  conn: TgoConnectionInfo,
  statuses: string[],
): Promise<TgoPackage[]> {
  const all: TgoPackage[] = [];
  const statusParam = encodeURIComponent(statuses.join(','));
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await tgoRequest<TgoPackagePage>(
      conn,
      'GET',
      `order/meal/suppliers/${conn.supplierId}/packages?packageStatuses=${statusParam}&page=${page}&size=50`,
    );
    const content = Array.isArray(data?.content) ? data.content : [];
    all.push(...content);
    const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : 1;
    if (page + 1 >= totalPages || content.length === 0) break;
  }
  return all;
}

/** TGO menüsünü çek (eşleme UI'ının veri kaynağı). storeId zorunlu. */
export async function fetchProducts(conn: TgoConnectionInfo): Promise<any[]> {
  if (!conn.storeId) {
    throw new Error('TGO ürün listesi için storeId gerekli — bağlantıya storeId ekleyin');
  }
  const all: any[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await tgoRequest<any>(
      conn,
      'GET',
      `product/meal/suppliers/${conn.supplierId}/stores/${conn.storeId}/products?page=${page}&size=50`,
    );
    // Yanıt şekli toleranslı: dizi | {content:[..]} | {products:[..]}
    const content: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data?.products)
          ? data.products
          : [];
    all.push(...content);
    const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : 1;
    if (page + 1 >= totalPages || content.length === 0) break;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Durum bildirimleri (bizden TGO'ya)
// ---------------------------------------------------------------------------

/** Siparişi kabul et (Created → Picking). preparationTime dakika cinsinden. */
export async function pushPicked(
  conn: TgoConnectionInfo,
  packageId: string,
  preparationTime: number,
): Promise<void> {
  await tgoRequest(conn, 'PUT', `order/meal/suppliers/${conn.supplierId}/packages/picked`, {
    packageId,
    preparationTime,
  });
}

/** Hazırlık bitti (Picking → Invoiced). */
export async function pushInvoiced(conn: TgoConnectionInfo, packageId: string): Promise<void> {
  await tgoRequest(conn, 'PUT', `order/meal/suppliers/${conn.supplierId}/packages/invoiced`, {
    packageId,
  });
}

/** Yola çıktı — YALNIZ deliveryType "STORE" (Model 1, kendi kuryemiz). */
export async function pushShipped(conn: TgoConnectionInfo, packageId: string): Promise<void> {
  await tgoRequest(
    conn,
    'PUT',
    `order/meal/suppliers/${conn.supplierId}/packages/${packageId}/manual-shipped`,
  );
}

/** Teslim edildi — YALNIZ deliveryType "STORE" (Model 1). */
export async function pushDelivered(conn: TgoConnectionInfo, packageId: string): Promise<void> {
  await tgoRequest(
    conn,
    'PUT',
    `order/meal/suppliers/${conn.supplierId}/packages/${packageId}/manual-delivered`,
  );
}

/**
 * Tam/kısmi iptal. itemIdList = OrderItem meta'sındaki packageItemId'ler.
 * reasonId geçerli restoran sebepleri: 621 tedarik, 622 kapalı, 623 hazırlayamıyor,
 * 627 karışıklık (624/626 yalnız Model 1). Platform kodlarını (625 vb.) KULLANMAYIN.
 */
export async function pushUnsupplied(
  conn: TgoConnectionInfo,
  packageId: string,
  itemIdList: Array<number | string>,
  reasonId: number,
): Promise<void> {
  await tgoRequest(conn, 'PUT', `order/meal/suppliers/${conn.supplierId}/packages/unsupplied`, {
    packageId,
    itemIdList,
    reasonId,
  });
}

// ---------------------------------------------------------------------------
// Normalize: TGO paketi → mevcut sipariş oluşturma girdisi
// ---------------------------------------------------------------------------

export interface NormalizedTgoOrderItem {
  menuItemId: string | null; // null = eşlenmemiş (sipariş yine oluşur)
  name: string; // eşlenmemişse "[EŞLENMEMİŞ] <platform adı>"
  quantity: number;
  unitPrice: number; // platform fiyatı esas alınır
  total: number;
  modifiers: string[]; // düzleştirilmiş opsiyonlar (fiş için)
  notes: string | null;
  meta: { platformProductId: string; packageItemIds: string[] }; // kısmi iptal için zorunlu
}

export interface NormalizedTgoOrder {
  externalOrderId: string; // "tgo:" + pkg.id (idempotency anahtarı)
  displayCode: string; // orderNumber / orderCode — proxy santral için sipariş no
  orderType: 'DELIVERY' | 'TAKEAWAY'; // storePickupSelected → TAKEAWAY
  deliveryType: string; // "STORE" | "GO"
  customerName: string | null;
  customerPhone: string | null; // proxy santral (0850...) — gerçek numara DEĞİL
  customerAddress: string | null; // PII maskeli; Model 2'de placeholder olabilir
  notes: string | null;
  paymentMethod: PaymentMethod;
  preparationTime: number;
  subtotal: number;
  total: number;
  items: NormalizedTgoOrderItem[];
  unmappedProducts: Array<{ platformProductId: string; name: string }>;
  raw: TgoPackage;
}

// Ödeme eşlemesi — blueprint 2.2.3 tablosu. Kart isimleri zamanla değişiyor,
// bu yüzden TOLERANSLI (contains) parse: bilinmeyen her şey OTHER.
export function mapTgoPayment(payment: TgoPackage['payment']): PaymentMethod {
  const type = (payment?.paymentType || '').toUpperCase();

  const mealCardTo = (source: string): PaymentMethod => {
    const s = source.toUpperCase();
    if (s.includes('SODEXO') || s.includes('PLUXEE')) return PaymentMethod.SODEXO;
    if (s.includes('MULTINET')) return PaymentMethod.MULTINET;
    if (s.includes('TICKET') || s.includes('EDENRED')) return PaymentMethod.TICKET;
    return PaymentMethod.OTHER;
  };

  if (type === 'PAY_WITH_CARD') return PaymentMethod.ONLINE;
  if (type === 'PAY_WITH_MEAL_CARD') {
    return mealCardTo(payment?.mealCard?.cardSourceType || '');
  }
  if (type === 'PAY_WITH_ON_DELIVERY') {
    const od = payment?.onDelivery;
    const odType = (od?.paymentType || '').toUpperCase();
    if (odType === 'CASH') return PaymentMethod.CASH;
    if (odType === 'CARD') return PaymentMethod.CREDIT_CARD;
    const source = od?.cardSourceType || odType;
    if (source) return mealCardTo(source);
    return PaymentMethod.OTHER;
  }
  return PaymentMethod.OTHER;
}

// İç içe modifier ağacını fiş satırlarına düzleştir.
export function flattenModifiers(mods: TgoModifierProduct[] | undefined): string[] {
  const out: string[] = [];
  const walk = (list: TgoModifierProduct[] | undefined) => {
    for (const mod of list ?? []) {
      if (mod.name) out.push(mod.name);
      for (const extra of mod.extraIngredients ?? []) {
        if (extra.name) out.push(`Ekstra: ${extra.name}`);
      }
      for (const removed of mod.removedIngredients ?? []) {
        if (removed.name) out.push(`${removed.name} (çıkarıldı)`);
      }
      walk(mod.modifierProducts);
    }
  };
  walk(mods);
  return out;
}

// PII maskeli adres alanlarını tek satıra çevir (Model 2'de placeholder gelebilir)
function buildAddressText(address: Record<string, unknown> | null | undefined): string | null {
  if (!address) return null;
  const s = (key: string): string => {
    const v = address[key];
    return typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
  };
  const parts = [
    s('address1'),
    s('address2'),
    s('apartmentNumber') && `Apt: ${s('apartmentNumber')}`,
    s('floor') && `Kat: ${s('floor')}`,
    s('doorNumber') && `Daire: ${s('doorNumber')}`,
    s('neighborhood'),
    s('district'),
    s('city'),
    s('addressDescription') && `Not: ${s('addressDescription')}`,
  ].filter((p): p is string => !!p);
  return parts.length ? parts.join(', ') : null;
}

/**
 * TGO paketini mevcut sipariş oluşturma hattının beklediği şekle çevirir.
 * mapping: platformProductId → menuItemId. Eşlenmemiş ürün siparişi REDDETMEZ;
 * kalem "[EŞLENMEMİŞ] <ad>" fallback'iyle girer ve unmappedProducts'ta raporlanır.
 */
export function normalizePackage(
  pkg: TgoPackage,
  mapping: Map<string, string>,
): NormalizedTgoOrder {
  const items: NormalizedTgoOrderItem[] = [];
  const unmapped: Array<{ platformProductId: string; name: string }> = [];
  let subtotal = 0;

  for (const line of pkg.lines ?? []) {
    const platformProductId = String(line.productId ?? '');
    const platformName = line.name || `Ürün ${platformProductId || '?'}`;
    const menuItemId = mapping.get(platformProductId) ?? null;
    if (!menuItemId) {
      unmapped.push({ platformProductId, name: platformName });
    }

    const quantity = Math.max(1, Number(line.quantity ?? line.items?.length ?? 1));
    const unitPrice = Number(line.unitSellingPrice ?? line.price ?? 0);
    const total = unitPrice * quantity;
    subtotal += total;

    items.push({
      menuItemId,
      name: menuItemId ? platformName : UNMAPPED_PREFIX + platformName,
      quantity,
      unitPrice,
      total,
      modifiers: flattenModifiers(line.modifierProducts),
      notes: null,
      meta: {
        platformProductId,
        packageItemIds: (line.items ?? [])
          .map((i) => (i.packageItemId !== undefined ? String(i.packageItemId) : ''))
          .filter(Boolean),
      },
    });
  }

  const displayCode = pkg.orderNumber || pkg.orderCode || pkg.id.slice(0, 8);
  const customerName =
    [pkg.customer?.firstName, pkg.customer?.lastName].filter(Boolean).join(' ').trim() || null;
  // Telefon proxy santraldir: müşteri araması sipariş no tuşlanarak yapılır.
  const addressPhone =
    typeof pkg.address?.phone === 'string' ? (pkg.address.phone as string) : null;
  const customerPhone = addressPhone || pkg.callCenterPhone || null;

  const noteParts = [`Trendyol GO #${displayCode}`];
  if (pkg.customerNote) noteParts.push(pkg.customerNote);

  return {
    externalOrderId: `tgo:${pkg.id}`,
    displayCode,
    orderType: pkg.storePickupSelected ? 'TAKEAWAY' : 'DELIVERY',
    deliveryType: pkg.deliveryType || 'GO',
    customerName,
    customerPhone,
    customerAddress: buildAddressText(pkg.address),
    notes: noteParts.join(' | '),
    paymentMethod: mapTgoPayment(pkg.payment),
    preparationTime: Number(pkg.preparationTime ?? 20) || 20,
    subtotal,
    total: Number(pkg.totalPrice ?? subtotal),
    items,
    unmappedProducts: unmapped,
    raw: pkg,
  };
}
