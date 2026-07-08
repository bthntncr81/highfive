// ============================================================================
// POST /api/platform/signup — self-servis restoran kaydı (otorder.com).
// ============================================================================
// User + Tenant(TRIAL 7 gün) + Membership(OWNER) + Subscription(TRIAL) + şube.
// ŞİFRESİZ KAYIT: formda şifre alınmaz; kullanıcı rastgele şifreyle yaratılır,
// noreply@otorder.com'dan "siten hazır + şifreni belirle" maili gider (24s token).
// Auto-login token DÖNMEZ — e-posta fiilen doğrulanmış olur.

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UserRole, TenantStatus, SubscriptionStatus } from '@prisma/client';
import { platformDb } from '../../lib/tenant-db';
import { sendPlatformMail, passwordSetupTemplate } from '../../lib/mailer';

const RESERVED = new Set([
  'www', 'api', 'app', 'admin', 'order', 'orders', 'mail', 'ftp', 'blog',
  'help', 'support', 'status', 'billing', 'dashboard', 'static', 'cdn',
  'otorder', 'pos', 'kitchen', 'landing', 'demo', 'noreply', 'info', 'destek',
]);
const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/; // 3-32, harf/rakam/tire
const TRIAL_DAYS = 7;
const SETUP_TOKEN_HOURS = 24;

export default async function signupRoutes(server: FastifyInstance) {
  // Subdomain uygunluk kontrolü (kayıt formunda canlı) — public
  server.get('/signup/check-subdomain', async (request: FastifyRequest, reply: FastifyReply) => {
    const { subdomain } = request.query as { subdomain?: string };
    const s = (subdomain || '').toLowerCase().trim();
    if (!SUBDOMAIN_RE.test(s) || RESERVED.has(s)) {
      return { available: false, reason: 'Geçersiz veya ayrılmış subdomain' };
    }
    const exists = await platformDb.tenant.findUnique({ where: { subdomain: s }, select: { id: true } });
    return { available: !exists };
  });

  server.post('/signup', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      name?: string;
      email?: string;
      restaurantName?: string;
      subdomain?: string;
      planKey?: string;
    };
    const name = (body.name || '').trim();
    const email = (body.email || '').toLowerCase().trim();
    const restaurantName = (body.restaurantName || '').trim();
    const subdomain = (body.subdomain || '').toLowerCase().trim();
    const planKey = (body.planKey || 'STARTER').toUpperCase();

    if (!name || !email || !restaurantName || !subdomain) {
      return reply.status(400).send({ error: 'Tüm alanlar zorunlu' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply.status(400).send({ error: 'Geçersiz e-posta' });
    if (!SUBDOMAIN_RE.test(subdomain) || RESERVED.has(subdomain)) {
      return reply.status(400).send({ error: 'Geçersiz veya ayrılmış subdomain' });
    }

    // Benzersizlik kontrolleri
    const [subTaken, emailTaken, plan] = await Promise.all([
      platformDb.tenant.findUnique({ where: { subdomain }, select: { id: true } }),
      platformDb.user.findUnique({ where: { email }, select: { id: true } }),
      platformDb.plan.findUnique({ where: { key: planKey } }),
    ]);
    if (subTaken) return reply.status(409).send({ error: 'Bu subdomain alınmış' });
    if (emailTaken) return reply.status(409).send({ error: 'Bu e-posta zaten kayıtlı' });
    if (!plan) return reply.status(400).send({ error: 'Geçersiz paket' });

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 864e5);
    // Şifre formda alınmaz — rastgele güçlü şifre; kullanıcı mail'deki linkle belirler.
    const hashed = await bcrypt.hash(randomBytes(24).toString('base64url'), 10);
    const setupToken = randomBytes(32).toString('base64url');

    // Atomik kayıt: user + tenant + membership + subscription + şube + setup token
    const { tenant, user } = await platformDb.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, password: hashed, name },
      });
      const tenant = await tx.tenant.create({
        data: {
          name: restaurantName,
          subdomain,
          status: TenantStatus.TRIAL,
          trialEndsAt,
          onboardingStep: 1,
        },
      });
      await tx.membership.create({
        data: { userId: user.id, tenantId: tenant.id, role: UserRole.OWNER },
      });
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: SubscriptionStatus.TRIAL,
          cycle: 'MONTHLY',
          currentPeriodEnd: trialEndsAt,
        },
      });
      // Varsayılan merkez şube (onboarding'de düzenlenir)
      await tx.location.create({
        data: { tenantId: tenant.id, name: restaurantName, code: 'merkez', isDefault: true },
      });
      await tx.passwordToken.create({
        data: {
          userId: user.id,
          token: setupToken,
          purpose: 'SETUP',
          expiresAt: new Date(Date.now() + SETUP_TOKEN_HOURS * 3600_000),
        },
      });
      return { tenant, user };
    });

    const baseDomain = process.env.PLATFORM_BASE_DOMAIN || 'otorder.com';
    const siteUrl = `https://${subdomain}.${baseDomain}`;
    const setupUrl = `https://${baseDomain}/sifre-belirle?token=${setupToken}`;

    // P1 hoş geldin maili — başarısız olsa da kayıt geçerli (log'lanır;
    // süper-admin/forgot-password ile yeni link üretilebilir).
    sendPlatformMail(platformDb, {
      to: email,
      subject: `🎉 ${restaurantName} hazır — şifreni belirle`,
      html: passwordSetupTemplate({ name, restaurantName, siteUrl, setupUrl }),
      template: 'password-setup',
    }).catch(() => {});

    return reply.status(201).send({
      user: { id: user.id, email: user.email, name: user.name },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        trialEndsAt,
        onboardingStep: 1,
      },
      plan: { key: plan.key, name: plan.name },
      loginUrl: siteUrl,
      emailSent: true, // UI "mailini kontrol et" ekranı gösterir
    });
  });
}
