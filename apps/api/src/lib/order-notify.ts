import type { DbLike } from './tenant-db';
// Order email notifications — tenant-branded (OtOrder multi-tenant).
//
// T1  notifyNewOrder    → customer confirmation + admin alert on every new order
//                         (recipients from Settings `orderNotifications`, POS Ayarlar).
// T2  notifyOrderStatus → customer status mails (hazırlanıyor / hazır-yolda /
//                         teslim / iptal) gated by Settings
//                         `orderNotifications.statusEmails` toggles (default ON).
//
// All mails go through sendTenantMail: From "<Restoran>" <subdomain@otorder.com>,
// Reply-To the restaurant's real address, tenant-branded shell, EmailLog audit.
// Fire-and-forget: every path is wrapped so a mail failure can never affect order
// creation or payment processing.

import { sendTenantMail, renderTenantEmail, TenantMailBrand } from './mailer';

interface NotifyConfig {
  enabled?: boolean;
  emails?: string[];
  // Per-status müşteri maili anahtarları — anahtar YOKSA varsayılan AÇIK (true)
  statusEmails?: {
    preparing?: boolean;
    ready?: boolean;
    delivered?: boolean;
    cancelled?: boolean;
  };
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

function orderNumberOf(order: any): string {
  return '#' + String(order.orderNumber).padStart(4, '0');
}

// Sipariş detay bloğu — renderTenantEmail kabuğunun İÇİNE giren HTML.
// (Eski standalone buildHtml'den uyarlandı; renk artık tenant accent'i.)
function buildOrderBody(order: any, brand: TenantMailBrand, forCustomer: boolean): string {
  const accent = brand.accent;
  const orderNo = orderNumberOf(order);
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
           link && !forCustomer
             ? `<a href="${esc(
                 link,
               )}" style="display:inline-block;margin-top:10px;background:${accent};color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">Haritada Aç →</a>`
             : ''
         }
       </div>`
    : '';

  const info = (label: string, val: string) =>
    `<tr><td style="padding:3px 0;color:#8a8a8a;font-size:13px;width:90px;vertical-align:top;">${label}</td><td style="padding:3px 0;color:#1a1a1a;font-size:14px;font-weight:600;">${val}</td></tr>`;

  return `
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
            )}" style="color:${accent};text-decoration:none;">${esc(
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
          <td style="padding:12px 0 0;font-size:17px;font-weight:800;color:${accent};text-align:right;">${money(
            order.total,
          )}</td></tr>
    </table>`;
}

export async function notifyNewOrder(
  prisma: DbLike,
  orderId: string,
): Promise<void> {
  try {
    const order: any = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: true } }, table: true },
    });
    if (!order || !order.tenantId) return;

    // Ayar tenant'a AÇIKÇA filtrelenir — platformDb ile çağrılsa da doğru
    // tenant'ın ayarı okunur (request.db ile filtre zaten örtüşür).
    const setting = await prisma.settings.findFirst({
      where: { tenantId: order.tenantId, key: 'orderNotifications' },
    });
    const cfg = (setting?.value as NotifyConfig) || {};
    if (!cfg.enabled) return; // ana açma/kapama (POS Ayarlar)

    const adminEmails = (Array.isArray(cfg.emails) ? cfg.emails : [])
      .map((e) => String(e || '').trim())
      .filter((e) => e.includes('@'));

    // Tüm sipariş türleri ve tüm kaynaklar (POS dahil) bildirilir.
    const orderNo = orderNumberOf(order);
    const typeLabel = TYPE_LABELS[order.type] || order.type;

    // Alıcıları topla: yönetici(ler) staff şablonu, müşteri onay şablonu. Tekille.
    const seen = new Set<string>();
    const tasks: Array<Promise<unknown>> = [];

    if (adminEmails.length) {
      const adminSubject = `🔔 Yeni ${typeLabel} Siparişi ${orderNo}${
        order.customerName ? ' — ' + order.customerName : ''
      }`;
      for (const to of adminEmails) {
        const k = to.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        tasks.push(
          sendTenantMail(prisma, order.tenantId, {
            to,
            subject: adminSubject,
            template: 'order-new-admin',
            render: (brand) =>
              renderTenantEmail(brand, {
                preheader: `${orderNo} • ${typeLabel} • ${money(order.total)}`,
                title: `Yeni ${typeLabel} Siparişi`,
                body: buildOrderBody(order, brand, false),
                ctaLabel: "Siparişi POS'ta Aç",
                ctaUrl: `${brand.siteUrl}/pos/orders`,
                footerNote: `${brand.tenantName} — otomatik sipariş bildirimi. Alıcıları POS → Ayarlar'dan yönetebilirsin.`,
              }),
          }).catch(() => {}),
        );
      }
    }

    const customerEmail = String(order.customerEmail || '').trim();
    if (customerEmail.includes('@') && !seen.has(customerEmail.toLowerCase())) {
      seen.add(customerEmail.toLowerCase());
      tasks.push(
        sendTenantMail(prisma, order.tenantId, {
          to: customerEmail,
          subject: (brand) => `Siparişin alındı ${orderNo} — ${brand.tenantName}`,
          template: 'order-new-customer',
          render: (brand) =>
            renderTenantEmail(brand, {
              preheader: `Siparişin alındı — ${orderNo}`,
              title: 'Siparişin Alındı 🎉',
              body: buildOrderBody(order, brand, true),
              footerNote: `${brand.tenantName} — siparişin için teşekkürler!`,
            }),
        }).catch(() => {}),
      );
    }

    if (tasks.length) await Promise.all(tasks);
  } catch {
    // swallow — notifications must never break order flow
  }
}

// ============================================================
// Sipariş durum mailleri (müşteriye) — per-status toggle'lı
// ============================================================

type StatusToggleKey = 'preparing' | 'ready' | 'delivered' | 'cancelled';

// Prisma OrderStatus → ayar anahtarı eşlemesi.
// READY yalnız gel-al (TAKEAWAY) için anlamlı; kurye siparişi "yolda" mailini
// OUT_FOR_DELIVERY geçişinde alır (READY'de sipariş henüz mutfakta bekler).
const STATUS_TOGGLE_KEY: Record<string, StatusToggleKey> = {
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'ready',
  DELIVERED: 'delivered',
  COMPLETED: 'delivered',
  CANCELLED: 'cancelled',
};

/**
 * Sipariş durumu değiştiğinde müşteriye tenant markalı bilgilendirme maili.
 * customerEmail yoksa sessiz döner. Toggle'lar Settings `orderNotifications.
 * statusEmails` altında; anahtar tanımlı değilse VARSAYILAN AÇIK.
 * Fire-and-forget güvenli: her hata yutulur + loglanır.
 */
export async function notifyOrderStatus(
  prisma: DbLike,
  orderId: string,
  newStatus: string,
): Promise<void> {
  try {
    const toggleKey = STATUS_TOGGLE_KEY[newStatus];
    if (!toggleKey) return; // PENDING/CONFIRMED/SERVED vb. maillenmez

    const order: any = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.tenantId) return;

    const customerEmail = String(order.customerEmail || '').trim();
    if (!customerEmail.includes('@')) return;

    // Tür-durum uyumu: READY sadece gel-al, OUT_FOR_DELIVERY sadece kurye.
    if (newStatus === 'READY' && order.type !== 'TAKEAWAY') return;
    if (newStatus === 'OUT_FOR_DELIVERY' && order.type !== 'DELIVERY') return;

    const setting = await prisma.settings.findFirst({
      where: { tenantId: order.tenantId, key: 'orderNotifications' },
    });
    const cfg = (setting?.value as NotifyConfig) || {};
    const toggles = cfg.statusEmails || {};
    if (toggles[toggleKey] === false) return; // yalnız açıkça kapatılınca sus

    const orderNo = orderNumberOf(order);

    let title = '';
    let subject = '';
    let text = '';
    let ctaLabel: string | undefined;
    let ctaFor: ((brand: TenantMailBrand) => string) | undefined;

    if (toggleKey === 'preparing') {
      // Tahmini süre — Settings `services.estimatedDeliveryTime` (varsa)
      let estimated = '';
      const services = await prisma.settings.findFirst({
        where: { tenantId: order.tenantId, key: 'services' },
      });
      const est = (services?.value as Record<string, any>)?.estimatedDeliveryTime;
      if (typeof est === 'string' && est.trim()) estimated = est.trim();

      title = 'Siparişin hazırlanıyor 👨‍🍳';
      subject = `Siparişin hazırlanıyor ${orderNo}`;
      text =
        `<b>${orderNo}</b> numaralı siparişin mutfağa iletildi, hazırlanmaya başlandı.` +
        (estimated ? ` Tahmini süre: <b>${esc(estimated)}</b>.` : '');
    } else if (toggleKey === 'ready') {
      if (order.type === 'TAKEAWAY') {
        title = 'Siparişin hazır 🛍️';
        subject = `Siparişin hazır ${orderNo}`;
        text = `<b>${orderNo}</b> numaralı gel-al siparişin hazır, seni bekliyoruz!`;
      } else {
        title = 'Siparişin yolda 🛵';
        subject = `Siparişin yolda ${orderNo}`;
        text = `<b>${orderNo}</b> numaralı siparişin yola çıktı, kapında olmasına az kaldı!`;
      }
    } else if (toggleKey === 'delivered') {
      title = 'Afiyet olsun! 🎉';
      subject = `Afiyet olsun! ${orderNo}`;
      text = `<b>${orderNo}</b> numaralı siparişin teslim edildi. Afiyet olsun — tekrar bekleriz!`;
      ctaLabel = 'Tekrar Sipariş Ver';
      ctaFor = (brand) => `${brand.siteUrl}/menu`;
    } else {
      title = 'Siparişin iptal edildi';
      subject = `Siparişin iptal edildi ${orderNo}`;
      text =
        `<b>${orderNo}</b> numaralı siparişin iptal edildi. ` +
        'Bir sorun olduğunu düşünüyorsan bu e-postayı yanıtlayarak bize ulaşabilirsin.';
    }

    await sendTenantMail(prisma, order.tenantId, {
      to: customerEmail,
      subject: (brand) => `${subject} — ${brand.tenantName}`,
      template: `order-status-${newStatus.toLowerCase()}`,
      render: (brand) =>
        renderTenantEmail(brand, {
          preheader: `${title} — ${orderNo}`,
          title,
          body: `
            <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#1a1a1a;">${title}</h1>
            <p style="font-size:15px;line-height:1.7;color:#4a4a4a;margin:0 0 8px;">
              ${order.customerName ? `Merhaba ${esc(order.customerName)}, ` : ''}${text}
            </p>`,
          ctaLabel,
          ctaUrl: ctaFor ? ctaFor(brand) : undefined,
        }),
    });
  } catch (err: any) {
    console.error('📧 order status mail failed:', err?.message);
  }
}
