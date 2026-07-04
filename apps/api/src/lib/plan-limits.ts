// ============================================================================
// Paket limit & feature-flag zorlaması (3 paket: Başlangıç / Pro / Kurumsal).
// ============================================================================
// Plan.features JSON: { loyalty, campaigns, analytics, whatsappLink, brandedApp, customLanding }
// Plan.maxUsers / maxLocations: -1 = sınırsız.
//
// - requireFeature('campaigns'): tenant route'larına preHandler (req.tenant set).
// - assertWithinUserLimit / assertWithinLocationLimit: create'ten önce çağrılır.
// Plan bilgisi 60 sn cache'lidir (subscription→plan).

import { FastifyReply, FastifyRequest } from 'fastify';
import { platformDb } from './tenant-db';

export type PlanFeature =
  | 'loyalty'
  | 'campaigns'
  | 'analytics'
  | 'whatsappLink'
  | 'brandedApp'
  | 'customLanding';

interface PlanInfo {
  key: string;
  maxUsers: number;
  maxLocations: number;
  features: Record<string, boolean>;
  at: number;
}

const cache = new Map<string, PlanInfo>();
const TTL = 60_000;

export async function getTenantPlan(tenantId: string): Promise<PlanInfo> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < TTL) return hit;

  const sub = await platformDb.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
  // Abonelik/plan yoksa en kısıtlı varsayılan (Başlangıç benzeri)
  const info: PlanInfo = sub?.plan
    ? {
        key: sub.plan.key,
        maxUsers: sub.plan.maxUsers,
        maxLocations: sub.plan.maxLocations,
        features: (sub.plan.features as Record<string, boolean>) ?? {},
        at: Date.now(),
      }
    : { key: 'NONE', maxUsers: 5, maxLocations: 1, features: {}, at: Date.now() };
  cache.set(tenantId, info);
  return info;
}

export function invalidatePlanCache(tenantId: string): void {
  cache.delete(tenantId);
}

export async function hasFeature(tenantId: string, feature: PlanFeature): Promise<boolean> {
  const plan = await getTenantPlan(tenantId);
  return plan.features[feature] === true;
}

// preHandler fabrikası — Pro/Kurumsal'a özel özellikleri kapar (403 + upgrade ipucu)
export function requireFeature(feature: PlanFeature) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const tenant = (request as any).tenant;
    if (!tenant) return reply.status(400).send({ error: 'Tenant bağlamı yok' });
    if (!(await hasFeature(tenant.id, feature))) {
      return reply.status(403).send({
        error: 'Bu özellik paketinizde yok',
        code: 'FEATURE_LOCKED',
        feature,
      });
    }
  };
}

// Kullanıcı/şube limitini create'ten önce doğrula. Aşımda reply gönderir → true döner.
export async function assertWithinUserLimit(tenantId: string, reply: FastifyReply): Promise<boolean> {
  const plan = await getTenantPlan(tenantId);
  if (plan.maxUsers === -1) return false;
  const count = await platformDb.membership.count({ where: { tenantId, active: true } });
  if (count >= plan.maxUsers) {
    reply.status(403).send({
      error: `Paket kullanıcı limitine ulaşıldı (${plan.maxUsers})`,
      code: 'USER_LIMIT',
      limit: plan.maxUsers,
    });
    return true;
  }
  return false;
}

export async function assertWithinLocationLimit(tenantId: string, reply: FastifyReply): Promise<boolean> {
  const plan = await getTenantPlan(tenantId);
  if (plan.maxLocations === -1) return false;
  const count = await platformDb.location.count({ where: { tenantId } });
  if (count >= plan.maxLocations) {
    reply.status(403).send({
      error: `Paket şube limitine ulaşıldı (${plan.maxLocations})`,
      code: 'LOCATION_LIMIT',
      limit: plan.maxLocations,
    });
    return true;
  }
  return false;
}
