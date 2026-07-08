// ============================================================================
// Tenant çözümleme hook'u — her isteğe req.tenant + req.db (dbFor) bağlar.
// ============================================================================
// Çözüm sırası:
//   1. Doğrulanmış JWT'deki tenantId   (personel: POS/Kitchen/kurye)
//   2. X-Tenant-ID header              (mobil müşteri app'i)
//   3. Subdomain (Host/X-Forwarded-Host: mehmet.otorder.com → "mehmet")
// Kurallar:
//   - JWT-tenant ≠ subdomain-tenant → 403 (çapraz-tenant token replay ölür)
//   - Bilinmeyen tenant → 404; SUSPENDED → 402 (ödeme gerekli)
//   - Çözülemezse: req.db erişimi TANIMLI HATA fırlatır (fail-closed) —
//     /health ve gelecekteki /api/platform/* etkilenmez.
// Tenant lookup 60 sn in-process cache'lidir (LRU'ya gerek yok — tenant sayısı sınırlı).

import { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import * as jwt from 'jsonwebtoken';
import { dbFor, platformDb } from '../lib/tenant-db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const BASE_DOMAIN = process.env.PLATFORM_BASE_DOMAIN || 'otorder.com';

// Hook'un ATLADIĞI yüzeyler (tenant bağlamı gerektirmez)
const SKIP_PREFIXES = ['/health', '/uploads/', '/api/platform/'];

export interface TenantCtx {
  id: string;
  name: string;
  subdomain: string;
  status: string;
}

interface CacheEntry { tenant: TenantCtx | null; at: number }
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

async function lookupTenant(by: { id?: string; subdomain?: string }): Promise<TenantCtx | null> {
  const key = by.id ? `id:${by.id}` : `sub:${by.subdomain}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.tenant;
  const t = await platformDb.tenant.findUnique({
    where: by.id ? { id: by.id } : { subdomain: by.subdomain! },
    select: { id: true, name: true, subdomain: true, status: true },
  });
  cache.set(key, { tenant: t, at: Date.now() });
  return t;
}

function subdomainFromHost(req: FastifyRequest): string | null {
  const raw = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  const host = raw.split(',')[0].trim().toLowerCase().split(':')[0];
  if (!host || !host.endsWith('.' + BASE_DOMAIN)) return null;
  const sub = host.slice(0, -(BASE_DOMAIN.length + 1));
  // www / api / order gibi platform subdomain'leri tenant değildir
  if (!sub || sub.includes('.') || ['www', 'api', 'app', 'admin'].includes(sub)) return null;
  return sub;
}

function jwtTenantId(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(h.slice(7), JWT_SECRET) as { tenantId?: string };
    return decoded.tenantId ?? null;
  } catch {
    return null; // geçersiz token'ı auth middleware raporlar; hook sessiz geçer
  }
}

// Tenant çözülmemişken req.db'ye dokunan her şey tanımlı hata alsın (fail-closed)
const throwingDb: any = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'then') return undefined; // await req.db kazaları için
      throw new Error(
        `[tenant] Bu istek için tenant çözümlenemedi — req.db.${String(prop)} kullanılamaz. ` +
          'JWT tenantId, X-Tenant-ID header veya <subdomain>.' + BASE_DOMAIN + ' gerekli.',
      );
    },
  },
);

export default fp(async function tenantPlugin(server: FastifyInstance) {
  server.decorateRequest('tenant', null);
  server.decorateRequest('db', null as any); // gerçek değer onRequest hook'unda atanır

  server.addHook('onRequest', async (req, reply) => {
    (req as any).db = throwingDb;
    if (SKIP_PREFIXES.some((p) => req.url === p || req.url.startsWith(p))) return;

    const fromJwt = jwtTenantId(req);
    const fromHeader = (req.headers['x-tenant-id'] as string) || null;
    const fromSub = subdomainFromHost(req);

    // Çakışma kontrolleri (token replay / yanlış host)
    let tenant: TenantCtx | null = null;
    if (fromJwt) {
      tenant = await lookupTenant({ id: fromJwt });
      if (tenant && fromSub && tenant.subdomain !== fromSub) {
        return reply.status(403).send({ error: 'Token bu restorana ait değil' });
      }
    } else if (fromHeader) {
      tenant = await lookupTenant({ id: fromHeader });
    } else if (fromSub) {
      tenant = await lookupTenant({ subdomain: fromSub });
      if (!tenant) return reply.status(404).send({ error: 'Restoran bulunamadı' });
    }

    if (!tenant) return; // platform-level istek olabilir; req.db fail-closed kalır

    if (tenant.status === 'SUSPENDED') {
      // Sahibi ödemeye ULAŞABİLMELİ: e-posta+şifre girişi (owner token'ı alır,
      // /api/platform/billing/* zaten skip'te) ve kilit ekranının marka bilgisi
      // açık kalır. PIN girişi ve diğer her şey 402 (tam kilit).
      const SUSPENDED_ALLOWED = ['/api/auth/login', '/api/settings/public/theme'];
      const path = req.url.split('?')[0];
      if (!SUSPENDED_ALLOWED.includes(path)) {
        return reply.status(402).send({ error: 'Hesap askıda — ödeme gerekli', code: 'TENANT_SUSPENDED' });
      }
    }

    (req as any).tenant = tenant;
    (req as any).db = dbFor(tenant.id);
  });
});
