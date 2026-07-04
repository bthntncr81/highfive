// ============================================================================
// dbFor(tenantId) — merkezi çok-kiracılı Prisma client (izolasyonun kalbi)
// ============================================================================
// Kurallar:
//  1. tenantId alanı OLAN her model (DMMF'ten otomatik) → her sorguya tenant
//     filtresi enjekte edilir; create/upsert data'sına tenantId yazılır.
//     Nested create'ler de (order.create { items: { create: [...] } }) DMMF
//     ilişki haritasıyla RECURSIVE olarak damgalanır.
//  2. tenantId alanı OLMAYAN modeller: PLATFORM_MODELS (User, Tenant, Plan)
//     ise passthrough; değilse HATA (default-deny — yeni model eklerken
//     scoping unutulamaz).
//  3. Raw SQL ($queryRaw/$executeRaw) bu katmanı BYPASS eder → Faz 3 RLS
//     backstop'u + CI grep bunu yakalar. Route'larda raw kullanmayın.
//
// Kullanım: route'lar request.db üzerinden konuşur (plugins/tenant.ts verir).
// Platform işleri (kayıt, süper-admin, billing) platformDb kullanır — SADECE
// routes/platform/* içinden (CI grep ile korunur).

import { Prisma, PrismaClient } from '@prisma/client';

// Tek gerçek bağlantı havuzu — extend edilmiş client'lar bunu paylaşır.
const base = new PrismaClient();

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

function makeTenantClient(tenantId: string) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model) return query(args);
          if (!TENANT_MODELS.has(model)) {
            if (PLATFORM_MODELS.has(model)) return query(args);
            throw new Error(
              `[tenant-db] '${model}' ne tenant-owned ne platform modeli — scoping kararı verilmeden sorgulanamaz (default-deny)`,
            );
          }

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

          return query(a);
        },
      },
    },
  });
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
export const platformDb = base;
