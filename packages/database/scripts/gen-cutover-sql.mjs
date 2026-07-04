#!/usr/bin/env node
// ============================================================================
// gen-cutover-sql.mjs — Akçakoca (tek-kiracılı) → OtOrder (çok-kiracılı) CUTOVER SQL.
// ============================================================================
// Üretir: cutover.generated.sql
//   1. Generic plpgsql kopyalayıcı: staging.<tbl> → public.<tbl>, ORTAK kolonları
//      (information_schema kesişimi) taşır + "tenantId" enjekte eder (şema kayması
//      toleranslı). cuid'ler KORUNUR (id kolonu kopyalanır).
//   2. FK-sıralı (topolojik) çağrı listesi — parent tablolar önce.
//   3. User → User + Membership BÖLME (eski User.role/pin/locationId → Membership).
//   4. Doğrulama: her tablo için staging vs public satır sayısı.
//
// Kullanım:
//   node gen-cutover-sql.mjs                 # cutover.generated.sql üret
//   node gen-cutover-sql.mjs --print-order   # sadece FK sırasını yazdır (DRY)
//
// Çalıştırma (target DB'de, staging şeması pg_dump ile hazır):
//   psql "$TARGET_DATABASE_URL" \
//     -v tenant_id="'<cuid>'" -v subdomain="'akcakoca'" -v tenant_name="'High Five'" \
//     -f cutover.generated.sql

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pkg from '@prisma/client';
const { Prisma } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const models = Prisma.dmmf.datamodel.models;
const tenantModels = models.filter((m) => m.fields.some((f) => f.name === 'tenantId'));
const tenantNames = new Set(tenantModels.map((m) => m.name));
const tableOf = (m) => m.dbName || m.name;

// FK kenarları: A modeli, relationFromFields ile B'ye bağlıysa B önce gelmeli.
// Yalnız tenant-içi kenarları dikkate al (platform modelleri zaten mevcut); self-ref atla.
const deps = new Map(); // model → Set(bağımlı olduğu tenant modelleri)
for (const m of tenantModels) deps.set(m.name, new Set());
for (const m of tenantModels) {
  for (const f of m.fields) {
    if (f.relationFromFields && f.relationFromFields.length && tenantNames.has(f.type) && f.type !== m.name) {
      deps.get(m.name).add(f.type);
    }
  }
}

// Kahn topolojik sıralama (deterministik: alfabetik tie-break)
const order = [];
const remaining = new Set(tenantModels.map((m) => m.name));
while (remaining.size) {
  const ready = [...remaining].filter((n) => [...deps.get(n)].every((d) => !remaining.has(d))).sort();
  if (ready.length === 0) {
    // Döngü (self-ref zinciri vb.) — kalanları alfabetik ekle (ON CONFLICT + FK deferred kurtarır)
    order.push(...[...remaining].sort());
    break;
  }
  for (const n of ready) { order.push(n); remaining.delete(n); }
}

if (process.argv.includes('--print-order')) {
  console.log(`# FK-sıralı ${order.length} tenant tablosu:\n` + order.map((n, i) => `${String(i + 1).padStart(2)}. ${n}`).join('\n'));
  process.exit(0);
}

const orderedTables = order.map((n) => tableOf(models.find((m) => m.name === n)));

const sql = `-- ============================================================================
-- CUTOVER: Akçakoca (staging, tek-kiracılı) → OtOrder public (çok-kiracılı)
-- ÜRETİLDİ: gen-cutover-sql.mjs — ELLE DÜZENLEME. Idempotent (ON CONFLICT DO NOTHING).
-- ============================================================================
-- Gerekli psql değişkenleri (colon-quote ile kullanılır): tenant_id subdomain tenant_name
--   örn: -v tenant_id=<cuid> -v subdomain=akcakoca -v tenant_name="High Five"
-- Ön koşul: eski prod pg_dump ile "staging" şemasına restore edilmiş olmalı.
\\set ON_ERROR_STOP on
BEGIN;

-- Tenant id'yi session GUC'sine koy → plpgsql içinde current_setting ile okunur
-- (psql :değişken interpolasyonu ile %L çift-tırnak sorununu tümüyle önler).
SELECT set_config('cutover.tid', :'tenant_id', false);

-- 0) Tenant + (varsayılan) Plan/Subscription — cuid :tenant_id ile KORUNUR/oluşturulur
INSERT INTO public."Tenant" (id, name, subdomain, status, "onboardingStep", "onboardingCompletedAt", "createdAt", "updatedAt")
VALUES (:'tenant_id', :'tenant_name', :'subdomain', 'ACTIVE', 5, now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Subscription" (id, "tenantId", "planId", status, cycle, "currentPeriodStart", "currentPeriodEnd", "autoRenew", "createdAt", "updatedAt")
SELECT 'sub_' || :'tenant_id', :'tenant_id', p.id, 'ACTIVE', 'MONTHLY', now(), now() + interval '100 years', true, now(), now()
FROM public."Plan" p WHERE p.key = 'ENTERPRISE'
ON CONFLICT ("tenantId") DO NOTHING;

-- 1) Generic kopyalayıcı: ORTAK kolonlar (kesişim) + "tenantId" enjekte (GUC'ten)
CREATE OR REPLACE FUNCTION pg_temp._copy_tenant_table(p_table text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  cols text;
  n bigint;
BEGIN
  -- staging ve public'te ORTAK olan, tenantId HARİÇ kolonlar
  SELECT string_agg(format('%I', s.column_name), ', ')
    INTO cols
  FROM information_schema.columns s
  JOIN information_schema.columns d
    ON d.table_schema = 'public' AND d.table_name = p_table AND d.column_name = s.column_name
  WHERE s.table_schema = 'staging' AND s.table_name = p_table
    AND s.column_name <> 'tenantId';

  IF cols IS NULL THEN
    RAISE NOTICE 'ATLA %: staging tablosu/kolonu yok', p_table;
    RETURN 0;
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I (%s, %I) SELECT %s, %L FROM staging.%I ON CONFLICT DO NOTHING',
    p_table, cols, 'tenantId', cols, current_setting('cutover.tid'), p_table
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'kopyalandı %: % satır', p_table, n;
  RETURN n;
END $$;

-- 2) User → User + Membership BÖLME.
--    2a) User (platform kimliği): staging.User ∩ public.User ORTAK kolonlar dinamik
--        kopyalanır (role/pin/locationId yeni User'da YOK → kesişimde gelmez). cuid KORUNUR.
DO $$
DECLARE cols text; n bigint;
BEGIN
  SELECT string_agg(format('%I', s.column_name), ', ') INTO cols
  FROM information_schema.columns s
  JOIN information_schema.columns d
    ON d.table_schema='public' AND d.table_name='User' AND d.column_name=s.column_name
  WHERE s.table_schema='staging' AND s.table_name='User';
  EXECUTE format('INSERT INTO public."User" (%s) SELECT %s FROM staging."User" ON CONFLICT (id) DO NOTHING', cols, cols);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'User kopyalandı: % satır', n;
END $$;

--    2b) Membership: eski User.role/pin/locationId → bu tenant için üyelik.
INSERT INTO public."Membership" (id, "userId", "tenantId", role, pin, "locationId", active, "createdAt", "updatedAt")
SELECT 'mb_' || u.id, u.id, :'tenant_id',
       COALESCE(u.role::text, 'WAITER')::"UserRole",
       u.pin, u."locationId", COALESCE(u.active, true), now(), now()
FROM staging."User" u
ON CONFLICT ("userId", "tenantId") DO NOTHING;

-- 3) FK-sıralı tenant tabloları (parent → child); id/cuid KORUNUR
${orderedTables.map((t) => `SELECT pg_temp._copy_tenant_table('${t}');`).join('\n')}

-- 4) Doğrulama — staging vs public satır sayısı (fark olan tablolar listelenir)
DO $$
DECLARE r record; s bigint; d bigint; tid text := current_setting('cutover.tid');
BEGIN
  FOR r IN SELECT unnest(ARRAY[${orderedTables.map((t) => `'${t}'`).join(', ')}]) AS t LOOP
    -- Eski dump'ta olmayan (yeni) tablolar atlanır — abort etme
    IF to_regclass('staging."' || r.t || '"') IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT count(*) FROM staging.%I', r.t) INTO s;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE "tenantId" = %L', r.t, tid) INTO d;
    IF s <> d THEN RAISE WARNING 'SAYIM FARKI %: staging=% public=%', r.t, s, d; END IF;
  END LOOP;
  RAISE NOTICE 'Doğrulama tamam.';
END $$;

COMMIT;
`;

const out = resolve(__dirname, 'cutover.generated.sql');
writeFileSync(out, sql);
console.log(`WROTE ${out}\nFK-sıralı ${orderedTables.length} tablo. Sıra: ${order.slice(0, 6).join(' → ')} ...`);
