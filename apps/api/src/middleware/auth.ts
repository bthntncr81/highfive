import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Çok-kiracılı JWT: tenantId ZORUNLU (personel token'ları Membership'ten üretilir)
export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  locationId?: string;
}

export function signStaffToken(payload: JWTPayload, expiresIn: string | number = '7d'): string {
  // jti: aynı kullanıcı aynı saniyede iki kez giriş yaparsa (iat saniyelik)
  // birebir aynı token üretilir ve Session.token unique kısıtına takılırdı.
  return jwt.sign({ ...payload, jti: randomUUID() } as object, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

// Ortak çözümleme: token doğrula + tenant bağlamıyla eşleştir.
// Dönen null = reply zaten gönderildi (hata durumu).
function decode(request: FastifyRequest, reply: FastifyReply): JWTPayload | null {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Token gerekli' });
    return null;
  }
  let decoded: JWTPayload;
  try {
    decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as JWTPayload;
  } catch {
    reply.status(401).send({ error: 'Geçersiz token' });
    return null;
  }
  if (!decoded.tenantId) {
    // Eski (tenant'sız) token — cutover sonrası herkes yeniden giriş yapar
    reply.status(401).send({ error: 'Oturum eski — lütfen yeniden giriş yapın' });
    return null;
  }
  // Hook'un çözdüğü tenant ile token'ın tenant'ı çelişemez (izolasyon)
  const reqTenant = (request as any).tenant;
  if (reqTenant && reqTenant.id !== decoded.tenantId) {
    reply.status(403).send({ error: 'Token bu restorana ait değil' });
    return null;
  }
  (request as any).user = decoded;
  return decoded;
}

function requireRoles(roles: UserRole[], errMsg = 'Bu işlem için yetkiniz yok') {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const decoded = decode(request, reply);
    if (!decoded) return;
    if (!roles.includes(decoded.role)) {
      return reply.status(403).send({ error: errMsg });
    }
  };
}

// Verify any authenticated user
export async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
  decode(request, reply);
}

// Verify owner/admin/manager (OWNER: tenant sahibi — SaaS'ta en yüksek yetki)
export const verifyAdmin = requireRoles([UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER]);

// Verify kitchen staff
export const verifyKitchen = requireRoles([
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.KITCHEN,
]);

// Verify courier — yalnız COURIER (veya OWNER/ADMIN debug)
export const verifyCourier = requireRoles(
  [UserRole.COURIER, UserRole.ADMIN, UserRole.OWNER],
  'Bu işlem yalnız kuryeler içindir',
);

// Verify any staff (mobile POS / Kitchen / Courier app'lerinin paylaştığı endpoint'ler)
export const verifyStaffApp = requireRoles(
  [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.WAITER,
    UserRole.KITCHEN,
    UserRole.CASHIER,
    UserRole.COURIER,
  ],
  "Bu endpoint yalnız personel app'leri içindir",
);
