import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { sendMail, emailOtpTemplate, welcomeTemplate } from '../lib/mailer';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days in seconds
const CUSTOMER_OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CUSTOMER_JWT_AUDIENCE = 'customer';

function generateOtp(): string {
  // 6-digit numeric — easy to type on mobile keyboards.
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default async function authRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Login with email and password
  server.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      if (!email || !password) {
        return reply.status(400).send({ error: 'Email ve şifre gerekli' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.active) {
        return reply.status(401).send({ error: 'Geçersiz email veya şifre' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return reply.status(401).send({ error: 'Geçersiz email veya şifre' });
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      // Create session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: { method: 'email' },
          ipAddress: request.ip,
        },
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
      };
    },
  );

  // Login with PIN (quick login for POS)
  server.post(
    '/pin-login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { pin } = request.body as { pin: string };

      if (!pin || pin.length !== 4) {
        return reply.status(400).send({ error: 'Geçerli bir PIN giriniz' });
      }

      const user = await prisma.user.findFirst({
        where: { pin, active: true },
      });

      if (!user) {
        return reply.status(401).send({ error: 'Geçersiz PIN' });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: 60 * 60 * 12 }, // 12 hours in seconds
      );

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: { method: 'pin' },
          ipAddress: request.ip,
        },
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
      };
    },
  );

  // Logout
  server.post(
    '/logout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Token gerekli' });
      }

      const token = authHeader.replace('Bearer ', '');

      await prisma.session.deleteMany({
        where: { token },
      });

      return { success: true };
    },
  );

  // Get current user
  server.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({ error: 'Token gerekli' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          active: true,
        },
      });

      if (!user || !user.active) {
        return reply.status(401).send({ error: 'Kullanıcı bulunamadı' });
      }

      return { user };
    } catch (err) {
      return reply.status(401).send({ error: 'Geçersiz token' });
    }
  });

  // Change password
  server.post(
    '/change-password',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Token gerekli' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      if (!currentPassword || !newPassword) {
        return reply
          .status(400)
          .send({ error: 'Mevcut ve yeni şifre gerekli' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          return reply.status(401).send({ error: 'Kullanıcı bulunamadı' });
        }

        const validPassword = await bcrypt.compare(
          currentPassword,
          user.password,
        );
        if (!validPassword) {
          return reply.status(401).send({ error: 'Mevcut şifre yanlış' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });

        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'PASSWORD_CHANGE',
            ipAddress: request.ip,
          },
        });

        return { success: true };
      } catch (err) {
        return reply.status(401).send({ error: 'Geçersiz token' });
      }
    },
  );

  // -----------------------------------------------------------------
  // Customer (loyalty member) email + OTP flow
  // -----------------------------------------------------------------
  // Two endpoints:
  //   POST /customer/email/request-otp   — generates a 6-digit code, stores
  //     it on the Customer row (creating the Customer if first sight), and
  //     mails it via the HighFive branded template.
  //   POST /customer/email/verify-otp    — checks the code, marks isVerified,
  //     fires a welcome email on first verification, returns a customer JWT.

  server.post('/customer/email/request-otp', async (request: FastifyRequest, reply: FastifyReply) => {
    const {
      email,
      name,
      phone,
      gender,
      birthDate,
      termsAccepted,
      kvkkAccepted,
      marketingConsent,
    } = request.body as {
      email?: string;
      name?: string;
      phone?: string;
      gender?: string;     // "MALE" | "FEMALE" | "OTHER"
      birthDate?: string;  // "YYYY-MM-DD"
      termsAccepted?: boolean;
      kvkkAccepted?: boolean;
      marketingConsent?: boolean;
    };
    if (!email || !isValidEmail(email)) {
      return reply.status(400).send({ error: 'Geçerli bir e-posta adresi gerekli' });
    }
    const cleaned = email.toLowerCase().trim();

    // Normalize optional profile fields — tolerate fill-in across multiple requests,
    // never silently overwrite values the customer has already set.
    let parsedBirth: Date | undefined;
    if (birthDate) {
      const d = new Date(birthDate);
      if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d < new Date()) {
        parsedBirth = d;
      }
    }
    const allowedGenders = ['MALE', 'FEMALE', 'OTHER'];
    const normalizedGender = gender && allowedGenders.includes(gender.toUpperCase())
      ? gender.toUpperCase()
      : undefined;
    const cleanPhone = phone ? phone.replace(/\D/g, '').trim() || undefined : undefined;

    // Phone uniqueness — başka customer aynı phone ile kullanmasın
    if (cleanPhone) {
      const phoneOwner = await prisma.customer.findUnique({ where: { phone: cleanPhone } });
      if (phoneOwner && phoneOwner.email !== cleaned) {
        return reply.status(400).send({
          error: 'Bu telefon başka bir hesaba kayıtlı',
          code: 'PHONE_EXISTS',
        });
      }
    }

    // Find or create. Email is @unique so this is safe.
    let customer = await prisma.customer.findUnique({ where: { email: cleaned } });
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + CUSTOMER_OTP_TTL_MS);

    // Consent / KVKK timestamps — yalnızca ilk explicit kabul anında kaydet
    const now = new Date();
    const setTermsAt = termsAccepted === true ? now : undefined;
    const setKvkkAt = kvkkAccepted === true ? now : undefined;
    const setMarketingAt = marketingConsent === true ? now : null; // false ise null (geri çekme)
    const setEmailMarketing = marketingConsent === true ? true : marketingConsent === false ? false : undefined;
    const setSmsMarketing = marketingConsent === true ? true : marketingConsent === false ? false : undefined;

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: cleaned,
          name: name?.trim() || null,
          phone: cleanPhone,
          birthDate: parsedBirth,
          gender: normalizedGender,
          verificationCode: code,
          verificationCodeExpiresAt: expiresAt,
          emailConsent: setEmailMarketing ?? false,
          smsConsent: setSmsMarketing ?? false,
          termsAcceptedAt: setTermsAt,
          kvkkAcceptedAt: setKvkkAt,
          marketingConsentAt: marketingConsent === true ? now : null,
        },
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          verificationCode: code,
          verificationCodeExpiresAt: expiresAt,
          // Eksik alanları doldur — varsa üzerine yazma
          name: customer.name ?? (name?.trim() || null),
          phone: customer.phone ?? cleanPhone,
          birthDate: customer.birthDate ?? parsedBirth ?? null,
          gender: customer.gender ?? normalizedGender ?? null,
          // Consent: yalnızca ilk kabulde set, sonra korunur
          termsAcceptedAt: customer.termsAcceptedAt ?? setTermsAt,
          kvkkAcceptedAt: customer.kvkkAcceptedAt ?? setKvkkAt,
          // Marketing — kullanıcı her seferinde değiştirebilir
          ...(marketingConsent !== undefined ? {
            emailConsent: setEmailMarketing,
            smsConsent: setSmsMarketing,
            marketingConsentAt: setMarketingAt,
          } : {}),
        },
      });
    }

    const html = emailOtpTemplate(code);
    const sendResult = await sendMail({
      to: cleaned,
      subject: `High Five — Giriş Kodun: ${code}`,
      html,
      text: `High Five giriş kodun: ${code}\n\n10 dakika geçerli. Bu kodu paylaşma.`,
    });

    if (!sendResult.ok) {
      // Don't leak SMTP failure detail — surface a friendly error and log.
      console.error('OTP send failed:', sendResult.error);
      return reply.status(500).send({
        error: 'E-posta gönderilemedi, biraz sonra tekrar dene',
      });
    }

    return {
      success: true,
      // Don't return the code, even in dev — operators can read SMTP logs.
      message: 'Doğrulama kodu e-posta adresine gönderildi',
    };
  });

  server.post('/customer/email/verify-otp', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, code } = request.body as { email?: string; code?: string };
    if (!email || !code) {
      return reply.status(400).send({ error: 'E-posta ve kod gerekli' });
    }
    const cleaned = email.toLowerCase().trim();
    const customer = await prisma.customer.findUnique({ where: { email: cleaned } });
    if (!customer || !customer.verificationCode) {
      return reply.status(400).send({ error: 'Önce kod talebinde bulun' });
    }
    if (customer.verificationCodeExpiresAt && customer.verificationCodeExpiresAt < new Date()) {
      return reply.status(400).send({ error: 'Kod süresi dolmuş, yeni kod iste' });
    }
    if (customer.verificationCode !== code.trim()) {
      return reply.status(400).send({ error: 'Kod hatalı' });
    }

    const wasVerified = customer.isVerified;
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        isVerified: true,
        // KVKK uyumu: emailConsent yalnızca request-otp'ta marketingConsent=true ile set edilir
        // Doğrulama otomatik opt-in YAPMAZ
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
      include: { loyaltyTier: true },
    });

    // First-time verification → fire welcome email (best-effort, ignore failure)
    if (!wasVerified) {
      sendMail({
        to: cleaned,
        subject: 'High Five sadakat programına hoş geldin!',
        html: welcomeTemplate(updated.name || 'High Five üyesi'),
      }).catch(() => { /* don't block login on welcome email */ });
    }

    const token = jwt.sign(
      { customerId: updated.id, email: updated.email, aud: CUSTOMER_JWT_AUDIENCE },
      JWT_SECRET,
      { expiresIn: '90d' },
    );

    return {
      success: true,
      token,
      customer: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
        totalPoints: updated.totalPoints,
        loyaltyTier: updated.loyaltyTier,
      },
    };
  });
}
