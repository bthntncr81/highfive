import type { DbLike } from './tenant-db';
// Order arrival email alerts. When a new DELIVERY or TAKEAWAY order comes in from
// an external channel (web, WhatsApp, mobile), email the full order — items,
// customer, address + Google Maps link, total — to the recipients configured in
// Settings (`orderNotifications` key, edited on the POS Ayarlar page).
//
// Fire-and-forget: every path is wrapped so a mail failure can never affect order
// creation or payment processing. Delivery goes through Resend (mailer.ts), the
// only channel that works from this host (ISP blocks outbound SMTP).

import { sendMail } from './mailer';

const ACCENT = '#bb1e10';
const LOGO_URL =
  process.env.HIGHFIVE_MAIL_LOGO_URL || 'https://order.highfivepps.com/logow.png';
const POS_ORDER_BASE =
  process.env.POS_ORDER_URL || 'https://pos.highfivepps.com/orders';

interface NotifyConfig {
  enabled?: boolean;
  emails?: string[];
}

const TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Teslimat',
  TAKEAWAY: 'Paket',
  DINE_IN: 'Masa',
};

const SOURCE_LABELS: Record<string, string> = {
  WEB: '🌐 Web',
  ONLINE: '🌐 Web',
  QR: '📱 QR Menü',
  WHATSAPP: '💬 WhatsApp',
  MOBILE: '📱 Mobil Uygulama',
  MOBILE_GUEST: '📱 Mobil (Misafir)',
};

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(n: any): string {
  return (
    Number(n || 0).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₺'
  );
}

function paymentLabel(order: any): string {
  const pm: Record<string, string> = {
    CASH: 'Nakit',
    CREDIT_CARD: 'Kredi Kartı',
    DEBIT_CARD: 'Banka Kartı',
    ONLINE: 'Online Ödeme',
    MULTINET: 'Multinet',
    SODEXO: 'Sodexo',
    TICKET: 'Ticket',
    TAB: 'Hesap Açık',
    OTHER: 'Diğer',
  };
  const method = order.paymentMethod
    ? pm[order.paymentMethod] || order.paymentMethod
    : '-';
  const paid =
    order.paymentStatus === 'PAID'
      ? ' (Ödendi)'
      : order.paymentStatus === 'PENDING'
      ? ' (Bekliyor)'
      : '';
  return method + paid;
}

// Prefer the GPS pin (mobile), then a lat,lng embedded in the address text
// (landing geolocation), then a plain text search.
function mapsUrl(
  address?: string | null,
  lat?: number | null,
  lng?: number | null,
): string | null {
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (!address) return null;
  const m = address.match(
    /https?:\/\/maps\.google\.com\/\?q=(-?\d+\.\d+),(-?\d+\.\d+)/,
  );
  if (m) return `https://www.google.com/maps/search/?api=1&query=${m[1]},${m[2]}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address,
  )}`;
}

function buildHtml(order: any, forCustomer = false): string {
  const orderNo = '#' + String(order.orderNumber).padStart(4, '0');
  const typeLabel = TYPE_LABELS[order.type] || order.type;
  const sourceLabel =
    SOURCE_LABELS[String(order.source || '').toUpperCase()] ||
    order.source ||
    '-';
  const link = mapsUrl(
    order.customerAddress,
    order.customerLatitude,
    order.customerLongitude,
  );
  const when = new Date(order.createdAt).toLocaleString('tr-TR');

  const rows = (order.items || [])
    .map((it: any) => {
      const name = esc(it.menuItem?.name || it.menuItemName || 'Ürün');
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:#1a1a1a;">${it.quantity}× ${name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;color:#555;text-align:right;white-space:nowrap;">${money(
          it.total,
        )}</td>
      </tr>`;
    })
    .join('');

  const addressBlock = order.customerAddress
    ? `<div style="margin-top:18px;padding:14px 16px;background:#fff6f5;border:1px solid #f3d6d2;border-radius:10px;">
         <div style="font-size:11px;color:#9a6b66;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">📍 Teslimat Adresi</div>
         <div style="font-size:14px;color:#1a1a1a;line-height:1.55;">${esc(
           order.customerAddress,
         )}</div>
         ${
           link
             ? `<a href="${esc(
                 link,
               )}" style="display:inline-block;margin-top:10px;background:${ACCENT};color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">Haritada Aç →</a>`
             : ''
         }
       </div>`
    : '';

  const info = (label: string, val: string) =>
    `<tr><td style="padding:3px 0;color:#8a8a8a;font-size:13px;width:90px;vertical-align:top;">${label}</td><td style="padding:3px 0;color:#1a1a1a;font-size:14px;font-weight:600;">${val}</td></tr>`;

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f2;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f2;padding:28px 14px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.06);">
        <tr><td style="background:${ACCENT};padding:22px 28px;">
          <img src="${LOGO_URL}" alt="High Five" width="130" style="display:block;border:0;">
          <div style="color:#fff;font-size:18px;font-weight:800;margin-top:10px;">${
            forCustomer ? 'Siparişin Alındı 🎉' : '🔔 Yeni ' + esc(typeLabel) + ' Siparişi'
          }</div>
        </td></tr>
        <tr><td style="padding:26px 28px;">
          <div style="display:inline-block;background:#1a1a1a;color:#fff;font-size:20px;font-weight:800;padding:6px 14px;border-radius:8px;">${orderNo}</div>
          <span style="margin-left:10px;font-size:14px;color:#666;">${esc(
            sourceLabel,
          )} • ${esc(when)}</span>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
            ${info('Müşteri', esc(order.customerName || '-'))}
            ${info(
              'Telefon',
              order.customerPhone
                ? `<a href="tel:${esc(
                    order.customerPhone,
                  )}" style="color:${ACCENT};text-decoration:none;">${esc(
                    order.customerPhone,
                  )}</a>`
                : '-',
            )}
            ${order.notes ? info('Not', esc(order.notes)) : ''}
            ${info('Ödeme', esc(paymentLabel(order)))}
          </table>

          ${addressBlock}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-top:2px solid #1a1a1a;">
            ${rows}
            <tr><td style="padding:12px 0 0;font-size:17px;font-weight:800;color:#1a1a1a;">Toplam</td>
                <td style="padding:12px 0 0;font-size:17px;font-weight:800;color:${ACCENT};text-align:right;">${money(
                  order.total,
                )}</td></tr>
          </table>

          ${forCustomer ? '' : `<div style="text-align:center;margin-top:28px;">
            <a href="${POS_ORDER_BASE}/${order.id}" style="display:inline-block;background:${ACCENT};color:#fff;padding:13px 28px;border-radius:10px;font-weight:700;text-decoration:none;">Siparişi POS'ta Aç</a>
          </div>`}
        </td></tr>
        <tr><td style="background:#fafaf8;padding:16px 28px;border-top:1px solid #ecece7;text-align:center;font-size:11px;color:#9a9a9a;">
          ${forCustomer ? 'High Five — siparişin için teşekkürler 🍕' : 'High Five — otomatik sipariş bildirimi'}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function notifyNewOrder(
  prisma: DbLike,
  orderId: string,
): Promise<void> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'orderNotifications' },
    });
    const cfg = (setting?.value as NotifyConfig) || {};
    if (!cfg.enabled) return; // ana açma/kapama (POS Ayarlar)

    const adminEmails = (Array.isArray(cfg.emails) ? cfg.emails : [])
      .map((e) => String(e || '').trim())
      .filter((e) => e.includes('@'));

    const order: any = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: true } }, table: true },
    });
    if (!order) return;

    // Tüm sipariş türleri ve tüm kaynaklar (POS dahil) bildirilir.
    const orderNo = '#' + String(order.orderNumber).padStart(4, '0');
    const typeLabel = TYPE_LABELS[order.type] || order.type;

    // Alıcıları topla: yönetici(ler) staff şablonu, müşteri onay şablonu. Tekille.
    const seen = new Set<string>();
    const tasks: Array<Promise<unknown>> = [];

    if (adminEmails.length) {
      const adminSubject = `🔔 Yeni ${typeLabel} Siparişi ${orderNo}${
        order.customerName ? ' — ' + order.customerName : ''
      }`;
      const adminHtml = buildHtml(order, false);
      for (const to of adminEmails) {
        const k = to.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        tasks.push(sendMail({ to, subject: adminSubject, html: adminHtml }).catch(() => {}));
      }
    }

    const customerEmail = String(order.customerEmail || '').trim();
    if (customerEmail.includes('@') && !seen.has(customerEmail.toLowerCase())) {
      seen.add(customerEmail.toLowerCase());
      tasks.push(
        sendMail({
          to: customerEmail,
          subject: `Siparişin alındı ${orderNo} — High Five`,
          html: buildHtml(order, true),
        }).catch(() => {}),
      );
    }

    if (tasks.length) await Promise.all(tasks);
  } catch {
    // swallow — notifications must never break order flow
  }
}
