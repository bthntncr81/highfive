// ============================================================================
// Mail akışları — tenant markalı sipariş/kampanya e-postaları + unsubscribe.
// ============================================================================
// Gerçek Postgres'e karşı (demo-a seed'i şart — seed-tenants.ts). RESEND_API_KEY
// test ortamında YOK → sendMail {ok:false} döner ama mailer EmailLog satırını
// yine de yazar; doğrulamalar EmailLog üzerinden yapılır.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildServer } from '../src/server';
import { platformDb, dbFor } from '../src/lib/tenant-db';
import { notifyOrderStatus, notifyNewOrder } from '../src/lib/order-notify';
import { makeUnsubscribeToken, verifyUnsubscribeToken } from '../src/routes/auth';

// Bu suite'in yarattığı her şey bu domain ile işaretlenir → temizlik kolay
const MAIL_DOMAIN = 'mail-flows.local';

let server: FastifyInstance;
let A = ''; // demo-a tenantId
// orderNotifications ayarının test öncesi hali (afterAll'da geri yüklenir)
let savedNotifyValue: unknown;
let hadNotifyRow = false;

async function setNotifySettings(value: Record<string, unknown>): Promise<void> {
  await platformDb.settings.upsert({
    where: { tenantId_key: { tenantId: A, key: 'orderNotifications' } },
    update: { value: value as any },
    create: { tenantId: A, key: 'orderNotifications', value: value as any },
  });
}

async function createOrder(data: Record<string, unknown>) {
  return platformDb.order.create({
    data: {
      tenantId: A,
      type: 'DELIVERY',
      subtotal: 100,
      total: 100,
      ...data,
    } as any,
  });
}

beforeAll(async () => {
  server = await buildServer({ prisma: new PrismaClient(), logger: false });
  await server.ready();

  const a = await platformDb.tenant.findUnique({ where: { subdomain: 'demo-a' } });
  if (!a) throw new Error('demo-a seed edilmemiş — packages/database/prisma/seed-tenants.ts çalıştır');
  A = a.id;

  const existing = await platformDb.settings.findUnique({
    where: { tenantId_key: { tenantId: A, key: 'orderNotifications' } },
  });
  hadNotifyRow = !!existing;
  savedNotifyValue = existing?.value;

  // Deterministik başlangıç: statusEmails anahtarı YOK → tüm durum mailleri
  // varsayılan AÇIK olmalı (dev DB'de kalmış eski ayarlardan etkilenme).
  await setNotifySettings({ enabled: true, emails: [] });
});

afterAll(async () => {
  // Suite'in bıraktığı izleri sil (bağımlılık sırasıyla)
  try { await platformDb.emailLog.deleteMany({ where: { toEmail: { endsWith: `@${MAIL_DOMAIN}` } } }); } catch { /* */ }
  try { await platformDb.order.deleteMany({ where: { tenantId: A, customerEmail: { endsWith: `@${MAIL_DOMAIN}` } } }); } catch { /* */ }
  try { await platformDb.customer.deleteMany({ where: { tenantId: A, email: { endsWith: `@${MAIL_DOMAIN}` } } }); } catch { /* */ }
  // orderNotifications ayarını eski haline döndür
  try {
    if (hadNotifyRow) {
      await platformDb.settings.update({
        where: { tenantId_key: { tenantId: A, key: 'orderNotifications' } },
        data: { value: savedNotifyValue as any },
      });
    } else {
      await platformDb.settings.deleteMany({ where: { tenantId: A, key: 'orderNotifications' } });
    }
  } catch { /* */ }
  await server.close();
  await platformDb.$disconnect();
});

describe('notifyOrderStatus (tenant markalı durum mailleri)', () => {
  it('PREPARING → EmailLog: template order-status-preparing, from demo-a@otorder.com', async () => {
    const order = await createOrder({
      customerName: 'Durum Testi',
      customerEmail: `preparing@${MAIL_DOMAIN}`,
      status: 'PREPARING',
    });

    await notifyOrderStatus(dbFor(A), order.id, 'PREPARING');

    const log = await platformDb.emailLog.findFirst({
      where: { toEmail: `preparing@${MAIL_DOMAIN}`, template: 'order-status-preparing' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.tenantId).toBe(A);
    expect(log!.fromEmail).toBe('demo-a@otorder.com');
    expect(log!.subject).toContain('hazırlanıyor');
  });

  it('OUT_FOR_DELIVERY (kurye) → ready grubu, "yolda" konusu', async () => {
    const order = await createOrder({
      customerEmail: `yolda@${MAIL_DOMAIN}`,
      type: 'DELIVERY',
      status: 'OUT_FOR_DELIVERY',
    });

    await notifyOrderStatus(dbFor(A), order.id, 'OUT_FOR_DELIVERY');

    const log = await platformDb.emailLog.findFirst({
      where: { toEmail: `yolda@${MAIL_DOMAIN}`, template: 'order-status-out_for_delivery' },
    });
    expect(log).toBeTruthy();
    expect(log!.subject).toContain('yolda');
  });

  it('customerEmail yoksa sessiz döner — EmailLog satırı yazılmaz', async () => {
    // Sayım bu suite'in kendi domain'i ile sınırlı — paralel koşan diğer test
    // dosyalarının tenant-A logları sayacı şaşırtamaz.
    const domainCount = () =>
      platformDb.emailLog.count({ where: { toEmail: { endsWith: `@${MAIL_DOMAIN}` } } });

    const before = await domainCount();
    const order = await createOrder({ customerEmail: null, customerName: `NoMail @${MAIL_DOMAIN}` });

    await notifyOrderStatus(dbFor(A), order.id, 'PREPARING');

    expect(await domainCount()).toBe(before);
    // temizlik: customerEmail null olduğundan domain filtresine takılmaz
    await platformDb.order.delete({ where: { id: order.id } });
  });

  it('statusEmails.cancelled=false → CANCELLED maili GÖNDERİLMEZ; delivered (anahtar yok) varsayılan AÇIK', async () => {
    await setNotifySettings({ enabled: true, emails: [], statusEmails: { cancelled: false } });

    const cancelled = await createOrder({ customerEmail: `iptal@${MAIL_DOMAIN}`, status: 'CANCELLED' });
    await notifyOrderStatus(dbFor(A), cancelled.id, 'CANCELLED');
    const cancelLog = await platformDb.emailLog.findFirst({
      where: { toEmail: `iptal@${MAIL_DOMAIN}` },
    });
    expect(cancelLog).toBeNull();

    // Aynı ayar objesinde delivered anahtarı YOK → varsayılan true, mail gider
    const delivered = await createOrder({ customerEmail: `teslim@${MAIL_DOMAIN}`, status: 'DELIVERED' });
    await notifyOrderStatus(dbFor(A), delivered.id, 'DELIVERED');
    const deliveredLog = await platformDb.emailLog.findFirst({
      where: { toEmail: `teslim@${MAIL_DOMAIN}`, template: 'order-status-delivered' },
    });
    expect(deliveredLog).toBeTruthy();
    expect(deliveredLog!.subject).toContain('Afiyet');
  });

  it('READY yalnız gel-al (TAKEAWAY) için maillenir — DELIVERY siparişinde atlanır', async () => {
    await setNotifySettings({ enabled: true, emails: [] });

    const deliveryOrder = await createOrder({ customerEmail: `ready-delivery@${MAIL_DOMAIN}`, type: 'DELIVERY', status: 'READY' });
    await notifyOrderStatus(dbFor(A), deliveryOrder.id, 'READY');
    expect(
      await platformDb.emailLog.findFirst({ where: { toEmail: `ready-delivery@${MAIL_DOMAIN}` } }),
    ).toBeNull();

    const takeawayOrder = await createOrder({ customerEmail: `ready-gelal@${MAIL_DOMAIN}`, type: 'TAKEAWAY', status: 'READY' });
    await notifyOrderStatus(dbFor(A), takeawayOrder.id, 'READY');
    const log = await platformDb.emailLog.findFirst({
      where: { toEmail: `ready-gelal@${MAIL_DOMAIN}`, template: 'order-status-ready' },
    });
    expect(log).toBeTruthy();
    expect(log!.subject).toContain('hazır');
  });
});

describe('notifyNewOrder (tenant markalı onay + admin bildirimi)', () => {
  it('müşteri onayı + admin bildirimi ayrı şablonlarla EmailLog\'a düşer', async () => {
    await setNotifySettings({ enabled: true, emails: [`admin@${MAIL_DOMAIN}`] });

    const order = await createOrder({
      customerName: 'Onay Testi',
      customerEmail: `onay@${MAIL_DOMAIN}`,
    });

    await notifyNewOrder(dbFor(A), order.id);

    const customerLog = await platformDb.emailLog.findFirst({
      where: { toEmail: `onay@${MAIL_DOMAIN}`, template: 'order-new-customer' },
    });
    expect(customerLog).toBeTruthy();
    expect(customerLog!.fromEmail).toBe('demo-a@otorder.com');

    const adminLog = await platformDb.emailLog.findFirst({
      where: { toEmail: `admin@${MAIL_DOMAIN}`, template: 'order-new-admin' },
    });
    expect(adminLog).toBeTruthy();
    expect(adminLog!.subject).toContain('Yeni');
  });

  it('enabled=false → hiçbir mail gitmez', async () => {
    await setNotifySettings({ enabled: false, emails: [`admin2@${MAIL_DOMAIN}`] });
    const order = await createOrder({ customerEmail: `kapali@${MAIL_DOMAIN}` });

    await notifyNewOrder(dbFor(A), order.id);

    expect(
      await platformDb.emailLog.findFirst({
        where: { toEmail: { in: [`kapali@${MAIL_DOMAIN}`, `admin2@${MAIL_DOMAIN}`] } },
      }),
    ).toBeNull();
  });
});

describe('unsubscribe token + endpoint', () => {
  it('token round-trip: makeUnsubscribeToken → GET → emailConsent=false', async () => {
    const customer = await platformDb.customer.create({
      data: { tenantId: A, email: `unsub@${MAIL_DOMAIN}`, emailConsent: true, isActive: true },
    });

    const token = makeUnsubscribeToken(customer.id);
    expect(verifyUnsubscribeToken(token)).toBe(customer.id);

    const res = await server.inject({
      method: 'GET',
      url: `/api/auth/customer/email/unsubscribe?token=${encodeURIComponent(token)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('çıkarıldın');

    const updated = await platformDb.customer.findUnique({ where: { id: customer.id } });
    expect(updated!.emailConsent).toBe(false);
  });

  it('bozuk / sahte imzalı token → 400, consent değişmez', async () => {
    const customer = await platformDb.customer.create({
      data: { tenantId: A, email: `unsub2@${MAIL_DOMAIN}`, emailConsent: true, isActive: true },
    });

    // imzası başka id'ye ait token
    const forged = Buffer.from(`${customer.id}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`, 'utf8').toString('base64url');
    expect(verifyUnsubscribeToken(forged)).toBeNull();

    for (const bad of ['bozuk-token', forged]) {
      const res = await server.inject({
        method: 'GET',
        url: `/api/auth/customer/email/unsubscribe?token=${encodeURIComponent(bad)}`,
      });
      expect(res.statusCode).toBe(400);
    }

    const still = await platformDb.customer.findUnique({ where: { id: customer.id } });
    expect(still!.emailConsent).toBe(true);
  });

  it('token parametresi yoksa 400', async () => {
    const res = await server.inject({ method: 'GET', url: '/api/auth/customer/email/unsubscribe' });
    expect(res.statusCode).toBe(400);
  });
});
