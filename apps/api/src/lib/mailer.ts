// Centralized mailer for HighFive — uses Resend's HTTP API (api.resend.com)
// instead of raw SMTP because the production host's ISP blocks outbound
// 25/465/587. Resend gives us free 100/day with DKIM-signed delivery from
// info@highfivepps.com once the domain is verified in their dashboard.
//
// Emails ship in a HighFive-branded HTML shell so OTP / loyalty / marketing
// messages feel cohesive without each call site re-writing the wrapper.

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.HIGHFIVE_MAIL_FROM || 'info@highfivepps.com';
const FROM_NAME = process.env.HIGHFIVE_MAIL_FROM_NAME || 'High Five';
const REPLY_TO = process.env.HIGHFIVE_MAIL_REPLY_TO || FROM_EMAIL;
// Outlook/iCloud SVG'yi render etmiyor — header'da PNG kullanmalıyız.
// Public asset, açık internet'te (Resend bunu inline çekecek).
const LOGO_URL = process.env.HIGHFIVE_MAIL_LOGO_URL || 'https://order.highfivepps.com/logow.png';

/**
 * Wrap a single content block in the HighFive email shell. Used by every
 * outgoing email so brand identity stays consistent. `accent` lets specific
 * email types (welcome, order, marketing) tint the header bar.
 */
export function renderBrandedEmail(opts: {
  preheader?: string;       // Hidden first-line preview text (Gmail uses this)
  title: string;
  body: string;             // already-formatted HTML for the inner card
  ctaLabel?: string;
  ctaUrl?: string;
  accent?: string;          // hex, defaults to highfive red
  // Beyaz-etiket marka parametreleri (yoksa HighFive varsayılanları)
  brandName?: string;       // header alt yazısı + footer metni
  logoUrl?: string | null;  // null → logo yerine marka adı metin olarak
  contactEmail?: string;    // footer iletişim adresi
  footerNote?: string;      // footer ilk satırı (varsayılan sadakat metni)
}): string {
  const accent = opts.accent || '#bb1e10';
  const preheader = opts.preheader || '';
  const brandName = opts.brandName || 'High Five';
  const logoUrl = opts.logoUrl === undefined ? LOGO_URL : opts.logoUrl;
  const contactEmail = opts.contactEmail || 'info@highfivepps.com';
  const footerNote =
    opts.footerNote || `Bu e-postayı ${brandName} ile ilişkiniz olduğu için aldınız.`;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f2;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;">
  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5f5f2;opacity:0;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.06);">
          <!-- Brand bar -->
          <tr>
            <td style="background:${accent};padding:24px 32px;text-align:center;">
              ${
                logoUrl
                  ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" width="160" style="display:inline-block;max-width:160px;max-height:64px;height:auto;border:0;outline:none;text-decoration:none;" />`
                  : `<div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:.5px;">${escapeHtml(brandName)}</div>`
              }
              <div style="font-size:12px;color:rgba(255,255,255,.85);letter-spacing:1.5px;margin-top:8px;">
                ${escapeHtml(opts.title.toUpperCase())}
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;">
              ${opts.body}
              ${
                opts.ctaUrl && opts.ctaLabel
                  ? `<div style="text-align:center;margin:32px 0 8px;">
                      <a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;background:${accent};color:#ffffff;padding:14px 32px;border-radius:10px;font-weight:700;text-decoration:none;letter-spacing:.5px;">
                        ${escapeHtml(opts.ctaLabel)}
                      </a>
                    </div>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafaf8;padding:20px 32px;text-align:center;border-top:1px solid #ecece7;">
              <div style="font-size:12px;color:#6b6b6b;line-height:1.6;">
                ${escapeHtml(footerNote)}<br>
                Bizimle <a href="mailto:${escapeHtml(contactEmail)}" style="color:${accent};text-decoration:none;">${escapeHtml(contactEmail)}</a> adresinden iletişime geçebilirsiniz.
              </div>
              <div style="font-size:11px;color:#9a9a9a;margin-top:12px;">
                © ${new Date().getFullYear()} ${escapeHtml(brandName)} — Tüm hakları saklıdır.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface SendMailOpts {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  // Beyaz-etiket: gönderen override'ı (yoksa HIGHFIVE_MAIL_* varsayılanları)
  fromEmail?: string;
  fromName?: string;
  headers?: Record<string, string>; // ör. List-Unsubscribe (pazarlama)
}

export async function sendMail(opts: SendMailOpts): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${opts.fromName || FROM_NAME} <${opts.fromEmail || FROM_EMAIL}>`,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo || REPLY_TO,
        ...(opts.headers ? { headers: opts.headers } : {}),
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      console.error('📧 resend failed:', msg);
      return { ok: false, error: msg };
    }
    console.log(`📧 sent to ${opts.to}: ${data?.id}`);
    return { ok: true, messageId: data?.id };
  } catch (err: any) {
    console.error('📧 send failed:', err?.message);
    return { ok: false, error: err?.message || 'send failed' };
  }
}

// ============================================================
// OtOrder çok-kiracılı gönderim katmanı
// ============================================================
// Platform mailleri: "OtOrder <noreply@otorder.com>". Tenant mailleri:
// "<Restoran Adı> <subdomain@otorder.com>" + Reply-To restoranın gerçek adresi.
// Her gönderim EmailLog'a yazılır (başarı/hata — görünürlük + ölçüm).

const PLATFORM_MAIL_DOMAIN = process.env.PLATFORM_MAIL_DOMAIN || 'otorder.com';
const PLATFORM_MAIL_FROM = process.env.PLATFORM_MAIL_FROM || `noreply@${PLATFORM_MAIL_DOMAIN}`;
const PLATFORM_MAIL_FROM_NAME = process.env.PLATFORM_MAIL_FROM_NAME || 'OtOrder';
export const OTORDER_ACCENT = '#bb1e10';

async function logEmail(
  prisma: any,
  entry: { tenantId?: string | null; toEmail: string; fromEmail: string; template: string; subject: string; success: boolean; error?: string | null },
): Promise<void> {
  try {
    await prisma.emailLog.create({ data: { ...entry, error: entry.error || null, tenantId: entry.tenantId || null } });
  } catch (err: any) {
    console.error('📧 email log failed:', err?.message);
  }
}

/** Platform maili — OtOrder <noreply@otorder.com>. */
export async function sendPlatformMail(
  prisma: any,
  opts: { to: string; subject: string; html: string; template: string; headers?: Record<string, string> },
): Promise<{ ok: boolean; error?: string }> {
  const result = await sendMail({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    fromEmail: PLATFORM_MAIL_FROM,
    fromName: PLATFORM_MAIL_FROM_NAME,
    replyTo: PLATFORM_MAIL_FROM,
    headers: opts.headers,
  });
  await logEmail(prisma, {
    toEmail: opts.to, fromEmail: PLATFORM_MAIL_FROM, template: opts.template,
    subject: opts.subject, success: result.ok, error: result.error,
  });
  return result;
}

export interface TenantMailBrand {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  fromEmail: string;   // <subdomain>@otorder.com
  replyTo: string;     // restoranın gerçek adresi (Settings.restaurant.email → owner)
  accent: string;      // theme.primary (hex) → mail kabuğu rengi
  logoUrl: string | null;
  siteUrl: string;     // https://<subdomain>.otorder.com
}

/** Tenant marka bilgisini çöz (mail kabuğu + from/reply-to için). */
export async function resolveTenantBrand(prisma: any, tenantId: string): Promise<TenantMailBrand | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, subdomain: true } });
  if (!tenant) return null;
  const [themeRow, restaurantRow, ownerMembership] = await Promise.all([
    prisma.settings.findFirst({ where: { tenantId, key: 'theme' } }),
    prisma.settings.findFirst({ where: { tenantId, key: 'restaurant' } }),
    prisma.membership.findFirst({ where: { tenantId, role: 'OWNER' }, include: { user: { select: { email: true } } } }),
  ]);
  const theme = (themeRow?.value as Record<string, any>) || {};
  const restaurant = (restaurantRow?.value as Record<string, any>) || {};
  const primary = typeof theme.primary === 'string' && theme.primary.startsWith('#') ? theme.primary : OTORDER_ACCENT;
  const rawLogo = typeof theme.logoUrl === 'string' && theme.logoUrl ? theme.logoUrl : null;
  const siteUrl = `https://${tenant.subdomain}.${PLATFORM_MAIL_DOMAIN}`;
  return {
    tenantId,
    tenantName: (theme.name as string) || tenant.name,
    subdomain: tenant.subdomain,
    fromEmail: `${tenant.subdomain}@${PLATFORM_MAIL_DOMAIN}`,
    replyTo: (restaurant.email as string) || ownerMembership?.user?.email || PLATFORM_MAIL_FROM,
    accent: primary,
    logoUrl: rawLogo ? (rawLogo.startsWith('http') ? rawLogo : `${siteUrl}${rawLogo}`) : null,
    siteUrl,
  };
}

/**
 * Tenant maili — "<Restoran>" <subdomain@otorder.com>; kabuk tenant markalı.
 * `render(brand)` çağrılır ki şablon marka bilgisini (renk/isim/site) kullanabilsin.
 */
export async function sendTenantMail(
  prisma: any,
  tenantId: string,
  opts: {
    to: string;
    subject: string | ((brand: TenantMailBrand) => string);
    render: (brand: TenantMailBrand) => string;
    template: string;
    headers?: Record<string, string>;
  },
): Promise<{ ok: boolean; error?: string }> {
  const brand = await resolveTenantBrand(prisma, tenantId);
  if (!brand) return { ok: false, error: 'tenant not found' };
  const subject = typeof opts.subject === 'function' ? opts.subject(brand) : opts.subject;
  const result = await sendMail({
    to: opts.to,
    subject,
    html: opts.render(brand),
    fromEmail: brand.fromEmail,
    fromName: brand.tenantName,
    replyTo: brand.replyTo,
    headers: opts.headers,
  });
  await logEmail(prisma, {
    tenantId, toEmail: opts.to, fromEmail: brand.fromEmail, template: opts.template,
    subject, success: result.ok, error: result.error,
  });
  return result;
}

/** Tenant markalı kabuk kısayolu — şablonlar için. */
export function renderTenantEmail(
  brand: TenantMailBrand,
  opts: { preheader?: string; title: string; body: string; ctaLabel?: string; ctaUrl?: string; footerNote?: string },
): string {
  return renderBrandedEmail({
    ...opts,
    accent: brand.accent,
    brandName: brand.tenantName,
    logoUrl: brand.logoUrl,
    contactEmail: brand.replyTo,
  });
}

/** Platform (OtOrder) markalı kabuk kısayolu. */
export function renderPlatformEmail(opts: {
  preheader?: string; title: string; body: string; ctaLabel?: string; ctaUrl?: string; footerNote?: string;
}): string {
  return renderBrandedEmail({
    ...opts,
    accent: OTORDER_ACCENT,
    brandName: 'OtOrder',
    logoUrl: null,
    contactEmail: PLATFORM_MAIL_FROM,
    footerNote: opts.footerNote || 'Bu e-postayı OtOrder üzerinde bir restoran hesabınız olduğu için aldınız.',
  });
}

// ============================================================
// Pre-built templates
// ============================================================

export function emailOtpTemplate(code: string, opts?: { tenantName?: string }) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#1a1a1a;">
      Giriş kodun geldi 👋
    </h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4a4a;margin:0 0 24px;">
      ${opts?.tenantName ? escapeHtml(opts.tenantName) : 'High Five'} hesabına giriş yapmak için aşağıdaki 6 haneli kodu kullan. Bu kod <b>10 dakika</b> geçerli — kimseyle paylaşma.
    </p>
    <div style="background:#f5f5f2;border:2px dashed #bb1e10;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <div style="font-family:'SF Mono',Menlo,monospace;font-size:36px;font-weight:800;letter-spacing:8px;color:#bb1e10;">
        ${escapeHtml(code)}
      </div>
    </div>
    <p style="font-size:13px;color:#8a8a8a;margin:16px 0 0;">
      Bu girişi sen başlatmadıysan bu e-postayı yok sayabilirsin — hiç kimse senin adına oturum açmadı.
    </p>`;
  return renderBrandedEmail({
    preheader: `Giriş kodun: ${code} — 10 dakika geçerli`,
    title: 'Giriş Kodu',
    body,
  });
}

export function welcomeTemplate(name: string) {
  const body = `
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#1a1a1a;">
      Aramıza hoş geldin, ${escapeHtml(name)} 🎉
    </h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4a4a;margin:0 0 16px;">
      High Five sadakat programına kayıt olduğun için teşekkürler. Bundan sonra her siparişinde puan biriktireceksin ve sana özel kampanyalardan ilk sen haberdar olacaksın.
    </p>
    <ul style="font-size:14px;color:#4a4a4a;line-height:1.8;padding-left:20px;margin:0 0 24px;">
      <li>Her 10₺ harcama → 1 puan</li>
      <li>Doğum gününde sürpriz indirim</li>
      <li>Yeni ürünleri ilk sen dene</li>
    </ul>`;
  return renderBrandedEmail({
    preheader: 'High Five ailesine hoş geldin — sadakat programın aktif',
    title: 'Hoş Geldin',
    body,
    ctaLabel: 'Menüye Göz At',
    ctaUrl: 'https://order.highfivepps.com',
  });
}

// Reusable wrapper for marketing campaigns. Pass a title + main body HTML
// and a CTA — the result is the same branded shell every customer is
// already used to seeing.
export function marketingTemplate(opts: {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  accent?: string;
  preheader?: string;
}) {
  return renderBrandedEmail({
    preheader: opts.preheader,
    title: opts.title,
    body: opts.bodyHtml,
    ctaLabel: opts.ctaLabel,
    ctaUrl: opts.ctaUrl,
    accent: opts.accent,
  });
}

// ============================================================
// OtOrder platform şablonları (P1-P8)
// ============================================================

const p = (s: string) => `<p style="font-size:15px;line-height:1.7;color:#4a4a4a;margin:0 0 16px;">${s}</p>`;
const h1 = (s: string) => `<h1 style="font-size:22px;font-weight:700;margin:0 0 14px;color:#1a1a1a;">${s}</h1>`;

/** P1 — Hoş geldin + şifre belirleme (signup sonrası). */
export function passwordSetupTemplate(opts: { name: string; restaurantName: string; siteUrl: string; setupUrl: string }) {
  return renderPlatformEmail({
    preheader: `${opts.restaurantName} hazır — şifreni belirle, POS'a gir`,
    title: 'Restoranın Hazır',
    body:
      h1(`Hoş geldin, ${escapeHtml(opts.name)} 🎉`) +
      p(`<b>${escapeHtml(opts.restaurantName)}</b> için sipariş sitesi, POS ve mutfak ekranı kuruldu:`) +
      p(`<a href="${escapeHtml(opts.siteUrl)}" style="color:${OTORDER_ACCENT};font-weight:700;">${escapeHtml(opts.siteUrl)}</a>`) +
      p(`Panele girebilmek için önce şifreni belirle. Bu bağlantı <b>24 saat</b> geçerli:`),
    ctaLabel: 'Şifreni belirle',
    ctaUrl: opts.setupUrl,
  });
}

/** P2 — Şifre sıfırlama (şifremi unuttum). */
export function passwordResetTemplate(opts: { name: string; resetUrl: string }) {
  return renderPlatformEmail({
    preheader: 'Şifre sıfırlama bağlantın — 24 saat geçerli',
    title: 'Şifre Sıfırlama',
    body:
      h1(`Merhaba ${escapeHtml(opts.name)},`) +
      p('Hesabın için şifre sıfırlama isteği aldık. Yeni şifreni belirlemek için aşağıdaki bağlantıyı kullan. Bağlantı <b>24 saat</b> geçerli.') +
      p('Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmedi.'),
    ctaLabel: 'Yeni şifre belirle',
    ctaUrl: opts.resetUrl,
  });
}

/** P3 — Personel hesabı açıldı (PIN maille). */
export function staffCredentialsTemplate(opts: { staffName: string; restaurantName: string; pin: string; posUrl: string }) {
  return renderPlatformEmail({
    preheader: `${opts.restaurantName} POS giriş bilgin`,
    title: 'Personel Hesabın Açıldı',
    body:
      h1(`Merhaba ${escapeHtml(opts.staffName)},`) +
      p(`<b>${escapeHtml(opts.restaurantName)}</b> ekibine eklendin. POS'a aşağıdaki 6 haneli şifreyle girebilirsin:`) +
      `<div style="background:#f5f5f2;border:2px dashed ${OTORDER_ACCENT};border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
        <div style="font-family:'SF Mono',Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:8px;color:${OTORDER_ACCENT};">${escapeHtml(opts.pin)}</div>
      </div>` +
      p('Bu şifreyi kimseyle paylaşma. Yöneticin istediğinde POS üzerinden değiştirebilir.'),
    ctaLabel: "POS'a git",
    ctaUrl: opts.posUrl,
  });
}

/** P4 — Deneme bitmek üzere (D-2). */
export function trialReminderTemplate(opts: { restaurantName: string; daysLeft: number; billingUrl: string }) {
  return renderPlatformEmail({
    preheader: `Deneme süren ${opts.daysLeft} gün sonra bitiyor`,
    title: 'Deneme Süresi Hatırlatması',
    body:
      h1(`${escapeHtml(opts.restaurantName)} için ${opts.daysLeft} gün kaldı ⏳`) +
      p(`Ücretsiz deneme süren <b>${opts.daysLeft} gün</b> sonra sona eriyor. Kesintisiz devam etmek için şimdi planını seç — siparişlerin, menün ve ayarların aynen kalır.`),
    ctaLabel: 'Planını seç',
    ctaUrl: opts.billingUrl,
  });
}

/** P5 — Deneme bitti, hesap kilitlendi. */
export function trialEndedTemplate(opts: { restaurantName: string; billingUrl: string }) {
  return renderPlatformEmail({
    preheader: 'Deneme süren doldu — ödeme ile hemen devam edebilirsin',
    title: 'Deneme Süresi Doldu',
    body:
      h1(`${escapeHtml(opts.restaurantName)} askıya alındı`) +
      p('7 günlük ücretsiz deneme süren doldu ve hesabın geçici olarak kilitlendi. Verilerin güvende: menün, siparişlerin ve ayarların duruyor.') +
      p('Bir plan seçip ödemeni yaptığın anda her şey kaldığı yerden açılır.'),
    ctaLabel: 'Ödemeye git',
    ctaUrl: opts.billingUrl,
  });
}

/** P6 — Ödeme alındı (makbuz). */
export function paymentReceiptTemplate(opts: { restaurantName: string; planName: string; amount: string; periodEnd: string; billingUrl: string }) {
  return renderPlatformEmail({
    preheader: `Ödemen alındı — ${opts.planName} aktif`,
    title: 'Ödeme Alındı',
    body:
      h1('Teşekkürler! Ödemen alındı ✅') +
      p(`<b>${escapeHtml(opts.restaurantName)}</b> için <b>${escapeHtml(opts.planName)}</b> aboneliği aktif.`) +
      `<table role="presentation" width="100%" style="background:#f5f5f2;border-radius:12px;margin:8px 0 16px;">
        <tr><td style="padding:14px 18px;font-size:14px;color:#4a4a4a;">Tutar</td><td style="padding:14px 18px;font-size:14px;font-weight:700;text-align:right;">${escapeHtml(opts.amount)} ₺</td></tr>
        <tr><td style="padding:0 18px 14px;font-size:14px;color:#4a4a4a;">Sonraki yenileme</td><td style="padding:0 18px 14px;font-size:14px;font-weight:700;text-align:right;">${escapeHtml(opts.periodEnd)}</td></tr>
      </table>` +
      p('Fatura geçmişini abonelik sayfandan görebilirsin.'),
    ctaLabel: 'Aboneliğimi gör',
    ctaUrl: opts.billingUrl,
  });
}

/** P7 — Ödeme başarısız. */
export function paymentFailedTemplate(opts: { restaurantName: string; billingUrl: string }) {
  return renderPlatformEmail({
    preheader: 'Abonelik ödemen alınamadı — kartını kontrol et',
    title: 'Ödeme Alınamadı',
    body:
      h1('Ödemen alınamadı ⚠️') +
      p(`<b>${escapeHtml(opts.restaurantName)}</b> aboneliğinin yenileme ödemesi başarısız oldu. Kart limitini/son kullanma tarihini kontrol edip ödeme bilgini güncelleyebilirsin.`) +
      p('Tekrar denemeler de başarısız olursa hesabın geçici olarak askıya alınır; ödeme tamamlanınca anında açılır.'),
    ctaLabel: 'Ödeme bilgisini güncelle',
    ctaUrl: opts.billingUrl,
  });
}

/** P8 — Abonelik iptali onayı. */
export function subscriptionCancelledTemplate(opts: { restaurantName: string; periodEnd: string; billingUrl: string }) {
  return renderPlatformEmail({
    preheader: 'Aboneliğin dönem sonunda kapanacak',
    title: 'Abonelik İptal Edildi',
    body:
      h1('Aboneliğin iptal edildi') +
      p(`<b>${escapeHtml(opts.restaurantName)}</b> aboneliğinin otomatik yenilemesi kapatıldı. Hesabın <b>${escapeHtml(opts.periodEnd)}</b> tarihine kadar açık kalacak; sonrasında kilitlenir ama verilerin silinmez.`) +
      p('Fikrini değiştirirsen dönem bitmeden tek tıkla yeniden abone olabilirsin.'),
    ctaLabel: 'Yeniden abone ol',
    ctaUrl: opts.billingUrl,
  });
}
