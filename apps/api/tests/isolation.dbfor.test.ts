// ============================================================================
// İZOLASYON HARNESS — Katman 1: Prisma extension (dbFor) — RLS'ten BAĞIMSIZ
// ============================================================================
// Gerçek Postgres'e karşı koşar (migrate DB / CI dockerized). demo-a & demo-b
// seed'li olmalı (packages/database/prisma/seed-tenants.ts). Tenant B'nin tüm
// satırları "XTENANT_B_*" marker'ı taşır.
//
// Kanıt: A kimliğiyle (dbFor(A)) yapılan HİÇBİR sorgu B'nin satırlarını görmez,
// güncelleyemez, silemez; çapraz unique (aynı kupon kodu / settings key) doğru
// tenant'a çözülür; create tenantId'yi A ile damgalar. Bu katman RLS KAPALI iken
// (owner bağlantı, varsayılan) tek başına izolasyonu garanti eder.
//
// Çalıştırma:
//   DATABASE_URL=postgresql://highfive:highfive123@localhost:55432/otorder_dev \
//     npx vitest run tests/isolation.dbfor.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Prisma } from '@prisma/client';
import { dbFor, platformDb } from '../src/lib/tenant-db';

let A = ''; // demo-a tenantId
let B = ''; // demo-b tenantId

beforeAll(async () => {
  const a = await platformDb.tenant.findUnique({ where: { subdomain: 'demo-a' } });
  const b = await platformDb.tenant.findUnique({ where: { subdomain: 'demo-b' } });
  if (!a || !b) throw new Error('demo-a/demo-b seed edilmemiş — seed-tenants.ts çalıştır');
  A = a.id;
  B = b.id;
});

afterAll(async () => {
  await platformDb.$disconnect();
});

// Marker taşıyan seed modelleri: (prisma model erişimcisi, B satırını bulan sorgu)
const MODELS: Array<{
  name: string;
  find: (db: any) => Promise<any[]>;
  bMarker: RegExp;
  markerText: (row: any) => string;
}> = [
  { name: 'customer', find: (db) => db.customer.findMany(), bMarker: /XTENANT_B_Customer/, markerText: (r) => r.name },
  { name: 'coupon', find: (db) => db.coupon.findMany(), bMarker: /XTENANT_B_Coupon/, markerText: (r) => r.name },
  { name: 'menuItem', find: (db) => db.menuItem.findMany(), bMarker: /XTENANT_B_MenuItem/, markerText: (r) => r.name },
  { name: 'category', find: (db) => db.category.findMany(), bMarker: /XTENANT_B_Category/, markerText: (r) => r.name },
  { name: 'table', find: (db) => db.table.findMany(), bMarker: /XTENANT_B_Table/, markerText: (r) => r.name ?? '' },
  { name: 'location', find: (db) => db.location.findMany(), bMarker: /XTENANT_B_Location/, markerText: (r) => r.name },
];

describe('dbFor extension — cross-tenant read isolation', () => {
  it('A kimliği hiçbir modelde B marker satırını LİSTELEMEZ', async () => {
    const dbA = dbFor(A);
    for (const m of MODELS) {
      const rows = await m.find(dbA);
      const leaked = rows.filter((r) => m.bMarker.test(m.markerText(r) ?? ''));
      expect(leaked, `${m.name}: B satırı A'ya sızdı`).toHaveLength(0);
      // her satır A'ya ait olmalı
      expect(rows.every((r) => r.tenantId === A), `${m.name}: yabancı tenantId`).toBe(true);
    }
  });

  it('A, B satırını id ile findFirst/findUnique ile ÇEKEMEZ', async () => {
    const dbA = dbFor(A);
    const bCustomer = await platformDb.customer.findFirst({ where: { tenantId: B } });
    const bCoupon = await platformDb.coupon.findFirst({ where: { tenantId: B } });
    expect(bCustomer && bCoupon).toBeTruthy();

    expect(await dbA.customer.findFirst({ where: { id: bCustomer!.id } })).toBeNull();
    expect(await dbA.customer.findUnique({ where: { id: bCustomer!.id } })).toBeNull();
    expect(await dbA.coupon.findFirst({ where: { id: bCoupon!.id } })).toBeNull();
  });

  it('çapraz UNIQUE (aynı kupon kodu her iki tenant) doğru tenant\'a çözülür', async () => {
    const cA = await dbFor(A).coupon.findFirst({ where: { code: 'HOSGELDIN20' } });
    const cB = await dbFor(B).coupon.findFirst({ where: { code: 'HOSGELDIN20' } });
    expect(cA?.name).toBe('TenantA Coupon');
    expect(cB?.name).toBe('XTENANT_B_Coupon');
    expect(cA?.id).not.toBe(cB?.id);
  });

  it('çapraz UNIQUE settings key doğru tenant\'a çözülür', async () => {
    const sA = await dbFor(A).settings.findFirst({ where: { key: 'restaurant' } });
    const sB = await dbFor(B).settings.findFirst({ where: { key: 'restaurant' } });
    expect((sA?.value as any)?.name).toBe('TenantA Settings');
    expect((sB?.value as any)?.name).toBe('XTENANT_B_Settings');
  });
});

describe('dbFor extension — cross-tenant write isolation', () => {
  it('A, B satırını update ile DEĞİŞTİREMEZ (P2025)', async () => {
    const dbA = dbFor(A);
    const bCustomer = await platformDb.customer.findFirst({ where: { tenantId: B } });
    await expect(
      dbA.customer.update({ where: { id: bCustomer!.id }, data: { name: 'HACKED' } }),
    ).rejects.toMatchObject({ code: 'P2025' });
    // B satırı değişmemiş olmalı
    const after = await platformDb.customer.findUnique({ where: { id: bCustomer!.id } });
    expect(after?.name).toBe('XTENANT_B_Customer');
  });

  it('A, B satırını deleteMany ile SİLEMEZ (count 0, satır durur)', async () => {
    const dbA = dbFor(A);
    const bCoupon = await platformDb.coupon.findFirst({ where: { tenantId: B } });
    const res = await dbA.coupon.deleteMany({ where: { id: bCoupon!.id } });
    expect(res.count).toBe(0);
    const after = await platformDb.coupon.findUnique({ where: { id: bCoupon!.id } });
    expect(after).not.toBeNull();
  });

  it('create tenantId\'yi A ile DAMGALAR (data\'da tenantId verilmese bile)', async () => {
    const dbA = dbFor(A);
    const created = await dbA.category.create({ data: { name: 'probe-isolation', sortOrder: 99 } as any });
    try {
      expect(created.tenantId).toBe(A);
      // B kimliğinden görünmemeli
      const fromB = await dbFor(B).category.findFirst({ where: { id: created.id } });
      expect(fromB).toBeNull();
    } finally {
      await platformDb.category.delete({ where: { id: created.id } });
    }
  });
});

describe('coverage-gate — HER model sınıflandırılmış olmalı', () => {
  // Yeni bir model eklenip tenantId unutulursa (ve platform allowlist'e de
  // konmazsa) bu test FAIL eder → scoping kararı verilmeden model eklenemez.
  const PLATFORM_ALLOWLIST = new Set(['User', 'Tenant', 'Plan']);

  it('her DMMF modeli ya tenantId taşır ya da platform allowlist\'inde', () => {
    const unclassified: string[] = [];
    for (const m of Prisma.dmmf.datamodel.models) {
      const hasTenant = m.fields.some((f) => f.name === 'tenantId');
      if (!hasTenant && !PLATFORM_ALLOWLIST.has(m.name)) unclassified.push(m.name);
    }
    expect(unclassified, `sınıflandırılmamış model(ler): ${unclassified.join(', ')}`).toHaveLength(0);
  });
});
