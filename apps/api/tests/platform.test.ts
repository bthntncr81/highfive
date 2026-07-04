// ============================================================================
// Platform (SaaS) E2E — signup → onboarding → billing (simüle iyzico) → süper-admin.
// ============================================================================
// Gerçek Postgres'e karşı (migrate DB / CI). Platform iyzico SIMÜLASYON modunda
// (PLATFORM_IYZICO_API_KEY yok) → kart/abonelik akışı uçtan uca test edilir.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { buildServer } from '../src/server';
import { platformDb, dbFor } from '../src/lib/tenant-db';
import { assertWithinUserLimit, hasFeature } from '../src/lib/plan-limits';

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
  try { await platformDb.user.deleteMany({ where: { email: { endsWith: `@${sub}.local` } } }); } catch { /* */ }
  await server.close();
  await platformDb.$disconnect();
});

const auth = (t: string) => ({ authorization: `Bearer ${t}` });

describe('signup', () => {
  it('yeni restoran kaydı → OWNER token + TRIAL tenant', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/signup',
      payload: {
        name: 'Test Owner',
        email: `owner@${sub}.local`,
        password: 'gizli123',
        restaurantName: 'Test Restoran',
        subdomain: sub,
        planKey: 'STARTER',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeTruthy();
    expect(body.tenant.subdomain).toBe(sub);
    expect(body.tenant.status).toBe('TRIAL');
    ownerToken = body.token;
    tenantId = body.tenant.id;
  });

  it('alınmış subdomain 409', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/platform/signup',
      payload: { name: 'x', email: `x@${sub}.local`, password: 'gizli123', restaurantName: 'x', subdomain: sub },
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
