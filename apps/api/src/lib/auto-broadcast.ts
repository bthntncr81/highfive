import type { DbLike } from './tenant-db';
// Otomatik kampanya / happy hour duyurusu (push + e-posta)
// POS'ta admin yeni bir kampanya/happy hour oluştururken `notifyCustomers: true`
// göndererek tetiklenir.

import { sendCampaignPush } from './push';
import { resolveTenantBrand, sendTenantMail, renderTenantEmail } from './mailer';
import { makeUnsubscribeToken } from '../routes/auth';

const escHtml = (s: any): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function broadcastCampaignToMobile(
  prisma: DbLike,
  args: {
    campaignId: string;
    title?: string;
    body?: string;
    imageUrl?: string;
  },
): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: args.campaignId },
  });
  if (!campaign || !campaign.isActive) return;

  const title = args.title ?? `🎯 ${campaign.name}`;
  const bodyText = args.body ?? campaign.description ?? 'Yeni kampanya başladı!';

  // Sadece campaigns push tercihi açık olanlara
  // (NotificationPreference yoksa varsayılan açık)
  await sendCampaignPush(prisma, {
    title,
    body: bodyText,
    imageUrl: args.imageUrl,
    campaignId: args.campaignId,
    targetType: 'VERIFIED', // sadece üye olanlar
    data: {
      type: 'CAMPAIGN',
      campaignId: args.campaignId,
      route: `/campaign/${args.campaignId}`,
    },
  });
}

/**
 * Kampanya e-posta yayını — pazarlama izni (emailConsent) olan aktif müşterilere
 * tenant markalı kampanya maili. Sıralı gönderilir (50 ms arayla — Resend'e nazik).
 * Her mailde stateless HMAC token'lı List-Unsubscribe başlığı + gövde içi çıkış
 * bağlantısı bulunur. Dönen {sent, skipped} çağıran tarafından loglanabilir.
 */
export async function broadcastCampaignEmail(
  prisma: DbLike,
  tenantId: string,
  campaign: { id: string; name: string; description?: string | null },
): Promise<{ sent: number; skipped: number }> {
  const brand = await resolveTenantBrand(prisma, tenantId);
  if (!brand) return { sent: 0, skipped: 0 };

  const customers = await prisma.customer.findMany({
    where: { tenantId, email: { not: null }, emailConsent: true, isActive: true },
    select: { id: true, email: true, name: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const customer of customers) {
    const to = String(customer.email || '').trim();
    if (!to.includes('@')) {
      skipped++;
      continue;
    }

    // Unsubscribe URL'i tenant sitesi üzerinden kurulur (nginx /api → API):
    // https://<subdomain>.otorder.com/api/auth/customer/email/unsubscribe?token=...
    const unsubscribeUrl = `${brand.siteUrl}/api/auth/customer/email/unsubscribe?token=${makeUnsubscribeToken(customer.id)}`;

    const result = await sendTenantMail(prisma, tenantId, {
      to,
      subject: (b) => `${b.tenantName} — ${campaign.name}`,
      template: 'campaign',
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
      render: (b) =>
        renderTenantEmail(b, {
          preheader: campaign.description || campaign.name,
          title: campaign.name,
          body: `
            <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#1a1a1a;">
              ${escHtml(campaign.name)} 🎯
            </h1>
            <p style="font-size:15px;line-height:1.7;color:#4a4a4a;margin:0 0 16px;">
              ${customer.name ? `Merhaba ${escHtml(customer.name)}, ` : ''}${escHtml(campaign.description || 'Yeni kampanyamız başladı — kaçırma!')}
            </p>
            <p style="font-size:12px;color:#9a9a9a;margin:24px 0 0;">
              Bu e-postayı kampanya bildirimlerine izin verdiğin için aldın.
              <a href="${escHtml(unsubscribeUrl)}" style="color:#9a9a9a;">Pazarlama e-postalarından çık</a>
            </p>`,
          ctaLabel: 'Menüye Git',
          ctaUrl: `${b.siteUrl}/menu`,
        }),
    }).catch(() => ({ ok: false as const }));

    if (result.ok) sent++;
    else skipped++;

    await sleep(50); // rate — nazik
  }

  console.log(`📧 campaign email broadcast (${brand.subdomain} / ${campaign.id}): sent=${sent} skipped=${skipped}`);
  return { sent, skipped };
}

export async function broadcastHappyHourToMobile(
  prisma: DbLike,
  args: {
    happyHourId: string;
    title?: string;
    body?: string;
  },
): Promise<void> {
  const hh = await prisma.happyHour.findUnique({
    where: { id: args.happyHourId },
  });
  if (!hh || !(hh as any).active) return;

  const title = args.title ?? `🍹 ${hh.name}`;
  const bodyText =
    args.body ??
    `${hh.startTime} - ${hh.endTime} arası %${hh.discountPercent ?? ''} indirim!`;

  await sendCampaignPush(prisma, {
    title,
    body: bodyText,
    targetType: 'VERIFIED',
    data: {
      type: 'HAPPY_HOUR',
      happyHourId: args.happyHourId,
      route: '/menu',
    },
  });
}
