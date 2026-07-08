// ============================================================================
// Şifre belirleme / sıfırlama — /api/platform/set-password + /forgot-password.
// ============================================================================
// SETUP: signup maili linki (ilk şifre). RESET: "şifremi unuttum".
// Token tek kullanımlık + süreli; forgot her durumda 200 döner (enumeration
// koruması) ve kullanıcı başına 60 sn throttle uygular.

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { platformDb } from '../../lib/tenant-db';
import { sendPlatformMail, passwordResetTemplate } from '../../lib/mailer';

const RESET_TOKEN_HOURS = 24;
// e-posta → son istek zamanı (tek instance yeterli; kötüye kullanım sınırı)
const lastForgotAt = new Map<string, number>();

export default async function passwordRoutes(server: FastifyInstance) {
  // Token geçerli mi? (form açılırken kontrol — kullanıcıya erken hata göster)
  server.get('/password-token/:token', async (request: FastifyRequest) => {
    const { token } = request.params as { token: string };
    const row = await platformDb.passwordToken.findUnique({
      where: { token },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return { valid: false };
    }
    return { valid: true, purpose: row.purpose, email: row.user.email, name: row.user.name };
  });

  // Şifreyi belirle/sıfırla — token tüketilir
  server.post('/set-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, password } = (request.body || {}) as { token?: string; password?: string };
    if (!token || !password) return reply.status(400).send({ error: 'Token ve şifre zorunlu' });
    if (password.length < 6) return reply.status(400).send({ error: 'Şifre en az 6 karakter' });

    const row = await platformDb.passwordToken.findUnique({ where: { token } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Bağlantı geçersiz ya da süresi dolmuş', code: 'TOKEN_INVALID' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await platformDb.$transaction([
      platformDb.user.update({ where: { id: row.userId }, data: { password: hashed } }),
      platformDb.passwordToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    ]);

    // Kullanıcının POS giriş adresi (ilk üyeliğinin subdomain'i) — UI yönlendirmesi için
    const membership = await platformDb.membership.findFirst({
      where: { userId: row.userId },
      include: { tenant: { select: { subdomain: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const baseDomain = process.env.PLATFORM_BASE_DOMAIN || 'otorder.com';
    return {
      ok: true,
      loginUrl: membership ? `https://${membership.tenant.subdomain}.${baseDomain}/pos/` : `https://${baseDomain}`,
    };
  });

  // Şifremi unuttum — her durumda 200 (hesap var/yok sızdırılmaz)
  server.post('/forgot-password', async (request: FastifyRequest) => {
    const { email } = (request.body || {}) as { email?: string };
    const normalized = (email || '').toLowerCase().trim();
    const generic = { ok: true, message: 'Hesap varsa sıfırlama bağlantısı gönderildi' };
    if (!normalized || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return generic;

    // 60 sn throttle
    const last = lastForgotAt.get(normalized) || 0;
    if (Date.now() - last < 60_000) return generic;
    lastForgotAt.set(normalized, Date.now());

    const user = await platformDb.user.findUnique({ where: { email: normalized }, select: { id: true, name: true } });
    if (!user) return generic;

    const token = randomBytes(32).toString('base64url');
    await platformDb.passwordToken.create({
      data: { userId: user.id, token, purpose: 'RESET', expiresAt: new Date(Date.now() + RESET_TOKEN_HOURS * 3600_000) },
    });
    const baseDomain = process.env.PLATFORM_BASE_DOMAIN || 'otorder.com';
    const resetUrl = `https://${baseDomain}/sifre-belirle?token=${token}`;
    sendPlatformMail(platformDb, {
      to: normalized,
      subject: 'OtOrder — şifre sıfırlama bağlantın',
      html: passwordResetTemplate({ name: user.name, resetUrl }),
      template: 'password-reset',
    }).catch(() => {});
    return generic;
  });
}
