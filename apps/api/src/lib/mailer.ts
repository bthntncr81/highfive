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
}): string {
  const accent = opts.accent || '#bb1e10';
  const preheader = opts.preheader || '';

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
              <img
                src="${LOGO_URL}"
                alt="High Five"
                width="160"
                style="display:inline-block;max-width:160px;height:auto;border:0;outline:none;text-decoration:none;"
              />
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
                Bu e-postayı High Five sadakat programı üyesi olduğunuz için aldınız.<br>
                Bizimle <a href="mailto:info@highfivepps.com" style="color:${accent};text-decoration:none;">info@highfivepps.com</a> adresinden iletişime geçebilirsiniz.
              </div>
              <div style="font-size:11px;color:#9a9a9a;margin-top:12px;">
                © ${new Date().getFullYear()} High Five — Tüm hakları saklıdır.
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
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo || REPLY_TO,
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
