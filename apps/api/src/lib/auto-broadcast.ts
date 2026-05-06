// Otomatik kampanya / happy hour push duyurusu
// POS'ta admin yeni bir kampanya/happy hour oluştururken `notifyCustomers: true`
// göndererek tetiklenir.

import type { PrismaClient } from '@prisma/client';
import { sendCampaignPush } from './push';

export async function broadcastCampaignToMobile(
  prisma: PrismaClient,
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

export async function broadcastHappyHourToMobile(
  prisma: PrismaClient,
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
