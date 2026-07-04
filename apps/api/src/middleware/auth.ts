import { UserRole } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  role: UserRole;
}

// Verify any authenticated user
export async function verifyAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token gerekli' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    (request as any).user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Geçersiz token' });
  }
}

// Verify admin or manager
export async function verifyAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token gerekli' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    if (decoded.role !== UserRole.ADMIN && decoded.role !== UserRole.MANAGER) {
      return reply.status(403).send({ error: 'Bu işlem için yetkiniz yok' });
    }

    (request as any).user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Geçersiz token' });
  }
}

// Verify kitchen staff
export async function verifyKitchen(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token gerekli' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const allowedRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.KITCHEN,
    ];
    if (!allowedRoles.includes(decoded.role as UserRole)) {
      return reply.status(403).send({ error: 'Bu işlem için yetkiniz yok' });
    }

    (request as any).user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Geçersiz token' });
  }
}

// Verify courier — yalnız COURIER (veya ADMIN debug) rolü
export async function verifyCourier(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token gerekli' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const allowedRoles: UserRole[] = [UserRole.COURIER, UserRole.ADMIN];
    if (!allowedRoles.includes(decoded.role as UserRole)) {
      return reply.status(403).send({ error: 'Bu işlem yalnız kuryeler içindir' });
    }
    (request as any).user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Geçersiz token' });
  }
}

// Verify any staff (mobile POS / Kitchen / Courier app'lerinin paylaştığı endpoint'ler için)
export async function verifyStaffApp(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token gerekli' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    // Tüm staff rolleri kabul edilir; customer (token) reddedilir
    const staffRoles: UserRole[] = [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.WAITER,
      UserRole.KITCHEN,
      UserRole.CASHIER,
      UserRole.COURIER,
    ];
    if (!staffRoles.includes(decoded.role as UserRole)) {
      return reply.status(403).send({ error: 'Bu endpoint yalnız personel app\'leri içindir' });
    }
    (request as any).user = decoded;
  } catch (err) {
    return reply.status(401).send({ error: 'Geçersiz token' });
  }
}
