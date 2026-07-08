// ============================================================================
// Platform (SaaS) E2E — signup → onboarding → billing (simüle iyzico) → süper-admin.
// ============================================================================
// Gerçek Postgres'e karşı (migrate DB / CI). Platform iyzico SIMÜLASYON modunda
// (PLATFORM_IYZICO_API_KEY yok) → kart/abonelik akışı uçtan uca test edilir.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { buildServer } from '../src/server';
import { platformDb, dbFor } from '../src/lib/tenant-db';
import { assertWithinUserLimit, hasFeature } from '../src/lib/plan-limits';
import { signStaffToken } from '../src/middleware/auth';

// Süper-admin allowlist'ini test için sabitle
process.env.SUPERADMIN_EMAILS = 'super@otorder.test';

let server: FastifyInstance;
let ownerToken = '';
let tenantId = '';
const sub = 'test' + Math.random().toString(36).slice(2, 8);

beforeAll(async () => {
  server = await buildServer({ prisma: new PrismaClient(), logger: false });
  await server.ready();
  // süper-admin kullanıcısı
  await platformDb.user.upsert({
    where: { email: 'super@otorder.test' },
    update: {},
    create: { email: 'super@otorder.test', name: 'Süper', password: await bcrypt.hash('süpersifre', 10) },
  });
});

afterAll(async () => {
  // Oluşturulan test tenant'ının verisini temizle (bağımlılık sırasıyla)
  if (tenantId) {
    for (const del of [
      () => platformDb.menuItem.deleteMany({ where: { tenantId } }),
      () => platformDb.category.deleteMany({ where: { tenantId } }),
      () => platformDb.table.deleteMany({ where: { tenantId } }),
      () => platformDb.location.deleteMany({ where: { tenantId } }),
      () => platformDb.storedCard.deleteMany({ where: { tenantId } }),
      () => platformDb.billingTransaction.deleteMany({ where: { tenantId } }),
      () => platformDb.subscription.deleteMany({ where: { tenantId } }),
      () => platformDb.membership.deleteMany({ where: { tenantId } }),
      () => platformDb.tenant.delete({ where: { id: tenantId } }),
    ]) {
      try { await del(); } catch { /* yoksa geç */ }
    }
  }
  try { await platformDb.emailLog.deleteMany({ where: { toEmail: { endsWith: `@${sub}.local` } } }); } catch { /* */ }
  try { await platformDb.user.deleteMany({ where: { email: { endsWith: `@${sub}.local` } } }); } catch { /* */ }
  await server.close();
  await platformDb.$disconnect();
});

const auth = (t: string) => ({ authorization: `Bearer ${t}` });

describe('signup (şifresiz)', () => {
  it('yeni restoran kaydı → TRIAL tenant + SETUP token; auto-login token DÖNMEZ', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/signup',
      payload: {
        name: 'Test Owner',
        email: `owner@${sub}.local`,
        restaurantName: 'Test Restoran',
        subdomain: sub,
        planKey: 'STARTER',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeUndefined(); // şifresiz akış: mail'deki linkle şifre kurulur
    expect(body.emailSent).toBe(true);
    expect(body.tenant.subdomain).toBe(sub);
    expect(body.tenant.status).toBe('TRIAL');
    tenantId = body.tenant.id;
    // 7 günlük deneme
    const days = Math.round((new Date(body.tenant.trialEndsAt).getTime() - Date.now()) / 864e5);
    expect(days).toBe(7);
    // SETUP token üretildi (mail içeriği)
    const owner = await platformDb.user.findUnique({ where: { email: `owner@${sub}.local` } });
    const setup = await platformDb.passwordToken.findFirst({ where: { userId: owner!.id, purpose: 'SETUP' } });
    expect(setup).toBeTruthy();
    // Testlerin geri kalanı için OWNER token'ı doğrudan üret
    ownerToken = signStaffToken({ userId: owner!.id, tenantId, role: 'OWNER' as any });
  });

  it('set-password: SETUP token ile şifre kurulur, token tükenir', async () => {
    const owner = await platformDb.user.findUnique({ where: { email: `owner@${sub}.local` } });
    const setup = await platformDb.passwordToken.findFirst({ where: { userId: owner!.id, purpose: 'SETUP' } });
    // token geçerliliği
    const check = await server.inject({ method: 'GET', url: `/api/platform/password-token/${setup!.token}` });
    expect(check.json().valid).toBe(true);
    // şifre kur
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/set-password',
      payload: { token: setup!.token, password: 'gizli123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().loginUrl).toContain(sub);
    // token tükendi
    const again = await server.inject({
      method: 'POST',
      url: '/api/platform/set-password',
      payload: { token: setup!.token, password: 'baska123' },
    });
    expect(again.statusCode).toBe(400);
    // yeni şifre bcrypt'e yazıldı
    const updated = await platformDb.user.findUnique({ where: { id: owner!.id } });
    expect(bcrypt.compareSync('gizli123', updated!.password)).toBe(true);
  });

  it('forgot-password: her durumda 200; var olan kullanıcıya RESET token üretir', async () => {
    const yok = await server.inject({
      method: 'POST',
      url: '/api/platform/forgot-password',
      payload: { email: 'yok@boyle.biri' },
    });
    expect(yok.statusCode).toBe(200); // enumeration koruması
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/forgot-password',
      payload: { email: `owner@${sub}.local` },
    });
    expect(res.statusCode).toBe(200);
    const owner = await platformDb.user.findUnique({ where: { email: `owner@${sub}.local` } });
    const reset = await platformDb.passwordToken.findFirst({ where: { userId: owner!.id, purpose: 'RESET' } });
    expect(reset).toBeTruthy();
  });

  it('alınmış subdomain 409', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/signup',
      payload: { name: 'x', email: `x@${sub}.local`, restaurantName: 'x', subdomain: sub },
    });
    expect(res.statusCode).toBe(409);
  });

  it('ayrılmış subdomain (api) reddedilir', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/platform/signup/check-subdomain?subdomain=api' });
    expect(res.json().available).toBe(false);
  });
});

describe('onboarding (OWNER)', () => {
  it('status → step 1', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/platform/onboarding/status', headers: auth(ownerToken) });
    expect(res.statusCode).toBe(200);
    expect(res.json().onboardingStep).toBe(1);
  });

  it('menü şablonu uygulanır (pizza)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/onboarding/menu-template',
      headers: auth(ownerToken),
      payload: { template: 'pizza' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().categories).toBeGreaterThan(0);
    // Tenant-scoped görünürlük: bu tenant menü kalemleri var
    const items = await dbFor(tenantId).menuItem.count();
    expect(items).toBeGreaterThan(0);
  });

  it('auth olmadan onboarding 401', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/platform/onboarding/status' });
    expect(res.statusCode).toBe(401);
  });
});

describe('billing (simüle iyzico)', () => {
  it('plan listesi public', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/platform/billing/plans' });
    expect(res.statusCode).toBe(200);
    expect(res.json().plans.length).toBeGreaterThanOrEqual(3);
  });

  it('kart saklanır (SIMÜLASYON)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/billing/card',
      headers: auth(ownerToken),
      payload: { cardHolderName: 'TEST OWNER', cardNumber: '5528790000000008', expireMonth: '12', expireYear: '2030', cvc: '123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().simulated).toBe(true);
  });

  it('PRO abonelik aktive olur (saklı karttan simüle çekim)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/billing/subscribe',
      headers: auth(ownerToken),
      payload: { planKey: 'PRO', cycle: 'MONTHLY' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.subscription.status).toBe('ACTIVE');
    expect(body.subscription.plan.key).toBe('PRO');
  });

  it('PRO paketinde campaigns feature açık', async () => {
    expect(await hasFeature(tenantId, 'campaigns')).toBe(true);
    expect(await hasFeature(tenantId, 'brandedApp')).toBe(false);
  });
});

describe('süper-admin', () => {
  let adminToken = '';
  it('login', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/admin/login',
      payload: { email: 'super@otorder.test', password: 'süpersifre' },
    });
    expect(res.statusCode).toBe(200);
    adminToken = res.json().token;
  });

  it('yetkisiz login 403', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/admin/login',
      payload: { email: 'random@x.com', password: 'x' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('tenant listesi bizim tenant\'ı içerir', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/platform/admin/tenants', headers: auth(adminToken) });
    expect(res.statusCode).toBe(200);
    expect(res.json().tenants.some((t: any) => t.id === tenantId)).toBe(true);
  });

  it('metrikler MRR döner', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/platform/admin/metrics', headers: auth(adminToken) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('mrr');
    expect(res.json()).toHaveProperty('activeSubscriptions');
  });

  it('impersonate → OWNER token üretir', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/platform/admin/tenants/${tenantId}/impersonate`,
      headers: auth(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().token).toBeTruthy();
    expect(res.json().tenant.id).toBe(tenantId);
  });

  it('normal owner token admin endpoint\'ine giremez (403)', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/platform/admin/tenants', headers: auth(ownerToken) });
    expect(res.statusCode).toBe(403);
  });
});

describe('plan limitleri (helper)', () => {
  it('assertWithinUserLimit sınırın altında false döner', async () => {
    const fakeReply: any = { status: () => fakeReply, send: () => fakeReply };
    // PRO maxUsers=15, tenant'ta 1 owner var → limit altı
    const blocked = await assertWithinUserLimit(tenantId, fakeReply);
    expect(blocked).toBe(false);
  });
});

// ============================================================================
// iyzico Abonelik API — checkout → callback → webhook → plan değişikliği
// (SIMÜLASYON: PLATFORM_IYZICO_API_KEY yok; deterministik sahte referanslar).
// ============================================================================
describe('iyzico subscription', () => {
  let checkoutToken = '';
  let subscriptionRef = '';
  let customerRef = '';

  // Webhook imzası — verifyWebhookSignatureV3 ile aynı formül
  // (SIMÜLASYON'da merchantId ve secretKey boş string).
  const webhookSig = (p: {
    iyziEventType: string;
    subscriptionReferenceCode: string;
    orderReferenceCode: string;
    customerReferenceCode: string;
  }) => {
    const merchantId = process.env.PLATFORM_IYZICO_MERCHANT_ID || '';
    const secret = process.env.PLATFORM_IYZICO_SECRET_KEY || '';
    return crypto
      .createHmac('sha256', secret)
      .update(
        merchantId + secret + p.iyziEventType + p.subscriptionReferenceCode + p.orderReferenceCode + p.customerReferenceCode,
        'utf8',
      )
      .digest('hex');
  };

  beforeAll(async () => {
    // Paralel geliştirme notu: signup artık token dönmüyorsa (şifre-maili akışı)
    // tenant'ı subdomain'den bul, OWNER token'ı membership'ten doğrudan üret —
    // bu testler signup yanıt şeklinden bağımsız çalışır.
    if (!tenantId) {
      const t = await platformDb.tenant.findUnique({ where: { subdomain: sub } });
      if (t) tenantId = t.id;
    }
    if (!ownerToken && tenantId) {
      const membership = await platformDb.membership.findFirst({ where: { tenantId, role: 'OWNER' } });
      if (membership) {
        ownerToken = signStaffToken({ userId: membership.userId, tenantId, role: 'OWNER' as any }, '1h');
      }
    }
    // Ücretli test planları (active:false → public plan listesini etkilemez)
    for (const [key, monthly, annual] of [
      ['IYZTEST', 499, 4990],
      ['IYZTEST2', 999, 9990],
    ] as const) {
      await platformDb.plan.upsert({
        where: { key },
        update: { monthlyPrice: monthly, annualPrice: annual, active: false },
        create: { key, name: key, monthlyPrice: monthly, annualPrice: annual, maxLocations: 3, maxUsers: 15, features: {}, active: false },
      });
    }
  });

  afterAll(async () => {
    // Abonelik test planına bağlı kaldıysa PRO'ya geri al (FK), sonra planları sil
    const pro = await platformDb.plan.findUnique({ where: { key: 'PRO' } });
    if (pro && tenantId) {
      try {
        await platformDb.subscription.update({
          where: { tenantId },
          data: { planId: pro.id, pendingPlanId: null, pendingCycle: null },
        });
      } catch { /* yoksa geç */ }
    }
    try { await platformDb.plan.deleteMany({ where: { key: { in: ['IYZTEST', 'IYZTEST2'] } } }); } catch { /* */ }
  });

  it('subscribe-checkout (SIMÜLASYON) → token + form; pendingCheckoutToken yazılır', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/billing/subscribe-checkout',
      headers: auth(ownerToken),
      payload: { planKey: 'IYZTEST', cycle: 'MONTHLY' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.simulated).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.checkoutFormContent).toContain('SIMULATED');
    checkoutToken = body.token;

    const sub = await platformDb.subscription.findUnique({ where: { tenantId } });
    expect(sub!.pendingCheckoutToken).toBe(checkoutToken);
    expect(sub!.pendingCycle).toBe('MONTHLY');
  });

  it('checkout-callback → 302 success + abonelik ACTIVE + iyzico referansları + işlem kaydı', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/billing/checkout-callback',
      payload: { token: checkoutToken },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('billing=success');

    const sub = await platformDb.subscription.findUnique({ where: { tenantId }, include: { plan: true } });
    expect(sub!.status).toBe('ACTIVE');
    expect(sub!.plan.key).toBe('IYZTEST');
    expect(sub!.iyzicoSubscriptionReferenceCode).toBeTruthy();
    expect(sub!.iyzicoCustomerReferenceCode).toBeTruthy();
    expect(sub!.pendingCheckoutToken).toBeNull();
    subscriptionRef = sub!.iyzicoSubscriptionReferenceCode!;
    customerRef = sub!.iyzicoCustomerReferenceCode!;

    const tx = await platformDb.billingTransaction.findFirst({
      where: { tenantId, iyzicoConversationId: checkoutToken },
    });
    expect(tx).toBeTruthy();
    expect(tx!.success).toBe(true);
    expect(Number(tx!.amount)).toBe(499);
  });

  it('bilinmeyen token → 302 billing=notfound', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/billing/checkout-callback',
      payload: { token: 'yok-boyle-token' },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('billing=notfound');
  });

  it('webhook success → dönem uzar; aynı orderReferenceCode idempotent', async () => {
    const before = await platformDb.subscription.findUnique({ where: { tenantId } });
    const orderRef = 'order-' + Math.random().toString(36).slice(2, 10);
    const payload = {
      iyziEventType: 'subscription.order.success',
      subscriptionReferenceCode: subscriptionRef,
      orderReferenceCode: orderRef,
      customerReferenceCode: customerRef,
      iyziEventTime: Date.now(),
    };
    const headers = { 'x-iyz-signature-v3': webhookSig(payload) };

    const res = await server.inject({ method: 'POST', url: '/api/platform/billing/iyzico-webhook', headers, payload });
    expect(res.statusCode).toBe(200);
    expect(res.json().received).toBe(true);

    const after = await platformDb.subscription.findUnique({ where: { tenantId } });
    expect(after!.status).toBe('ACTIVE');
    expect(after!.currentPeriodEnd!.getTime()).toBeGreaterThan(before!.currentPeriodEnd!.getTime());
    const tx = await platformDb.billingTransaction.findFirst({ where: { tenantId, iyzicoPaymentId: orderRef } });
    expect(tx!.success).toBe(true);

    // Idempotency: aynı orderReferenceCode ikinci kez → işlem sayısı artmaz
    const count1 = await platformDb.billingTransaction.count({ where: { tenantId } });
    const res2 = await server.inject({ method: 'POST', url: '/api/platform/billing/iyzico-webhook', headers, payload });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().received).toBe(true);
    const count2 = await platformDb.billingTransaction.count({ where: { tenantId } });
    expect(count2).toBe(count1);
  });

  it('geçersiz imzalı webhook işlenmez (yine de 200)', async () => {
    const before = await platformDb.billingTransaction.count({ where: { tenantId } });
    const payload = {
      iyziEventType: 'subscription.order.success',
      subscriptionReferenceCode: subscriptionRef,
      orderReferenceCode: 'order-' + Math.random().toString(36).slice(2, 10),
      customerReferenceCode: customerRef,
    };
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/billing/iyzico-webhook',
      headers: { 'x-iyz-signature-v3': 'gecersiz-imza' },
      payload,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().received).toBe(true);
    const after = await platformDb.billingTransaction.count({ where: { tenantId } });
    expect(after).toBe(before);
  });

  it('webhook failure → failedAttempts artar + PAST_DUE + başarısız işlem kaydı', async () => {
    const orderRef = 'order-' + Math.random().toString(36).slice(2, 10);
    const payload = {
      iyziEventType: 'subscription.order.failure',
      subscriptionReferenceCode: subscriptionRef,
      orderReferenceCode: orderRef,
      customerReferenceCode: customerRef,
    };
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/billing/iyzico-webhook',
      headers: { 'x-iyz-signature-v3': webhookSig(payload) },
      payload,
    });
    expect(res.statusCode).toBe(200);

    const sub = await platformDb.subscription.findUnique({ where: { tenantId } });
    expect(sub!.failedAttempts).toBe(1);
    expect(sub!.status).toBe('PAST_DUE');
    const tx = await platformDb.billingTransaction.findFirst({ where: { tenantId, iyzicoPaymentId: orderRef } });
    expect(tx).toBeTruthy();
    expect(tx!.success).toBe(false);
  });

  it('change-plan (SIMÜLASYON, upgrade) → yeni iyzico referansı + plan hemen değişir', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/billing/change-plan',
      headers: auth(ownerToken),
      payload: { planKey: 'IYZTEST2', cycle: 'MONTHLY' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.upgradePeriod).toBe('NOW'); // 999 > 499 → hemen uygula
    expect(body.subscription.plan.key).toBe('IYZTEST2');

    const sub = await platformDb.subscription.findUnique({ where: { tenantId }, include: { plan: true } });
    expect(sub!.plan.key).toBe('IYZTEST2');
    expect(sub!.status).toBe('ACTIVE');
    expect(sub!.iyzicoSubscriptionReferenceCode).toBeTruthy();
    expect(sub!.iyzicoSubscriptionReferenceCode).not.toBe(subscriptionRef);

    const tx = await platformDb.billingTransaction.findFirst({
      where: { tenantId, type: 'SUBSCRIPTION_UPGRADE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(tx).toBeTruthy();
    expect(tx!.success).toBe(true);
  });
});
