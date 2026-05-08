// Push Notifications — POS yönetim ekranı için
// CRUD + schedule + send-now + history + stats
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '../middleware/auth';
import { sendCampaignPush, sendPushToTokens } from '../lib/push';

type TargetType = 'ALL' | 'VERIFIED' | 'CUSTOMER' | 'DEVICE' | 'SEGMENT';

type Recurrence =
  | { type: 'DAILY'; hour: number; minute?: number }
  | { type: 'WEEKLY'; dayOfWeek: number; hour: number; minute?: number } // 0=Pazar
  | { type: 'MONTHLY'; dayOfMonth: number; hour: number; minute?: number };

type SegmentCriteria = {
  // Müşteri belirli ürünleri sipariş etmiş olmalı
  menuItemIds?: string[];
  // Belirli kategorideki ürünleri sipariş etmiş olmalı
  categoryIds?: string[];
  // Son N gün içinde sipariş vermiş olmalı
  lastNDays?: number;
  // Belirli bir günde sipariş veriyor olmalı (0=Pazar, 6=Cumartesi)
  dayOfWeek?: number;
  // Min sipariş sayısı
  minOrderCount?: number;
  // Min toplam harcama
  minTotalSpent?: number;
  // Sadece doğrulanmış üyeler
  verifiedOnly?: boolean;
};

export default async function notificationRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // ==================== LIST ====================
  server.get('/notifications', { preHandler: verifyAdmin }, async (request: any) => {
    const { status, limit } = request.query as { status?: string; limit?: string };
    const where: any = {};
    if (status) where.status = status;
    const notifications = await prisma.pushNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit || '100', 10), 500),
      include: {
        campaign: { select: { id: true, name: true } },
      },
    });
    return { notifications };
  });

  // ==================== STATS ====================
  server.get('/notifications/stats', { preHandler: verifyAdmin }, async () => {
    // Tüm aktif cihazlar (push'lu + push'suz placeholder'lar dahil — POS aktif cihazlar listesi için)
    const totalDevices = await prisma.deviceToken.count({ where: { isActive: true } });
    // Push gönderilebilir cihazlar (nopush-* placeholder'lar hariç)
    const pushableDevices = await prisma.deviceToken.count({
      where: { isActive: true, NOT: { token: { startsWith: 'nopush-' } } },
    });
    const verifiedDevices = await prisma.deviceToken.count({
      where: {
        isActive: true,
        NOT: { token: { startsWith: 'nopush-' } },
        customer: { isVerified: true },
      },
    });
    const iosDevices = await prisma.deviceToken.count({
      where: { isActive: true, platform: 'ios' },
    });
    const androidDevices = await prisma.deviceToken.count({
      where: { isActive: true, platform: 'android' },
    });
    const totalSent = await prisma.pushNotification.count({ where: { status: 'SENT' } });
    const totalScheduled = await prisma.pushNotification.count({
      where: { status: 'SCHEDULED' },
    });
    const lastNotification = await prisma.pushNotification.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return {
      totalDevices,
      pushableDevices,
      verifiedDevices,
      iosDevices,
      androidDevices,
      totalSent,
      totalScheduled,
      lastNotification,
    };
  });

  // ==================== DEVICE LIST (Admin: 'Aktif Cihazlar' panel) ====================
  // Push gönderebilmek için aktif cihazları listele (customer info ile)
  server.get('/notifications/devices', { preHandler: verifyAdmin }, async (request: any) => {
    const { onlyPushable } = request.query as { onlyPushable?: string };
    const where: any = { isActive: true };
    if (onlyPushable === 'true' || onlyPushable === '1') {
      where.NOT = { token: { startsWith: 'nopush-' } };
    }
    const devices = await prisma.deviceToken.findMany({
      where,
      select: {
        id: true,
        token: true,
        platform: true,
        appVersion: true,
        locale: true,
        lastSeenAt: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isVerified: true,
            totalPoints: true,
          },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
      take: 200,
    });
    // Token ham gözükmesin, sadece push tipi göster
    return {
      devices: devices.map((d) => ({
        ...d,
        token: undefined,
        canPush: !d.token.startsWith('nopush-'),
      })),
    };
  });

  // ==================== GET DETAIL ====================
  server.get('/notifications/:id', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const { id } = request.params as { id: string };
    const notification = await prisma.pushNotification.findUnique({
      where: { id },
      include: { campaign: true },
    });
    if (!notification) return reply.status(404).send({ error: 'Bulunamadı' });
    return { notification };
  });

  // ==================== CREATE (Send NOW / SCHEDULE / RECURRING) ====================
  server.post('/notifications', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const body = (request.body ?? {}) as {
      title?: string;
      body?: string;
      imageUrl?: string;
      data?: Record<string, unknown>;
      campaignId?: string;
      targetType?: TargetType;
      targetIds?: string[];
      segmentCriteria?: SegmentCriteria;
      scheduledAt?: string;
      sendNow?: boolean;
      recurrence?: Recurrence;
    };

    if (!body.title || !body.body) {
      return reply.status(400).send({ error: 'title ve body gerekli' });
    }

    const sendNow = body.sendNow === true || (!body.scheduledAt && !body.recurrence);

    // Segment ise targetIds'i şimdi hesaplama (anlık send için)
    let targetType: TargetType = body.targetType ?? 'ALL';
    let targetIds: string[] = body.targetIds ?? [];
    if (sendNow && targetType === 'SEGMENT' && body.segmentCriteria) {
      targetIds = await findCustomersBySegment(prisma, body.segmentCriteria);
      targetType = 'CUSTOMER';
    }

    if (sendNow) {
      const result = await sendCampaignPush(prisma, {
        title: body.title,
        body: body.body,
        imageUrl: body.imageUrl,
        data: body.data,
        campaignId: body.campaignId,
        targetType: targetType as 'ALL' | 'VERIFIED' | 'CUSTOMER' | 'DEVICE',
        targetIds,
      });
      return result;
    }

    // RECURRING
    if (body.recurrence) {
      const notification = await prisma.pushNotification.create({
        data: {
          title: body.title,
          body: body.body,
          imageUrl: body.imageUrl,
          data: (body.data as any) ?? {},
          campaignId: body.campaignId,
          targetType: body.targetType ?? 'ALL',
          targetIds: body.targetIds ?? [],
          segmentCriteria: (body.segmentCriteria as any) ?? undefined,
          recurrence: body.recurrence as any,
          status: 'RECURRING',
        },
      });
      return { notification };
    }

    // SCHEDULE
    const scheduledAt = new Date(body.scheduledAt!);
    if (isNaN(scheduledAt.getTime())) {
      return reply.status(400).send({ error: 'Geçersiz scheduledAt' });
    }
    if (scheduledAt.getTime() < Date.now() + 30_000) {
      return reply.status(400).send({ error: 'Zamanlanan tarih en az 30 sn sonra olmalı' });
    }

    const notification = await prisma.pushNotification.create({
      data: {
        title: body.title,
        body: body.body,
        imageUrl: body.imageUrl,
        data: (body.data as any) ?? {},
        campaignId: body.campaignId,
        targetType: body.targetType ?? 'ALL',
        targetIds: body.targetIds ?? [],
        segmentCriteria: (body.segmentCriteria as any) ?? undefined,
        scheduledAt,
        status: 'SCHEDULED',
      },
    });
    return { notification };
  });

  // ==================== UPDATE (only SCHEDULED) ====================
  server.patch('/notifications/:id', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.pushNotification.findUnique({
      where: { id },
    });
    if (!existing) return reply.status(404).send({ error: 'Bulunamadı' });
    if (existing.status !== 'SCHEDULED' && existing.status !== 'DRAFT') {
      return reply.status(400).send({ error: 'Sadece zamanlanmış bildirim düzenlenebilir' });
    }

    const body = (request.body ?? {}) as Record<string, any>;
    const data: any = {};
    for (const k of ['title', 'body', 'imageUrl', 'targetType', 'targetIds', 'data']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.scheduledAt !== undefined) {
      const d = new Date(body.scheduledAt);
      if (isNaN(d.getTime())) return reply.status(400).send({ error: 'Geçersiz scheduledAt' });
      data.scheduledAt = d;
    }

    const updated = await prisma.pushNotification.update({
      where: { id },
      data,
    });
    return { notification: updated };
  });

  // ==================== CANCEL (scheduled) ====================
  server.post('/notifications/:id/cancel', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.pushNotification.findUnique({
      where: { id },
    });
    if (!existing) return reply.status(404).send({ error: 'Bulunamadı' });
    if (existing.status !== 'SCHEDULED' && existing.status !== 'RECURRING') {
      return reply.status(400).send({ error: 'Sadece zamanlanmış veya tekrarlayan bildirim iptal edilebilir' });
    }
    const updated = await prisma.pushNotification.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    return { notification: updated };
  });

  // ==================== CUSTOMER SEARCH (target=CUSTOMER için) ====================
  server.get('/notifications/customers/search', { preHandler: verifyAdmin }, async (request: any) => {
    const { q, limit } = request.query as { q?: string; limit?: string };
    const take = Math.min(parseInt(limit || '20', 10), 100);
    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        isVerified: true,
        totalPoints: true,
        orderCount: true,
        loyaltyTier: { select: { name: true, icon: true } },
      },
    });
    return { customers };
  });

  // ==================== SEGMENT PREVIEW ====================
  // Belirli kriterlerle eşleşen müşterileri sayar + örnek liste döner
  server.post('/notifications/segment/preview', { preHandler: verifyAdmin }, async (
    request: any,
  ) => {
    const criteria = (request.body ?? {}) as SegmentCriteria;
    const ids = await findCustomersBySegment(prisma, criteria);
    const sample = await prisma.customer.findMany({
      where: { id: { in: ids.slice(0, 5) } },
      select: { id: true, name: true, phone: true, email: true },
    });
    return { count: ids.length, sample };
  });

  // ==================== TEST: Send to a single token ====================
  server.post('/notifications/test', { preHandler: verifyAdmin }, async (
    request: any,
    reply: any,
  ) => {
    const { token, title, body } = (request.body ?? {}) as {
      token?: string;
      title?: string;
      body?: string;
    };
    if (!token || !title || !body) {
      return reply.status(400).send({ error: 'token, title, body gerekli' });
    }
    const result = await sendPushToTokens([token], { title, body });
    return result;
  });
}

// ==================== SEGMENT HELPER ====================
// Müşterileri segment kriterine göre bulur — Customer.id[] döner.
// Mobile bildirimleri için: aktif device token'ı olan müşteriler önce filtrelenir.
export async function findCustomersBySegment(
  prisma: PrismaClient,
  c: SegmentCriteria,
): Promise<string[]> {
  // Base where — verified ve device'ı olanlar
  const customerWhere: any = {};
  if (c.verifiedOnly !== false) {
    customerWhere.isVerified = true;
  }
  if (c.minOrderCount && c.minOrderCount > 0) {
    customerWhere.orderCount = { gte: c.minOrderCount };
  }
  if (c.minTotalSpent && c.minTotalSpent > 0) {
    customerWhere.totalSpent = { gte: c.minTotalSpent };
  }
  // Sadece aktif device'ı olanlar
  customerWhere.devices = { some: { isActive: true } };

  // Önce candidate customer'ları topla
  const candidates = await prisma.customer.findMany({
    where: customerWhere,
    select: { id: true },
  });
  let ids = candidates.map((x) => x.id);

  // Sipariş bazlı kriterler — CustomerOrder + Order üzerinden filtrele
  if (
    c.menuItemIds?.length ||
    c.categoryIds?.length ||
    c.lastNDays ||
    typeof c.dayOfWeek === 'number'
  ) {
    const sinceDate = c.lastNDays
      ? new Date(Date.now() - c.lastNDays * 86400_000)
      : undefined;

    // Order WHERE clause'ı oluştur
    const orderWhere: any = {};
    if (sinceDate) orderWhere.createdAt = { gte: sinceDate };

    // Bu kriterlere uyan order'ları bul
    const matchingOrders = await prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true,
        createdAt: true,
        customerPhone: true,
        items: {
          select: {
            menuItemId: true,
            menuItem: { select: { categoryId: true } },
          },
        },
      },
    });

    // Filter (in-memory, daha karmaşık joinler için)
    const filteredOrders = matchingOrders.filter((o) => {
      if (typeof c.dayOfWeek === 'number') {
        const day = new Date(o.createdAt).getDay();
        if (day !== c.dayOfWeek) return false;
      }
      if (c.menuItemIds?.length) {
        const hasMatch = o.items.some(
          (it) => it.menuItemId && c.menuItemIds!.includes(it.menuItemId),
        );
        if (!hasMatch) return false;
      }
      if (c.categoryIds?.length) {
        const hasMatch = o.items.some(
          (it) =>
            it.menuItem?.categoryId && c.categoryIds!.includes(it.menuItem.categoryId),
        );
        if (!hasMatch) return false;
      }
      return true;
    });

    // Bu sipariş sahiplerinin Customer.id'lerini topla
    const orderIds = filteredOrders.map((o) => o.id);
    const customerOrders = await prisma.customerOrder.findMany({
      where: { orderId: { in: orderIds } },
      select: { customerId: true },
    });
    const matchedCustomerIds = new Set(customerOrders.map((co) => co.customerId));

    ids = ids.filter((id) => matchedCustomerIds.has(id));
  }

  return ids;
}

// ==================== RECURRING TIMING ====================
function shouldFireRecurring(
  rec: Recurrence,
  lastSentAt: Date | null,
  now: Date,
): boolean {
  // Bu dakikadaki saat/dakika kombinasyonu
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (rec.type === 'DAILY') {
    if (hour !== rec.hour) return false;
    if ((rec.minute ?? 0) !== minute) return false;
  } else if (rec.type === 'WEEKLY') {
    if (now.getDay() !== rec.dayOfWeek) return false;
    if (hour !== rec.hour) return false;
    if ((rec.minute ?? 0) !== minute) return false;
  } else if (rec.type === 'MONTHLY') {
    if (now.getDate() !== rec.dayOfMonth) return false;
    if (hour !== rec.hour) return false;
    if ((rec.minute ?? 0) !== minute) return false;
  } else {
    return false;
  }

  // Son 5 dakika içinde gönderilmiş mi? (idempotency — recurring çift göndermesin)
  if (lastSentAt) {
    const ageMin = (now.getTime() - lastSentAt.getTime()) / 60_000;
    if (ageMin < 5) return false;
  }
  return true;
}

// ==================== SCHEDULED + RECURRING WORKER ====================
// main.ts'ten setInterval ile başlatılır (60sn'de bir önerilir)
export async function processScheduledNotifications(prisma: PrismaClient): Promise<void> {
  const now = new Date();

  // 1) Tek seferlik scheduled bildirimler
  const due = await prisma.pushNotification.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
    take: 50,
  });

  for (const n of due) {
    try {
      const claimed = await prisma.pushNotification.updateMany({
        where: { id: n.id, status: 'SCHEDULED' },
        data: { status: 'SENDING' },
      });
      if (claimed.count === 0) continue;

      await fireNotification(prisma, n);

      await prisma.pushNotification.update({
        where: { id: n.id },
        data: { status: 'SENT', sentAt: new Date(), lastSentAt: new Date() },
      });
    } catch (e: any) {
      console.error('[push-worker] scheduled error', e);
      await prisma.pushNotification.update({
        where: { id: n.id },
        data: { status: 'FAILED' },
      });
    }
  }

  // 2) Recurring bildirimler — pattern eşleşince gönder
  const recurring = await prisma.pushNotification.findMany({
    where: {
      status: 'RECURRING',
    },
    take: 100,
  });

  for (const n of recurring) {
    const rec = n.recurrence as Recurrence | null;
    if (!rec) continue;

    if (!shouldFireRecurring(rec, n.lastSentAt, now)) continue;

    try {
      await fireNotification(prisma, n);

      await prisma.pushNotification.update({
        where: { id: n.id },
        data: {
          lastSentAt: new Date(),
          sentAt: new Date(),
          // status RECURRING kalıyor — bir sonraki pattern eşleşmesinde tekrar
        },
      });
    } catch (e: any) {
      console.error('[push-worker] recurring error', e);
    }
  }
}

// Bildirim send (segment desteğiyle)
async function fireNotification(prisma: PrismaClient, n: any): Promise<void> {
  let targetType: TargetType = (n.targetType as TargetType) ?? 'ALL';
  let targetIds: string[] = n.targetIds ?? [];

  // Segment ise customer ID'leri çıkart
  if (targetType === 'SEGMENT' && n.segmentCriteria) {
    targetIds = await findCustomersBySegment(prisma, n.segmentCriteria as SegmentCriteria);
    targetType = 'CUSTOMER';
  }

  await sendCampaignPush(prisma, {
    title: n.title,
    body: n.body,
    imageUrl: n.imageUrl ?? undefined,
    data: (n.data as Record<string, unknown>) ?? {},
    campaignId: n.campaignId ?? undefined,
    targetType: targetType as 'ALL' | 'VERIFIED' | 'CUSTOMER' | 'DEVICE',
    targetIds,
  });
}
