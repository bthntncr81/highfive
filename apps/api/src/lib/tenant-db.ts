// ============================================================================
// dbFor(tenantId) — merkezi çok-kiracılı Prisma client (izolasyonun kalbi)
// ============================================================================
// Katmanlar:
//  1. Uygulama katmanı (bu extension): tenantId alanı OLAN her model (DMMF'ten
//     otomatik) → her sorguya tenant filtresi enjekte edilir; create/upsert
//     data'sına tenantId yazılır (nested create'ler RECURSIVE damgalanır).
//     tenantId taşımayan modeller: PLATFORM_MODELS ise passthrough; değilse HATA
//     (default-deny — yeni model eklerken scoping unutulamaz).
//  2. Veritabanı katmanı (RLS backstop, opsiyonel — TENANT_RLS=on): her sorgu
//     transaction-local `app.tenant_id` GUC'si ile sarılır; app non-owner rolle
//     (APP_DATABASE_URL) bağlanır. Raw SQL / ORM baypası da RLS ile yakalanır.
//     RLS kapalıyken (varsayılan) sadece 1. katman çalışır — davranış aynıdır.
//
// Kullanım: route'lar request.db üzerinden konuşur (plugins/tenant.ts verir).
// Platform işleri (kayıt, süper-admin, billing) platformDb kullanır — SADECE
// routes/platform/* içinden (CI grep ile korunur). platformDb owner roldür ve
// RLS'i bypass eder (FORCE kullanılmadı) → cross-tenant platform işleri çalışır.

import { Prisma, PrismaClient } from '@prisma/client';

// RLS aktif mi? (Faz 3 backstop). Varsayılan kapalı — davranış değişmez.
const RLS_ENABLED = process.env.TENANT_RLS === 'on';

// Owner bağlantı havuzu — migration/platform/süper-admin (RLS bypass).
const base = new PrismaClient();

// Uygulama (tenant) bağlantı havuzu. RLS açıkken non-owner role bağlanmalı ki
// RLS'e tabi olsun; APP_DATABASE_URL verilmemişse base'e düşer (RLS'siz test).
const appBase =
  RLS_ENABLED && process.env.APP_DATABASE_URL
    ? new PrismaClient({ datasources: { db: { url: process.env.APP_DATABASE_URL } } })
    : base;

// tenantId alanı taşıyan modeller (şemadan türetilir — elle liste YOK)
const TENANT_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === 'tenantId'))
    .map((m) => m.name),
);
// tenantId taşımayan ve passthrough'a izinli platform modelleri
const PLATFORM_MODELS = new Set(['User', 'Tenant', 'Plan']);

// model adı → { ilişkiAlanı: hedefModel } haritası (nested create damgalama için)
const RELATION_MAP = new Map<string, Map<string, string>>();
for (const m of Prisma.dmmf.datamodel.models) {
  const rels = new Map<string, string>();
  for (const f of m.fields) {
    if (f.kind === 'object') rels.set(f.name, f.type);
  }
  RELATION_MAP.set(m.name, rels);
}

// data içindeki nested create/createMany/upsert/connectOrCreate bloklarına
// recursive tenantId enjeksiyonu. Yalnız hedef model tenant-owned ise damgalar.
function stampData(model: string, data: any, tenantId: string): void {
  if (!data || typeof data !== 'object') return;
  if (Array.isArray(data)) {
    for (const d of data) stampData(model, d, tenantId);
    return;
  }
  if (TENANT_MODELS.has(model) && !('tenantId' in data) && !('tenant' in data)) {
    data.tenantId = tenantId;
  }
  const rels = RELATION_MAP.get(model);
  if (!rels) return;
  for (const [field, target] of rels) {
    const v = data[field];
    if (!v || typeof v !== 'object') continue;
    if (v.create) stampData(target, v.create, tenantId);
    if (v.createMany?.data) stampData(target, v.createMany.data, tenantId);
    if (v.connectOrCreate) {
      const cocs = Array.isArray(v.connectOrCreate) ? v.connectOrCreate : [v.connectOrCreate];
      for (const c of cocs) if (c?.create) stampData(target, c.create, tenantId);
    }
    if (v.upsert) {
      const ups = Array.isArray(v.upsert) ? v.upsert : [v.upsert];
      for (const u of ups) if (u?.create) stampData(target, u.create, tenantId);
    }
  }
}

// *Unique operasyonlarda where'e doğrudan tenantId eklenir (extendedWhereUnique),
// diğerlerinde AND ile sarılır.
const UNIQUE_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'update', 'delete', 'upsert']);

// Model operasyonu için args'a tenant scope uygula (mutasyon: a mutate edilir).
function applyTenantScope(model: string, operation: string, args: any, tenantId: string): any {
  const a: any = args ?? {};

  // --- WRITE: data damgalama ---
  if (operation === 'create' || operation === 'createMany') {
    if (a.data) stampData(model, a.data, tenantId);
  }
  if (operation === 'upsert') {
    if (a.create) stampData(model, a.create, tenantId);
  }

  // --- READ/WRITE: where filtreleme ---
  if (UNIQUE_OPS.has(operation)) {
    a.where = { ...(a.where ?? {}), tenantId };
  } else if (
    operation.startsWith('find') ||
    operation === 'count' ||
    operation === 'aggregate' ||
    operation === 'groupBy' ||
    operation === 'updateMany' ||
    operation === 'deleteMany'
  ) {
    a.where = { AND: [{ tenantId }, a.where ?? {}] };
  }
  return a;
}

function makeTenantClient(tenantId: string) {
  // GUC'yi base (unextended) üzerinden set et → extension'a tekrar girmez.
  const setGuc = () =>
    appBase.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);

  // RLS açıkken: op'u [setGuc, op] transaction-batch'i içinde çalıştır (aynı
  // bağlantı, GUC transaction-local). appBase.$transaction extend'li op promise'ini
  // kabul eder → `client` self-reference'ına gerek yok (döngüsel tip kırılır).
  const withRls = (exec: () => any): Promise<any> =>
    appBase.$transaction([setGuc(), exec()]).then((r: any[]) => r[1]);

  const client = appBase.$extends({
    query: {
      // TOP-LEVEL: model ops + raw ($queryRaw/$executeRaw) hepsi buradan geçer.
      async $allOperations({ model, operation, args, query }: any) {
        // Raw / client-seviyesi op (model yok): tenant mantığı yok, ama RLS
        // açıksa GUC ile sar (raw SQL de izole olsun).
        if (!model) {
          return RLS_ENABLED ? withRls(() => query(args)) : query(args);
        }

        if (!TENANT_MODELS.has(model)) {
          if (PLATFORM_MODELS.has(model)) {
            return RLS_ENABLED ? withRls(() => query(args)) : query(args);
          }
          throw new Error(
            `[tenant-db] '${model}' ne tenant-owned ne platform modeli — scoping kararı verilmeden sorgulanamaz (default-deny)`,
          );
        }

        const a = applyTenantScope(model, operation, args, tenantId);
        return RLS_ENABLED ? withRls(() => query(a)) : query(a);
      },
    },
  });
  return client;
}

export type TenantDb = ReturnType<typeof makeTenantClient>;

// Tenant başına extend edilmiş client cache'i (havuz paylaşılır — ucuz)
const cache = new Map<string, TenantDb>();

export function dbFor(tenantId: string): TenantDb {
  if (!tenantId) throw new Error('[tenant-db] tenantId zorunlu');
  let db = cache.get(tenantId);
  if (!db) {
    db = makeTenantClient(tenantId);
    cache.set(tenantId, db);
  }
  return db;
}

// Platform-seviyesi erişim (kayıt, süper-admin, abonelik cron'u).
// SADECE routes/platform/* ve main.ts scheduler'ları kullanmalı — CI grep korur.
// Owner roldür → RLS bypass (cross-tenant okuma yapabilir).
export const platformDb = base;

// Helper/lib imzaları için: hem req.db (TenantDb) hem platformDb (PrismaClient)
// kabul eden sınır tipi. İç kullanımda tek cast yeterli: `db as TenantDb`.
export type DbLike = TenantDb | PrismaClient;
