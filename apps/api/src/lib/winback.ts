// Win-back — uzun süredir sipariş geçmeyen müşterilere otomatik kampanya push'u.
//
// Mantık:
//   - Müşterinin son siparişi 14 günden eskiyse VE
//   - lastWinbackAt 30 günden eskiyse (veya hiç yoksa) VE
//   - pushConsent açıksa VE
//   - aktif DeviceToken'ı varsa
//   → push gönderilir + Customer.lastWinbackAt güncellenir.
//
// Cron: günde 1 kere, sabah 10:00 (Türkiye saati). daily-close.ts pattern'i.

import { PrismaClient } from '@prisma/client';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const WINBACK_AFTER_DAYS = 14;
const WINBACK_COOLDOWN_DAYS = 30;

let lastRunDay: string | null = null;

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

export async function runWinbackCampaign(
  prisma: PrismaClient,
): Promise<{ targeted: number; sent: number }> {
  const now = new Date();
  const orderCutoff = new Date(now.getTime() - WINBACK_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const winbackCutoff = new Date(now.getTime() - WINBACK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const customers = await prisma.customer.findMany({
    where: {
      pushConsent: true,
      orderCount: { gt: 0 },
      // Son sipariş 14+ gün önce
      OR: [
        { lastOrderAt: { lt: orderCutoff } },
        { AND: [{ lastOrderAt: null }, { updatedAt: { lt: orderCutoff } }] },
      ],
      // 30 günde 1'den fazla gönderme
      AND: [
        {
          OR: [
            { lastWinbackAt: null },
            { lastWinbackAt: { lt: winbackCutoff } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
    },
  }).catch(() => [] as any[]);

  if (customers.length === 0) {
    return { targeted: 0, sent: 0 };
  }

  // İlgili device token'ları ayrı çek (Customer ilişkisinde include yapmak istemediğim için)
  const customerIds = customers.map((c) => c.id);
  const deviceTokens = await prisma.deviceToken.findMany({
    where: {
      customerId: { in: customerIds },
      isActive: true,
    },
    select: { customerId: true, token: true },
  });

  const tokensByCustomer = new Map<string, string[]>();
  for (const dt of deviceTokens) {
    if (!dt.customerId) continue;
    const arr = tokensByCustomer.get(dt.customerId) ?? [];
    arr.push(dt.token);
    tokensByCustomer.set(dt.customerId, arr);
  }

  const messages: ExpoPushMessage[] = [];
  const customersToMark: string[] = [];

  for (const c of customers) {
    const tokens = tokensByCustomer.get(c.id) ?? [];
    const expoTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (expoTokens.length === 0) continue;

    const firstName = (c.name ?? "").split(" ")[0] || "Misafir";
    for (const t of expoTokens) {
      messages.push({
        to: t,
        sound: "default",
        title: `Seni özledik ${firstName}! 💛`,
        body: "Sana özel %15 indirim hazır. Bugün sipariş ver, kupon sepete otomatik uygulansın.",
        data: { route: "/menu", source: "winback" },
        priority: "high",
        channelId: "campaigns",
      });
    }
    customersToMark.push(c.id);
  }

  if (messages.length === 0) {
    return { targeted: customers.length, sent: 0 };
  }

  let sent = 0;
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
      sent += chunk.length;
    } catch (e) {
      console.error('[winback] expo send failed:', e);
    }
  }

  // lastWinbackAt güncelle (cooldown için)
  if (customersToMark.length > 0) {
    await prisma.customer.updateMany({
      where: { id: { in: customersToMark } },
      data: { lastWinbackAt: now },
    }).catch(() => {});
  }

  console.log(`[winback] ${sent} push gönderildi, ${customersToMark.length} müşteri işaretlendi.`);
  return { targeted: customers.length, sent };
}

/**
 * Server başlatıldığında çağrılır. Günde 1 kere sabah 10:00'da çalışır.
 */
export function startWinbackScheduler(prisma: PrismaClient): NodeJS.Timeout {
  return setInterval(async () => {
    const now = new Date();
    if (now.getHours() !== 10 || now.getMinutes() > 4) return;

    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (lastRunDay === dayKey) return;
    lastRunDay = dayKey;

    try {
      await runWinbackCampaign(prisma);
    } catch (err) {
      console.error('[winback] tick failed:', err);
    }
  }, 60_000);
}
