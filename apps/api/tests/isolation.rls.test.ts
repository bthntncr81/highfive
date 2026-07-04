// ============================================================================
// İZOLASYON HARNESS — Katman 2: Postgres RLS — extension'dan BAĞIMSIZ
// ============================================================================
// Bu katman raw SQL / ORM baypası durumunda son savunmadır. Extension raw SQL'i
// yeniden yazmaz; izolasyonu burada RLS + transaction-local `app.tenant_id` GUC
// sağlar. Kanıt: dbFor(A) üzerinden RAW sorgu bile SADECE A satırlarını görür.
//
// SADECE RLS açık + app rolü bağlıyken anlamlı. Aksi halde skip:
//   TENANT_RLS=on \
//   DATABASE_URL=postgresql://highfive:highfive123@localhost:55432/otorder_dev \
//   APP_DATABASE_URL=postgresql://highfive_app:app_pw_test@localhost:55432/otorder_dev \
//     npx vitest run tests/isolation.rls.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dbFor, platformDb } from '../src/lib/tenant-db';

const RLS_ON = process.env.TENANT_RLS === 'on' && !!process.env.APP_DATABASE_URL;

let A = '';
let B = '';

beforeAll(async () => {
  if (!RLS_ON) return;
  const a = await platformDb.tenant.findUnique({ where: { subdomain: 'demo-a' } });
  const b = await platformDb.tenant.findUnique({ where: { subdomain: 'demo-b' } });
  A = a!.id;
  B = b!.id;
});

afterAll(async () => {
  await platformDb.$disconnect();
});

describe.skipIf(!RLS_ON)('RLS backstop — raw SQL izolasyonu', () => {
  it('dbFor(A) RAW count sadece A satırlarını sayar (extension raw\'ı sarmaz, RLS filtreler)', async () => {
    const dbA = dbFor(A);
    // Toplam müşteri (owner gözüyle) >= 2 (A + B). RLS altında A sadece kendini görür.
    const totalOwner = await platformDb.customer.count();
    expect(totalOwner).toBeGreaterThanOrEqual(2);

    const rawA: any[] = await dbA.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "Customer"');
    const aOwnerCount = await platformDb.customer.count({ where: { tenantId: A } });
    expect(rawA[0].n).toBe(aOwnerCount);
    expect(rawA[0].n).toBeLessThan(totalOwner); // B'yi görmüyor
  });

  it('dbFor(A) RAW ile B marker satırı ÇEKEMEZ (0 satır)', async () => {
    const dbA = dbFor(A);
    const rows: any[] = await dbA.$queryRawUnsafe(
      `SELECT id FROM "Customer" WHERE name LIKE 'XTENANT_B_%'`,
    );
    expect(rows).toHaveLength(0);
  });

  it('dbFor(A) RAW ile B\'nin coupon\'ını id ile çekemez', async () => {
    const dbA = dbFor(A);
    const bCoupon = await platformDb.coupon.findFirst({ where: { tenantId: B } });
    const rows: any[] = await dbA.$queryRawUnsafe(
      `SELECT id FROM "Coupon" WHERE id = $1`,
      bCoupon!.id,
    );
    expect(rows).toHaveLength(0);
  });
});

// RLS kapalıyken: raw SQL'in extension tarafından KORUNMADIĞINI belgeleyen kontrol
// (bu yüzden RLS backstop gerekir). Owner bağlantı bypass eder → hepsini görür.
describe.skipIf(RLS_ON)('RLS kapalı — raw SQL extension tarafından korunmuyor (belge)', () => {
  it('owner bağlantıda RAW count tüm tenantları görür (RLS gerekçesi)', async () => {
    const a = await platformDb.tenant.findUnique({ where: { subdomain: 'demo-a' } });
    if (!a) return;
    const dbA = dbFor(a.id);
    const rawAll: any[] = await dbA.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "Customer"');
    const totalOwner = await platformDb.customer.count();
    // Extension raw'ı sarmaz + owner RLS'i bypass eder → raw hepsini görür.
    expect(rawAll[0].n).toBe(totalOwner);
  });
});
