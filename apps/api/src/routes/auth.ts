import * as bcrypt from 'bcryptjs';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as jwt from 'jsonwebtoken';
import { sendMail, emailOtpTemplate, welcomeTemplate } from '../lib/mailer';
import { signStaffToken } from '../middleware/auth';
import { dbFor, platformDb } from '../lib/tenant-db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CUSTOMER_OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CUSTOMER_JWT_AUDIENCE = 'customer';

function generateOtp(): string {
  // 6-digit numeric — easy to type on mobile keyboards.
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Membership + tenant bilgisini istemciye dönecek şekle indirger
function membershipSummary(m: { tenantId: string; role: string; locationId: string | null; tenant: { name: string; subdomain: string } }) {
  return {
    tenantId: m.tenantId,
    tenantName: m.tenant.name,
    subdomain: m.tenant.subdomain,
    role: m.role,
    locationId: m.locationId,
  };
}

export default async function authRoutes(server: FastifyInstance) {
  // ------------------------------------------------------------------
  // E-posta + şifre girişi (çok-kiracılı):
  //  - Kimlik platform-seviyesinde (User.email global unique)
  //  - Yetki Membership'ten gelir. Tenant şu sırayla seçilir:
  //      1. subdomain/X-Tenant-ID ile çözülen istek tenant'ı
  //      2. body.tenantId (çok üyelikli kullanıcı, seçim ekranından)
  //      3. tek üyelik varsa otomatik
  //      4. çok üyelik + seçim yok → üyelik listesi döner (client seçtirir)
  // ------------------------------------------------------------------
  server.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password, tenantId: bodyTenantId } = request.body as {
        email: string;
        password: string;
        tenantId?: string;
      };

      if (!email || !password) {
        return reply.status(400).send({ error: 'Email ve şifre gerekli' });
      }

      // Kimlik: platform-seviyesi (tenant bağlamı gerektirmez)
      const user = await platformDb.user.findFirst({ where: { email } });
      if (!user || !user.active) {
        return reply.status(401).send({ error: 'Geçersiz email veya şifre' });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return reply.status(401).send({ error: 'Geçersiz email veya şifre' });
      }

      const memberships = await platformDb.membership.findMany({
        where: { userId: user.id, active: true },
        include: { tenant: { select: { name: true, subdomain: true, status: true } } },
      });
      if (memberships.length === 0) {
        return reply.status(403).send({ error: 'Aktif restoran üyeliğiniz yok' });
      }

      // Tenant seçimi
      const reqTenantId = (request as any).tenant?.id as string | undefined;
      let selected = reqTenantId
        ? memberships.find((m) => m.tenantId === reqTenantId)
        : bodyTenantId
          ? memberships.find((m) => m.tenantId === bodyTenantId)
          : memberships.length === 1
            ? memberships[0]
            : undefined;

      if (reqTenantId && !selected) {
        return reply.status(403).send({ error: 'Bu restoranda üyeliğiniz yok' });
      }
      if (!selected) {
        // Çok üyelik — istemci seçim ekranı göstersin
        return {
          requiresTenantSelection: true,
          memberships: memberships.map(membershipSummary),
        };
      }
      if (selected.tenant.status === 'SUSPENDED') {
        return reply.status(402).send({ error: 'Hesap askıda — ödeme gerekli', code: 'TENANT_SUSPENDED' });
      }

      const token = signStaffToken({
        userId: user.id,
        tenantId: selected.tenantId,
        role: selected.role,
        locationId: selected.locationId ?? undefined,
      });

      const db = dbFor(selected.tenantId);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await db.session.create({ data: { userId: user.id, token, expiresAt } });
      await db.activityLog.create({
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
          role: selected.role,
          avatar: user.avatar,
          locationId: selected.locationId,
          tenant: membershipSummary(selected),
        },
      };
    },
  );

  // -----------------------------------------------------------------
  // PIN girişi — TENANT-SCOPED (PIN artık Membership'te, tenant içinde benzersiz).
  // Tenant bağlamı zorunlu: subdomain veya X-Tenant-ID.
  // -----------------------------------------------------------------
  server.post(
    '/pin-login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { pin } = request.body as { pin: string };
      if (!pin || !/^\d{4,6}$/.test(pin)) {
        return reply.status(400).send({ error: 'Geçerli bir PIN giriniz' });
      }
      const tenant = (request as any).tenant;
      if (!tenant) {
        return reply.status(400).send({ error: 'Restoran belirlenemedi (subdomain veya X-Tenant-ID gerekli)' });
      }

      const membership = await request.db.membership.findFirst({
        where: { pin, active: true },
        include: { user: true, tenant: { select: { name: true, subdomain: true } } },
      });
      if (!membership || !membership.user.active) {
        return reply.status(401).send({ error: 'Geçersiz şifre' });
      }
      const user = membership.user;

      const token = signStaffToken({
        userId: user.id,
        tenantId: membership.tenantId,
        role: membership.role,
        locationId: membership.locationId ?? undefined,
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await request.db.session.create({ data: { userId: user.id, token, expiresAt } });
      await request.db.activityLog.create({
        data: { userId: user.id, action: 'LOGIN', details: { method: 'pin' }, ipAddress: request.ip },
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership.role,
          avatar: user.avatar,
          phone: user.phone,
          locationId: membership.locationId,
          isOnline: user.isOnline,
        },
      };
    },
  );

  // -----------------------------------------------------------------
  // Kurye girişi — PIN + rol=COURIER kontrolü (tenant-scoped)
  // -----------------------------------------------------------------
  server.post(
    '/courier-login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { pin } = request.body as { pin?: string };
      if (!pin || !/^\d{4,6}$/.test(pin)) {
        return reply.status(400).send({ error: 'Geçerli bir PIN giriniz' });
      }
      if (!(request as any).tenant) {
        return reply.status(400).send({ error: 'Restoran belirlenemedi (subdomain veya X-Tenant-ID gerekli)' });
      }

      const membership = await request.db.membership.findFirst({
        where: { pin, active: true },
        include: { user: true },
      });
      if (!membership || !membership.user.active || membership.role !== 'COURIER') {
        return reply
          .status(401)
          .send({ error: 'Geçersiz şifre veya bu hesap kurye hesabı değil' });
      }
      const user = membership.user;

      const token = signStaffToken({
        userId: user.id,
        tenantId: membership.tenantId,
        role: membership.role,
        locationId: membership.locationId ?? undefined,
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await request.db.session.create({ data: { userId: user.id, token, expiresAt } });
      await request.db.activityLog.create({
        data: { userId: user.id, action: 'LOGIN', details: { method: 'courier-pin' }, ipAddress: request.ip },
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership.role,
          avatar: user.avatar,
          phone: user.phone,
          locationId: membership.locationId,
          isOnline: user.isOnline,
        },
      };
    },
  );

  // Logout — token'lı istek: hook tenant'ı JWT'den çözer, req.db scoped'tur
  server.post(
    '/logout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Token gerekli' });
      }
      const token = authHeader.replace('Bearer ', '');
      await request.db.session.deleteMany({ where: { token } });
      return { success: true };
    },
  );

  // Ortak /me handler'ı (GET + POST aynı davranış)
  async function meHandler(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader) return reply.status(401).send({ error: 'Token gerekli' });
    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string; tenantId?: string };
      if (!decoded.userId) {
        return reply.status(401).send({ error: 'Bu endpoint personel/kurye token gerektirir' });
      }
      const user = await platformDb.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true, email: true, name: true, avatar: true,
          phone: true, isOnline: true, lastSeenAt: true, active: true,
        },
      });
      if (!user || !user.active) {
        return reply.status(401).send({ error: 'Kullanıcı bulunamadı' });
      }
      // Rol/şube üyelikten (token'daki tenant için)
      const membership = decoded.tenantId
        ? await platformDb.membership.findUnique({
            where: { userId_tenantId: { userId: user.id, tenantId: decoded.tenantId } },
          })
        : null;
      return {
        user: {
          ...user,
          role: membership?.role ?? null,
          locationId: membership?.locationId ?? null,
        },
      };
    } catch {
      return reply.status(401).send({ error: 'Geçersiz token' });
    }
  }
  server.get('/me', meHandler);
  server.post('/me', meHandler); // bazı mobile-shared client'lar POST yapar

  // Change password — kimlik platform-seviyesi
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
        return reply.status(400).send({ error: 'Mevcut ve yeni şifre gerekli' });
      }
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await platformDb.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
          return reply.status(401).send({ error: 'Kullanıcı bulunamadı' });
        }
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
          return reply.status(401).send({ error: 'Mevcut şifre yanlış' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await platformDb.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });
        await request.db.activityLog.create({
          data: { userId: user.id, action: 'PASSWORD_CHANGE', ipAddress: request.ip },
        });
        return { success: true };
      } catch {
        return reply.status(401).send({ error: 'Geçersiz token' });
      }
    },
  );

  // -----------------------------------------------------------------
  // Customer (loyalty member) email + OTP flow — TENANT-SCOPED
  // (Customer.email/phone artık [tenantId, x] benzersiz → findFirst kullanılır;
  //  req.db tenant filtresini otomatik enjekte eder. Sipariş sitesi subdomain'i
  //  tenant'ı çözer.)
  // -----------------------------------------------------------------

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

    // Phone uniqueness — aynı tenant içinde başka customer aynı phone kullanmasın
    if (cleanPhone) {
      const phoneOwner = await request.db.customer.findFirst({ where: { phone: cleanPhone } });
      if (phoneOwner && phoneOwner.email !== cleaned) {
        return reply.status(400).send({
          error: 'Bu telefon başka bir hesaba kayıtlı',
          code: 'PHONE_EXISTS',
        });
      }
    }

    // Find or create — [tenantId, email] benzersiz; req.db tenant'ı filtreler.
    let customer = await request.db.customer.findFirst({ where: { email: cleaned } });
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
      customer = await request.db.customer.create({
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
      customer = await request.db.customer.update({
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
    const customer = await request.db.customer.findFirst({ where: { email: cleaned } });
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
    const updated = await request.db.customer.update({
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

    // Customer token da tenant taşır (mobil app X-Tenant-ID yerine bundan da çözülebilir)
    const token = jwt.sign(
      { customerId: updated.id, email: updated.email, tenantId: updated.tenantId, aud: CUSTOMER_JWT_AUDIENCE },
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
