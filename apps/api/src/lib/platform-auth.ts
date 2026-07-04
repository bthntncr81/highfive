// ============================================================================
// Platform-seviyesi auth — /api/platform/* route'ları için (tenant hook ATLAR).
// ============================================================================
// İki aktör:
//   1. Tenant sahibi (OWNER) — kendi aboneliğini/onboarding'ini yönetir. Normal
//      staff token'ı (signStaffToken; tenantId + role=OWNER) kullanılır.
//   2. Süper-admin — platform operatörü. SUPERADMIN_EMAILS allowlist'i + parola.
//      Ayrı scope'lu token (scope='superadmin', tenantId taşımaz).

import { FastifyReply, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface OwnerToken {
  userId: string;
  tenantId: string;
  role: UserRole;
}

export interface SuperAdminToken {
  userId: string;
  scope: 'superadmin';
  email: string;
}

export function superAdminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS || 'admin@otorder.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function signSuperAdminToken(userId: string, email: string): string {
  const payload: SuperAdminToken = { userId, scope: 'superadmin', email };
  return jwt.sign(payload as object, JWT_SECRET, { expiresIn: '12h' } as jwt.SignOptions);
}

// Tenant sahibi/yöneticisi doğrulaması — abonelik & onboarding route'ları için.
// req.platformOwner = { userId, tenantId, role } atar. Tenant hook atlandığından
// tenant bağlamını doğrudan token'dan çıkarır.
export async function verifyOwner(request: FastifyRequest, reply: FastifyReply) {
  const h = request.headers.authorization;
  if (!h?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Token gerekli' });
  let decoded: any;
  try {
    decoded = jwt.verify(h.slice(7), JWT_SECRET);
  } catch {
    return reply.status(401).send({ error: 'Geçersiz token' });
  }
  if (!decoded.tenantId || !decoded.userId) {
    return reply.status(401).send({ error: 'Oturum geçersiz' });
  }
  if (![UserRole.OWNER, UserRole.ADMIN].includes(decoded.role)) {
    return reply.status(403).send({ error: 'Bu işlem yalnız restoran sahibi/yöneticisi içindir' });
  }
  (request as any).platformOwner = {
    userId: decoded.userId,
    tenantId: decoded.tenantId,
    role: decoded.role,
  } as OwnerToken;
}

// Süper-admin doğrulaması — platform operasyon route'ları için.
export async function verifySuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  const h = request.headers.authorization;
  if (!h?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Token gerekli' });
  let decoded: any;
  try {
    decoded = jwt.verify(h.slice(7), JWT_SECRET);
  } catch {
    return reply.status(401).send({ error: 'Geçersiz token' });
  }
  if (decoded.scope !== 'superadmin' || !superAdminEmails().includes(String(decoded.email).toLowerCase())) {
    return reply.status(403).send({ error: 'Süper-admin yetkisi gerekli' });
  }
  (request as any).superAdmin = decoded as SuperAdminToken;
}
