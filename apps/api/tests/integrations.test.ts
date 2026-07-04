// ============================================================================
// "Bağlan" akışı + external API tenant çözümleme (API key'den) — E2E.
// ============================================================================
// - PRO tenant → /whatsapp/connect → apiKey + config
// - Modül simülasyonu: X-API-Key ile /api/external/menu → SADECE o tenant'ın menüsü
// - STARTER tenant → connect 403 (whatsappLink feature-lock)
// - Geçersiz API key → 401
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildServer } from '../src/server';
import { platformDb } from '../src/lib/tenant-db';

let server: FastifyInstance;
const suffix = Math.random().toString(36).slice(2, 7);
const proSub = 'wapro' + suffix;
const starterSub = 'wastart' + suffix;
let proToken = '';
let starterToken = '';
let proTenantId = '';
let starterTenantId = '';
let apiKey = '';

const auth = (t: string) => ({ authorization: `Bearer ${t}` });

async function signup(sub: string, planKey: string) {
  const res = await server.inject({
    method: 'POST',
    url: '/api/platform/signup',
    payload: {
      name: 'Owner', email: `o@${sub}.local`, password: 'gizli123',
      restaurantName: sub, subdomain: sub, planKey,
    },
  });
  return res.json();
}

beforeAll(async () => {
  server = await buildServer({ prisma: new PrismaClient(), logger: false });
  await server.ready();
  const pro = await signup(proSub, 'PRO');
  proToken = pro.token; proTenantId = pro.tenant.id;
  const st = await signup(starterSub, 'STARTER');
  starterToken = st.token; starterTenantId = st.tenant.id;
});

afterAll(async () => {
  for (const tid of [proTenantId, starterTenantId]) {
    if (!tid) continue;
    for (const del of [
      () => platformDb.webhookLog.deleteMany({ where: { tenantId: tid } }),
      () => platformDb.integrationPartner.deleteMany({ where: { tenantId: tid } }),
      () => platformDb.menuItem.deleteMany({ where: { tenantId: tid } }),
      () => platformDb.category.deleteMany({ where: { tenantId: tid } }),
      () => platformDb.location.deleteMany({ where: { tenantId: tid } }),
      () => platformDb.subscription.deleteMany({ where: { tenantId: tid } }),
      () => platformDb.membership.deleteMany({ where: { tenantId: tid } }),
      () => platformDb.tenant.delete({ where: { id: tid } }),
    ]) { try { await del(); } catch { /* */ } }
  }
  await server.close();
  await platformDb.$disconnect();
});

describe('Bağlan (PRO)', () => {
  it('connect → apiKey + config döner', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/integrations/whatsapp/connect',
      headers: auth(proToken),
      payload: { webhookUrl: 'https://order.example.com/webhook' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.connected).toBe(true);
    expect(body.config.posApiKey).toBeTruthy();
    expect(body.config.posApiUrl).toContain(proSub);
    apiKey = body.config.posApiKey;
  });

  it('status → connected', async () => {
    const res = await server.inject({
      method: 'GET', url: '/api/integrations/whatsapp/status', headers: auth(proToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().connected).toBe(true);
  });

  it('modül simülasyonu: X-API-Key ile /api/external/menu → 200 (tenant-scoped)', async () => {
    // Önce menü şablonu uygula (bu tenant'a veri koy)
    await server.inject({
      method: 'POST', url: '/api/platform/onboarding/menu-template',
      headers: auth(proToken), payload: { template: 'pizza' },
    });
    const res = await server.inject({
      method: 'GET', url: '/api/external/menu', headers: { 'x-api-key': apiKey },
    });
    expect(res.statusCode).toBe(200);
    const menu = res.json();
    const blob = JSON.stringify(menu);
    // Bu tenant'ın ürünleri görünür; başka tenant markerı YOK
    expect(blob).toContain('Margherita');
    expect(blob).not.toContain('XTENANT_B_');
  });

  it('geçersiz API key → 401', async () => {
    const res = await server.inject({
      method: 'GET', url: '/api/external/menu', headers: { 'x-api-key': 'bogus-key-123' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('feature-lock (STARTER)', () => {
  it('STARTER connect → 403 FEATURE_LOCKED', async () => {
    const res = await server.inject({
      method: 'POST', url: '/api/integrations/whatsapp/connect',
      headers: auth(starterToken), payload: {},
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('FEATURE_LOCKED');
  });
});
