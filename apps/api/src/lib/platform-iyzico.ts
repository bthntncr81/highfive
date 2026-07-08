// ============================================================================
// Platform iyzico — ABONELİK tahsilatı (tenant'ın SİPARİŞ iyzico'sundan AYRI).
// ============================================================================
// Abonelik ödemeleri OtOrder'ın KENDİ iyzico hesabından çekilir (env anahtarları).
// Sipariş tahsilatı ise tenant'ın kendi anahtarlarıyla (routes/payment.ts).
//
// Kart saklama akışı (iyzico "Kart Saklama" / stored card):
//   1. İlk kayıt: kart bilgisi + cardUserKey yoksa → yeni cüzdan; cardUserKey döner.
//   2. Sonraki yenilemeler: cardUserKey + cardToken ile çekim (kullanıcı kart girmez).
//
// SIMÜLASYON: PLATFORM_IYZICO_API_KEY yoksa (dev/test/CI) gerçek çağrı yapılmaz;
// deterministik sahte token/paymentId döner ki tüm akış uçtan uca test edilsin.
// Canlıda env anahtarları verilince otomatik gerçek iyzico'ya geçer.

import * as crypto from 'crypto';

export interface PlatformIyzicoResult {
  success: boolean;
  simulated: boolean;
  cardUserKey?: string;
  cardToken?: string;
  paymentId?: string;
  errorMessage?: string;
  raw?: any;
}

const API_KEY = process.env.PLATFORM_IYZICO_API_KEY || '';
const SECRET_KEY = process.env.PLATFORM_IYZICO_SECRET_KEY || '';
const BASE_URL = process.env.PLATFORM_IYZICO_BASE_URL || 'https://api.iyzipay.com';

export function isSimulated(): boolean {
  return !API_KEY || !SECRET_KEY;
}

function authHeader(uriPath: string, body: string, randomKey: string): string {
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(randomKey + uriPath + body, 'utf8')
    .digest('hex');
  const authString = `apiKey:${API_KEY}&randomKey:${randomKey}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
}

// GET'te body boş string → imza randomKey + uri.path üzerinden; body gönderilmez.
async function iyzicoRequest(uriPath: string, body?: any, method: 'POST' | 'GET' = 'POST'): Promise<any> {
  const bodyStr = method === 'GET' ? '' : JSON.stringify(body ?? {});
  const randomKey = Date.now().toString() + crypto.randomBytes(8).toString('hex');
  const res = await fetch(BASE_URL + uriPath, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(uriPath, bodyStr, randomKey),
      'x-iyzi-rnd': randomKey,
    },
    ...(method === 'GET' ? {} : { body: bodyStr }),
  });
  return res.json();
}

// Deterministik sahte referans (aynı girdi → aynı çıktı; SIMÜLASYON izlenebilir)
export function fakeRef(prefix: string, seed: string): string {
  const h = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
  return `${prefix}_${h}`;
}

export interface CardInput {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
}

export interface BuyerInput {
  tenantId: string;
  email: string;
  name: string;
  phone?: string;
}

// Kartı sakla (cüzdan oluştur/ekle) → cardUserKey + cardToken döner.
export async function storeCard(card: CardInput, buyer: BuyerInput, existingCardUserKey?: string): Promise<PlatformIyzicoResult> {
  if (isSimulated()) {
    return {
      success: true,
      simulated: true,
      cardUserKey: existingCardUserKey || fakeRef('cuk', buyer.tenantId),
      cardToken: fakeRef('ct', buyer.tenantId + card.cardNumber.slice(-4)),
    };
  }
  const body: any = {
    locale: 'tr',
    conversationId: buyer.tenantId,
    email: buyer.email,
    externalId: buyer.tenantId,
    card: {
      cardAlias: 'OtOrder abonelik kartı',
      cardHolderName: card.cardHolderName,
      cardNumber: card.cardNumber,
      expireMonth: card.expireMonth,
      expireYear: card.expireYear,
    },
  };
  if (existingCardUserKey) body.cardUserKey = existingCardUserKey;
  const r = await iyzicoRequest('/cardstorage/card', body);
  return {
    success: r.status === 'success',
    simulated: false,
    cardUserKey: r.cardUserKey,
    cardToken: r.cardToken,
    errorMessage: r.errorMessage,
    raw: r,
  };
}

// Saklı kartla abonelik tahsilatı (yenileme). cardUserKey + cardToken zorunlu.
export async function chargeStoredCard(params: {
  buyer: BuyerInput;
  amount: number;
  cardUserKey: string;
  cardToken: string;
  planName: string;
}): Promise<PlatformIyzicoResult> {
  const { buyer, amount, cardUserKey, cardToken, planName } = params;
  const conversationId = `${buyer.tenantId}-${Date.now()}`;
  if (isSimulated()) {
    return {
      success: true,
      simulated: true,
      paymentId: fakeRef('pay', conversationId),
    };
  }
  const body = {
    locale: 'tr',
    conversationId,
    price: amount.toFixed(2),
    paidPrice: amount.toFixed(2),
    currency: 'TRY',
    installment: 1,
    paymentChannel: 'WEB',
    paymentGroup: 'SUBSCRIPTION',
    cardUserKey,
    paymentCard: { cardToken, cardUserKey },
    buyer: {
      id: buyer.tenantId,
      name: buyer.name,
      surname: buyer.name,
      email: buyer.email,
      identityNumber: '11111111111',
      registrationAddress: 'OtOrder',
      city: 'Istanbul',
      country: 'Turkey',
      gsmNumber: buyer.phone || '+905000000000',
    },
    billingAddress: { contactName: buyer.name, city: 'Istanbul', country: 'Turkey', address: 'OtOrder' },
    basketItems: [
      { id: 'plan', name: `OtOrder ${planName}`, category1: 'Abonelik', itemType: 'VIRTUAL', price: amount.toFixed(2) },
    ],
  };
  const r = await iyzicoRequest('/payment/auth', body);
  return {
    success: r.status === 'success',
    simulated: false,
    paymentId: r.paymentId,
    errorMessage: r.errorMessage,
    raw: r,
  };
}

// ============================================================================
// iyzico Abonelik (Subscription) API — gerçek tahsilat yolu (v2 endpoint'leri).
// ============================================================================
// Plan iyzico panelinde pricingPlanReferenceCode olarak tanımlanır; checkout
// formu ile abonelik başlatılır, yenilemeler iyzico tarafında otomatik döner ve
// webhook ile bize bildirilir. SIMÜLASYON'da deterministik sahte referanslar.

export interface SubscriptionCustomerInput {
  name: string;
  surname: string;
  email: string;
  gsmNumber: string;
  identityNumber: string;
  billingAddress: { contactName: string; city: string; country: string; address: string };
}

// iyzico v2 yanıtları payload'ı çoğunlukla `data` altında sarar — normalize et.
function unwrap(r: any): any {
  return r?.data ?? r ?? {};
}

// Abonelik checkout formu başlat → { token, checkoutFormContent }.
export async function initializeSubscriptionCheckout(params: {
  pricingPlanReferenceCode: string;
  callbackUrl: string;
  customer: SubscriptionCustomerInput;
}): Promise<{ token: string; checkoutFormContent: string }> {
  if (isSimulated()) {
    return {
      token: fakeRef('chk', params.pricingPlanReferenceCode + '|' + params.customer.email),
      checkoutFormContent: '<div data-simulated-checkout>SIMULATED</div>',
    };
  }
  const r = await iyzicoRequest('/v2/subscription/checkoutform/initialize', {
    locale: 'tr',
    pricingPlanReferenceCode: params.pricingPlanReferenceCode,
    subscriptionInitialStatus: 'ACTIVE',
    callbackUrl: params.callbackUrl,
    customer: params.customer,
  });
  if (r.status !== 'success') {
    throw new Error(r.errorMessage || 'iyzico abonelik checkout başlatılamadı');
  }
  const d = unwrap(r);
  return { token: d.token ?? r.token, checkoutFormContent: d.checkoutFormContent ?? r.checkoutFormContent };
}

// Checkout sonucu sorgula (callback'te) → abonelik durumu + referans kodları.
export async function retrieveCheckoutResult(token: string): Promise<{
  subscriptionStatus: string;
  referenceCode?: string;
  customerReferenceCode?: string;
  raw?: any;
}> {
  if (isSimulated()) {
    return {
      subscriptionStatus: 'ACTIVE',
      referenceCode: fakeRef('sub', token),
      customerReferenceCode: fakeRef('cus', token),
    };
  }
  const r = await iyzicoRequest(`/v2/subscription/checkoutform/${token}`, undefined, 'GET');
  if (r.status !== 'success') {
    throw new Error(r.errorMessage || 'iyzico checkout sonucu alınamadı');
  }
  const d = unwrap(r);
  return {
    subscriptionStatus: d.subscriptionStatus,
    referenceCode: d.referenceCode,
    customerReferenceCode: d.customerReferenceCode,
    raw: r,
  };
}

// Abonelik detayı (mutabakat taraması) → normalize { status }.
export async function retrieveSubscription(ref: string): Promise<{ status: string; raw?: any }> {
  if (isSimulated()) {
    return { status: 'ACTIVE' };
  }
  const r = await iyzicoRequest(`/v2/subscription/subscriptions/${ref}`, undefined, 'GET');
  if (r.status !== 'success') {
    throw new Error(r.errorMessage || 'iyzico abonelik sorgulanamadı');
  }
  const d = unwrap(r);
  return { status: d.subscriptionStatus ?? d.status, raw: r };
}

// Aboneliği iyzico tarafında iptal et (yenileme durur).
export async function cancelIyzicoSubscription(ref: string): Promise<{ success: boolean; errorMessage?: string }> {
  if (isSimulated()) {
    return { success: true };
  }
  const r = await iyzicoRequest(`/v2/subscription/subscriptions/${ref}/cancel`, { locale: 'tr' });
  return { success: r.status === 'success', errorMessage: r.errorMessage };
}

// Plan değişikliği (upgrade/downgrade) → iyzico YENİ abonelik referansı döner.
export async function upgradeIyzicoSubscription(
  ref: string,
  opts: { newPricingPlanReferenceCode: string; upgradePeriod: 'NOW' | 'NEXT_PERIOD'; resetRecurrenceCount?: boolean },
): Promise<{ referenceCode: string }> {
  if (isSimulated()) {
    return { referenceCode: fakeRef('sub', ref + opts.newPricingPlanReferenceCode) };
  }
  const r = await iyzicoRequest(`/v2/subscription/subscriptions/${ref}/upgrade`, {
    locale: 'tr',
    newPricingPlanReferenceCode: opts.newPricingPlanReferenceCode,
    upgradePeriod: opts.upgradePeriod,
    resetRecurrenceCount: opts.resetRecurrenceCount ?? true,
  });
  if (r.status !== 'success') {
    throw new Error(r.errorMessage || 'iyzico plan değişikliği başarısız');
  }
  const d = unwrap(r);
  return { referenceCode: d.referenceCode ?? ref };
}

// Webhook imza doğrulaması (x-iyz-signature-v3):
//   beklenen = HMACSHA256(merchantId + secretKey + iyziEventType +
//     subscriptionReferenceCode + orderReferenceCode + customerReferenceCode, secretKey) hex
// SIMÜLASYON'da da aynı formül çalışır (merchantId/secretKey boş) — testler üretebilir.
export function verifyWebhookSignatureV3(
  headerValue: string | undefined,
  payload: {
    iyziEventType?: string;
    subscriptionReferenceCode?: string;
    orderReferenceCode?: string;
    customerReferenceCode?: string;
  },
): boolean {
  if (!headerValue) return false;
  const merchantId = process.env.PLATFORM_IYZICO_MERCHANT_ID || '';
  const data =
    merchantId +
    SECRET_KEY +
    (payload.iyziEventType || '') +
    (payload.subscriptionReferenceCode || '') +
    (payload.orderReferenceCode || '') +
    (payload.customerReferenceCode || '');
  const expected = crypto.createHmac('sha256', SECRET_KEY).update(data, 'utf8').digest('hex');
  const a = Buffer.from(headerValue, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
