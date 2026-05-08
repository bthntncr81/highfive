// Customer (mobile) JWT helpers — staff verifyAuth'tan ayrı
import * as jwt from 'jsonwebtoken';
import type { FastifyRequest, FastifyReply } from 'fastify';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export type CustomerJwtPayload = {
  customerId: string;
  type?: 'customer'; // SMS OTP token'ları (legacy)
  aud?: string;      // Email OTP token'ları aud='customer' kullanır
  email?: string;
  iat?: number;
  exp?: number;
};

export function getCustomerIdFromRequest(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as Partial<CustomerJwtPayload>;
    if (!decoded.customerId) return null;
    // Token customer için olmalı: ya type='customer' (SMS) ya da aud='customer' (email)
    const isCustomer = decoded.type === 'customer' || decoded.aud === 'customer';
    if (!isCustomer) return null;
    return decoded.customerId;
  } catch {
    return null;
  }
}

export async function verifyCustomerAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const customerId = getCustomerIdFromRequest(request);
  if (!customerId) {
    reply.status(401).send({ error: 'Customer token gerekli', code: 'UNAUTHORIZED' });
    return;
  }
  // Request'e customerId iliştir
  (request as any).customerId = customerId;
}

export function signCustomerToken(customerId: string, expiresIn: string = '30d'): string {
  return jwt.sign({ customerId, type: 'customer' as const }, JWT_SECRET, {
    expiresIn,
  } as any);
}
