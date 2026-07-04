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

function authHeader(uriPath: string, body: string): string {
  const randomKey = Date.now().toString() + crypto.randomBytes(8).toString('hex');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(randomKey + uriPath + body, 'utf8')
    .digest('hex');
  const authString = `apiKey:${API_KEY}&randomKey:${randomKey}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
}

async function iyzicoRequest(uriPath: string, body: any): Promise<any> {
  const bodyStr = JSON.stringify(body);
  const res = await fetch(BASE_URL + uriPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(uriPath, bodyStr),
    },
    body: bodyStr,
  });
  return res.json();
}

// Deterministik sahte referans (aynı girdi → aynı çıktı; SIMÜLASYON izlenebilir)
function fakeRef(prefix: string, seed: string): string {
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
