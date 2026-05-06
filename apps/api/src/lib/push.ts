// Expo Push Notification helper
// FCM (Android) ve APNs (iOS) üstüne Expo'nun servisi.

import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const expo = new Expo({
  // EAS access token gerekirse: process.env.EXPO_ACCESS_TOKEN
});

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  sound?: 'default' | null;
  badge?: number;
};

export type SendResult = {
  total: number;
  sent: number;
  failed: number;
  invalidTokens: string[];
  tickets: ExpoPushTicket[];
};

export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<SendResult> {
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  const invalidTokens = tokens.filter((t) => !Expo.isExpoPushToken(t));

  if (validTokens.length === 0) {
    return { total: tokens.length, sent: 0, failed: tokens.length, invalidTokens, tickets: [] };
  }

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: payload.sound ?? 'default',
    badge: payload.badge,
    priority: 'high',
    ...(payload.imageUrl ? { richContent: { image: payload.imageUrl } } : {}),
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (e) {
      console.error('[push] chunk send error', e);
    }
  }

  let sent = 0;
  let failed = 0;
  for (const t of tickets) {
    if (t.status === 'ok') sent++;
    else failed++;
  }

  return { total: tokens.length, sent, failed: failed + invalidTokens.length, invalidTokens, tickets };
}

// Hedef segmentine göre push gönder + DB'ye kaydet
export async function sendCampaignPush(
  prisma: PrismaClient,
  args: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    imageUrl?: string;
    campaignId?: string;
    targetType?: 'ALL' | 'VERIFIED' | 'CUSTOMER' | 'DEVICE';
    targetIds?: string[];
  },
): Promise<{ notification: any; result: SendResult }> {
  const targetType = args.targetType ?? 'ALL';
  const targetIds = args.targetIds ?? [];

  // Token listesini topla
  let where: any = { isActive: true };
  if (targetType === 'VERIFIED') {
    where.customer = { isVerified: true };
  } else if (targetType === 'CUSTOMER') {
    where.customerId = { in: targetIds };
  } else if (targetType === 'DEVICE') {
    where.id = { in: targetIds };
  }

  const devices = await prisma.deviceToken.findMany({ where, select: { token: true, id: true } });
  const tokens = devices.map((d) => d.token);

  // Notification kaydı (status: SENDING)
  const notification = await prisma.pushNotification.create({
    data: {
      title: args.title,
      body: args.body,
      data: (args.data ?? {}) as any,
      imageUrl: args.imageUrl,
      campaignId: args.campaignId,
      targetType,
      targetIds,
      status: 'SENDING',
    },
  });

  // Gönder
  const result = await sendPushToTokens(tokens, {
    title: args.title,
    body: args.body,
    data: { ...(args.data ?? {}), notificationId: notification.id },
    imageUrl: args.imageUrl,
  });

  // Sonucu güncelle
  await prisma.pushNotification.update({
    where: { id: notification.id },
    data: {
      sentCount: result.sent,
      failedCount: result.failed,
      status: result.failed === 0 ? 'SENT' : result.sent > 0 ? 'SENT' : 'FAILED',
      sentAt: new Date(),
    },
  });

  // Geçersiz token'ları pasifle
  if (result.invalidTokens.length > 0) {
    await prisma.deviceToken.updateMany({
      where: { token: { in: result.invalidTokens } },
      data: { isActive: false },
    });
  }

  return { notification, result };
}
