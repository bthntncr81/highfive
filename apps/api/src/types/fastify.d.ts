// Fastify tip genişletmeleri — tenant bağlamı + route registry
import 'fastify';
import type { TenantDb } from '../lib/tenant-db';
import type { TenantCtx } from '../plugins/tenant';
import type { RouteInfo } from '../server';

declare module 'fastify' {
  interface FastifyRequest {
    /** Çözümlenen tenant (yoksa null — platform istekleri) */
    tenant: TenantCtx | null;
    /** Tenant-zorlamalı Prisma client (dbFor). Tenant çözülmediyse erişim hata fırlatır. */
    db: TenantDb;
    /** Auth middleware'in doldurduğu JWT payload'ı */
    user?: { userId: string; tenantId: string; role: string; locationId?: string };
  }
  interface FastifyInstance {
    routeRegistry: RouteInfo[];
  }
}
