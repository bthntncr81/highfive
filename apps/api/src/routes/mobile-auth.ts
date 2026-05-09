// Mobile (Customer) Authentication: Telefon + OTP login
// Mevcut Customer modelini kullanır (phone, verificationCode, isVerified)

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const OTP_TTL_MINUTES = 5;
const OTP_RESEND_SECONDS = 60;

// Master OTP — SMS gateway entegre edilene kadar sabit doğrulama kodu.
// Her telefon için bu kod kabul edilir. SMS firma anlaşmasından sonra
// MASTER_OTP_CODE env'i kaldırılarak deaktif edilir.
const MASTER_OTP_CODE = process.env.MASTER_OTP_CODE || '999999';

// Telefon normalize: +90555..., 0555..., 555... → 5xxxxxxxxx (10 hane)
function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  // +90 prefix
  let p = digits;
  if (p.startsWith('90') && p.length === 12) p = p.slice(2);
  if (p.startsWith('0') && p.length === 11) p = p.slice(1);
  if (p.length !== 10 || !p.startsWith('5')) return null;
  return p;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function mobileAuthRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;
  // Dev OTP: NODE_ENV !== production veya açık bayrak ile dönülür.
  // Production'a çıkmadan önce EXPOSE_DEV_OTP=false bırakılmalı.
  const isDev =
    process.env.NODE_ENV !== 'production' ||
    process.env.EXPOSE_DEV_OTP === 'true';

  // Request OTP
  server.post('/auth/request-otp', async (request: any, reply: any) => {
    const { phone } = (request.body ?? {}) as { phone?: string };
    if (!phone) return reply.status(400).send({ error: 'Telefon gerekli' });

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return reply.status(400).send({ error: 'Geçersiz telefon numarası' });
    }

    // Mevcut customer
    let customer = await prisma.customer.findUnique({ where: { phone: normalized } });

    // Rate limit: son OTP isteği 60 saniyeden yeni mi?
    if (customer?.verificationCode && customer.updatedAt) {
      const ageSec = (Date.now() - new Date(customer.updatedAt).getTime()) / 1000;
      if (ageSec < OTP_RESEND_SECONDS) {
        return reply.status(429).send({
          error: 'Çok sık istek',
          retryAfterSeconds: Math.ceil(OTP_RESEND_SECONDS - ageSec),
        });
      }
    }

    const code = generateOtp();

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { verificationCode: code },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          phone: normalized,
          verificationCode: code,
          isVerified: false,
          isActive: true,
        },
      });
    }

    // TODO: gerçek SMS gateway (Netgsm vs.). Şimdilik console + dev response.
    server.log.info({ phone: normalized, code }, '[MOBILE-AUTH] OTP gönderildi');

    return {
      ok: true,
      message: 'Doğrulama kodu gönderildi',
      ...(isDev ? { devCode: code } : {}),
    };
  });

  // Verify OTP — opsiyonel name + email kabul eder (signup'tan gelir)
  server.post('/auth/verify-otp', async (request: any, reply: any) => {
    const body = (request.body ?? {}) as {
      phone?: string;
      code?: string;
      name?: string;
      email?: string;
    };
    const { phone, code, name, email } = body;

    if (!phone || !code) {
      return reply.status(400).send({ error: 'Telefon ve kod gerekli' });
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return reply.status(400).send({ error: 'Geçersiz telefon numarası' });
    }

    // Email çakışma kontrolü — başka bir customer aynı email ile kullanmasın
    if (email && email.trim()) {
      const emailTrim = email.trim().toLowerCase();
      const existingEmail = await prisma.customer.findUnique({
        where: { email: emailTrim },
      });
      if (existingEmail && existingEmail.phone !== normalized) {
        return reply.status(400).send({
          error: 'Bu e-posta başka bir hesapta kayıtlı',
          code: 'EMAIL_EXISTS',
        });
      }
    }

    let customer = await prisma.customer.findUnique({ where: { phone: normalized } });

    // YENİ kayıt mı? Eğer Customer yok VE master OTP değilse, name zorunlu.
    // (Signup ekranı verifyOtp'a name gönderir; Login ekranı göndermez.)
    const isNewSignup = !customer;

    // Master OTP shortcut — geliştirme/SMS-yok modu
    if (code === MASTER_OTP_CODE) {
      if (isNewSignup) {
        // Yeni hesap için name zorunlu
        if (!name || !name.trim()) {
          return reply.status(400).send({
            error: 'Yeni hesap için Ad Soyad gerekli',
            code: 'NAME_REQUIRED',
          });
        }
        customer = await prisma.customer.create({
          data: {
            phone: normalized,
            name: name.trim(),
            email: email?.trim().toLowerCase() || null,
            isVerified: false,
            isActive: true,
          },
        });
      }
      server.log.info({ phone: normalized }, '[MOBILE-AUTH] Master OTP kullanıldı');
    } else {
      if (!customer || !customer.verificationCode) {
        return reply.status(400).send({ error: 'Önce kod isteyin' });
      }

      // Expiry kontrolü
      const ageMin = (Date.now() - new Date(customer.updatedAt).getTime()) / 60000;
      if (ageMin > OTP_TTL_MINUTES) {
        return reply.status(400).send({ error: 'Kod süresi dolmuş' });
      }

      if (customer.verificationCode !== code) {
        return reply.status(400).send({ error: 'Kod hatalı' });
      }
    }

    // Doğrulama başarılı + name/email update (signup ise veya update ise)
    const updateData: any = {
      isVerified: true,
      verificationCode: null,
    };
    // Eğer customer.name yoksa ve name geldiyse update et (mevcut hesap login durumunda da)
    if (name && name.trim() && !customer!.name) {
      updateData.name = name.trim();
    }
    if (email && email.trim() && !customer!.email) {
      updateData.email = email.trim().toLowerCase();
    }

    const updated = await prisma.customer.update({
      where: { id: customer!.id },
      data: updateData,
    });

    const token = jwt.sign(
      { customerId: updated.id, type: 'customer' },
      JWT_SECRET,
      { expiresIn: '30d' },
    );

    return {
      token,
      user: {
        id: updated.id,
        phone: updated.phone,
        name: updated.name,
        email: updated.email,
        totalPoints: updated.totalPoints,
        isVerified: updated.isVerified,
      },
    };
  });

  // Profil bilgisi (token ile)
  server.get('/me', async (request: any, reply: any) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token gerekli' });
    }
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { customerId: string; type?: string; aud?: string };
      // SMS OTP token'ı type='customer', email OTP token'ı aud='customer' kullanır
      const isCustomer = decoded.type === 'customer' || decoded.aud === 'customer';
      if (!isCustomer || !decoded.customerId) {
        return reply.status(401).send({ error: 'Geçersiz token' });
      }
      const customer = await prisma.customer.findUnique({
        where: { id: decoded.customerId },
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          totalPoints: true,
          lifetimePoints: true,
          orderCount: true,
          isVerified: true,
        },
      });
      if (!customer) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
      return { user: customer };
    } catch {
      return reply.status(401).send({ error: 'Geçersiz veya süresi dolmuş token' });
    }
  });

  // Profili güncelle (isim, email)
  server.patch('/me', async (request: any, reply: any) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token gerekli' });
    }
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { customerId: string; type?: string; aud?: string };
      const isCustomer = decoded.type === 'customer' || decoded.aud === 'customer';
      if (!isCustomer || !decoded.customerId) {
        return reply.status(401).send({ error: 'Geçersiz token' });
      }
      const { name, email } = (request.body ?? {}) as { name?: string; email?: string };
      const customer = await prisma.customer.update({
        where: { id: decoded.customerId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
        },
      });
      return { user: customer };
    } catch (e: any) {
      return reply.status(400).send({ error: e?.message ?? 'Güncellenemedi' });
    }
  });
}
