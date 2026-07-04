// /api/courier — kurye mobile app + admin courier dashboard için endpoints
//
// Kurye akışı:
//   1. Login (POST /api/auth/courier-login) → token
//   2. GET /assigned → atanmış aktif siparişler
//   3. POST /location (her 5sn/30sn) → konum güncelle + WS yayın
//   4. POST /online ↔ /offline → durum
//   5. POST /orders/:id/accept → "Aldım" — pickedUpAt + OUT_FOR_DELIVERY
//   6. POST /orders/:id/delivery-photo → multipart foto
//   7. PATCH /:id/courier/deliver (orders.ts) → DELIVERED
//
// Admin akışı:
//   - GET /active → aktif (çevrimiçi) kuryeler
//   - GET /:courierId/location → son konum

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { verifyAuth, verifyAdmin, verifyCourier } from '../middleware/auth';
import {
  broadcastCourierLocation,
  broadcastCourierStatus,
  broadcastOrderUpdate,
} from '../websocket';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export default async function courierRoutes(server: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // GET /assigned — aktif atanmış siparişler
  // ---------------------------------------------------------------------------
  server.get('/assigned', { preHandler: verifyCourier }, async (request: FastifyRequest) => {
    const user = (request as any).user;

    const orders = await request.db.order.findMany({
      where: {
        courierId: user.userId,
        status: { in: ['READY', 'OUT_FOR_DELIVERY'] },
        type: 'DELIVERY', // kurye sadece teslimat (paket) siparişlerini görür — gel-al/masa hariç
      },
      include: {
        items: { include: { menuItem: true } },
        location: { select: { id: true, name: true, address: true, phone: true } },
        courier: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { assignedAt: 'asc' },
    });

    return { orders };
  });

  // ---------------------------------------------------------------------------
  // GET /history — tamamlanmış teslimat geçmişi
  // ---------------------------------------------------------------------------
  server.get('/history', { preHandler: verifyCourier }, async (request: FastifyRequest) => {
    const user = (request as any).user;
    const { limit = '50', offset = '0' } = request.query as any;
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    const orders = await request.db.order.findMany({
      where: {
        courierId: user.userId,
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
      include: {
        items: { include: { menuItem: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { deliveredAt: 'desc' },
      take: lim,
      skip: off,
    });

    return { orders };
  });

  // ---------------------------------------------------------------------------
  // GET /stats/today — bugün için kurye istatistikleri
  // ---------------------------------------------------------------------------
  server.get('/stats/today', { preHandler: verifyCourier }, async (request: FastifyRequest) => {
    const user = (request as any).user;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [deliveredCount, totalEarnings, activeCount] = await Promise.all([
      request.db.order.count({
        where: {
          courierId: user.userId,
          status: { in: ['DELIVERED', 'COMPLETED'] },
          deliveredAt: { gte: todayStart },
        },
      }),
      request.db.order.aggregate({
        where: {
          courierId: user.userId,
          status: { in: ['DELIVERED', 'COMPLETED'] },
          deliveredAt: { gte: todayStart },
        },
        _sum: { deliveryFee: true },
      }),
      request.db.order.count({
        where: {
          courierId: user.userId,
          status: { in: ['READY', 'OUT_FOR_DELIVERY'] },
        },
      }),
    ]);

    return {
      todayDeliveries: deliveredCount,
      todayEarnings: totalEarnings._sum.deliveryFee ?? 0,
      activeOrders: activeCount,
    };
  });

  // ---------------------------------------------------------------------------
  // POST /location — tek konum noktası
  // ---------------------------------------------------------------------------
  server.post('/location', { preHandler: verifyCourier }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = request.body as {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      altitude?: number;
      batteryLevel?: number;
      isMoving?: boolean;
      source?: 'FOREGROUND' | 'BACKGROUND';
      recordedAt?: string;
    };

    if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      return reply.status(400).send({ error: 'latitude ve longitude gerekli' });
    }

    const created = await request.db.courierLocation.create({
      data: {
        courierId: user.userId,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy ?? null,
        heading: body.heading ?? null,
        speed: body.speed ?? null,
        altitude: body.altitude ?? null,
        batteryLevel: body.batteryLevel ?? null,
        isMoving: body.isMoving ?? true,
        source: body.source ?? 'FOREGROUND',
        ...(body.recordedAt ? { createdAt: new Date(body.recordedAt) } : {}),
      },
    });

    // User lastSeen alanlarını güncelle
    await request.db.user.update({
      where: { id: user.userId },
      data: {
        lastSeenLat: body.latitude,
        lastSeenLng: body.longitude,
        lastSeenAt: new Date(),
        isOnline: true, // konum gönderince online sayılır
      },
    });

    // Bu kuryeye atanmış aktif teslimat müşteri ID'lerini bul (WS filter için)
    const activeOrders = await request.db.order.findMany({
      where: {
        courierId: user.userId,
        status: { in: ['READY', 'OUT_FOR_DELIVERY'] },
      },
      select: {
        id: true,
        customerEmail: true,
        customerPhone: true,
      },
    });

    // customerId'leri Customer tablosundan çöz (email/phone match)
    const customerIds: string[] = [];
    if (activeOrders.length > 0) {
      const emails = activeOrders.map((o) => o.customerEmail).filter(Boolean) as string[];
      const phones = activeOrders.map((o) => o.customerPhone).filter(Boolean) as string[];
      if (emails.length || phones.length) {
        const customers = await request.db.customer.findMany({
          where: {
            OR: [
              ...(emails.length ? [{ email: { in: emails } }] : []),
              ...(phones.length ? [{ phone: { in: phones } }] : []),
            ],
          },
          select: { id: true },
        });
        customers.forEach((c) => customerIds.push(c.id));
      }
    }

    broadcastCourierLocation(
      user.userId,
      {
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy,
        heading: body.heading,
        speed: body.speed,
        batteryLevel: body.batteryLevel,
        recordedAt: created.createdAt.toISOString(),
        orderIds: activeOrders.map((o) => o.id),
      },
      customerIds,
    );

    return { ok: true, id: created.id };
  });

  // ---------------------------------------------------------------------------
  // POST /location/batch — offline queue flush
  // ---------------------------------------------------------------------------
  server.post('/location/batch', { preHandler: verifyCourier }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = request.body as {
      points: Array<{
        latitude: number;
        longitude: number;
        accuracy?: number;
        heading?: number;
        speed?: number;
        altitude?: number;
        batteryLevel?: number;
        isMoving?: boolean;
        source?: 'FOREGROUND' | 'BACKGROUND';
        recordedAt?: string;
      }>;
    };

    if (!Array.isArray(body?.points) || body.points.length === 0) {
      return reply.status(400).send({ error: 'points array gerekli' });
    }
    if (body.points.length > 500) {
      return reply.status(400).send({ error: 'Batch max 500 nokta olabilir' });
    }

    const created = await request.db.courierLocation.createMany({
      data: body.points
        .filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number')
        .map((p) => ({
          courierId: user.userId,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy ?? null,
          heading: p.heading ?? null,
          speed: p.speed ?? null,
          altitude: p.altitude ?? null,
          batteryLevel: p.batteryLevel ?? null,
          isMoving: p.isMoving ?? true,
          source: p.source ?? 'BACKGROUND',
          ...(p.recordedAt ? { createdAt: new Date(p.recordedAt) } : {}),
        })),
    });

    // Son nokta ile lastSeen güncelle
    const last = body.points[body.points.length - 1];
    if (last && typeof last.latitude === 'number' && typeof last.longitude === 'number') {
      await request.db.user.update({
        where: { id: user.userId },
        data: {
          lastSeenLat: last.latitude,
          lastSeenLng: last.longitude,
          lastSeenAt: last.recordedAt ? new Date(last.recordedAt) : new Date(),
          isOnline: true,
        },
      });
    }

    return { ok: true, count: created.count };
  });

  // ---------------------------------------------------------------------------
  // POST /online ↔ /offline — kurye çevrimiçi durumu
  // ---------------------------------------------------------------------------
  server.post('/online', { preHandler: verifyCourier }, async (request: FastifyRequest) => {
    const user = (request as any).user;
    await request.db.user.update({
      where: { id: user.userId },
      data: { isOnline: true, lastSeenAt: new Date() },
    });
    broadcastCourierStatus(user.userId, true);
    return { ok: true, isOnline: true };
  });

  server.post('/offline', { preHandler: verifyCourier }, async (request: FastifyRequest) => {
    const user = (request as any).user;
    await request.db.user.update({
      where: { id: user.userId },
      data: { isOnline: false, lastSeenAt: new Date() },
    });
    broadcastCourierStatus(user.userId, false);
    return { ok: true, isOnline: false };
  });

  // ---------------------------------------------------------------------------
  // GET /active — admin: çevrimiçi kuryeler
  // ---------------------------------------------------------------------------
  server.get('/active', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    // Kurye rolü Membership'te; online/konum User'da → COURIER üyeliklerini alıp
    // aktif + çevrimiçi kullanıcıları süz.
    const courierMemberships = await request.db.membership.findMany({
      where: { role: 'COURIER', active: true },
      include: {
        user: {
          select: {
            id: true, name: true, phone: true, avatar: true, active: true,
            isOnline: true, lastSeenLat: true, lastSeenLng: true, lastSeenAt: true,
          },
        },
      },
    });
    const couriers = courierMemberships
      .map((m) => m.user)
      .filter((u) => u.active && u.isOnline)
      .map(({ active, isOnline, ...rest }) => rest);

    // Aktif sipariş sayıları
    const withStats = await Promise.all(
      couriers.map(async (c) => {
        const activeOrders = await request.db.order.count({
          where: {
            courierId: c.id,
            status: { in: ['READY', 'OUT_FOR_DELIVERY'] },
          },
        });
        return { ...c, activeOrders };
      }),
    );

    return { couriers: withStats };
  });

  // ---------------------------------------------------------------------------
  // GET /:courierId/location — admin veya ilgili customer
  // ---------------------------------------------------------------------------
  server.get('/:courierId/location', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { courierId } = request.params as { courierId: string };
    const user = (request as any).user;

    // Customer ise kendi siparişinin kuryesi mi kontrolü
    if (user.customerId && !user.userId) {
      const customer = await request.db.customer.findUnique({
        where: { id: user.customerId },
        select: { email: true, phone: true },
      });
      if (!customer) return reply.status(403).send({ error: 'Yetkisiz' });

      const hasActive = await request.db.order.findFirst({
        where: {
          courierId,
          status: { in: ['READY', 'OUT_FOR_DELIVERY'] },
          OR: [
            customer.email ? { customerEmail: customer.email } : { id: '__none__' },
            customer.phone ? { customerPhone: customer.phone } : { id: '__none__' },
          ],
        },
        select: { id: true },
      });
      if (!hasActive) return reply.status(403).send({ error: 'Bu kuryeyi takip etme yetkin yok' });
    }
    // Staff her zaman görebilir

    const courier = await request.db.user.findUnique({
      where: { id: courierId },
      select: {
        id: true,
        name: true,
        phone: true,
        avatar: true,
        lastSeenLat: true,
        lastSeenLng: true,
        lastSeenAt: true,
        isOnline: true,
      },
    });

    if (!courier) return reply.status(404).send({ error: 'Kurye bulunamadı' });

    return { courier };
  });

  // ---------------------------------------------------------------------------
  // POST /orders/:id/accept — kurye "Aldım" → pickup
  // ---------------------------------------------------------------------------
  server.post('/orders/:id/accept', { preHandler: verifyCourier }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const order = await request.db.order.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    if (order.courierId !== user.userId) {
      return reply.status(403).send({ error: 'Bu sipariş sana atanmamış' });
    }
    if (order.status !== 'READY') {
      return reply.status(400).send({ error: 'Sipariş henüz hazır değil' });
    }

    const updated = await request.db.order.update({
      where: { id },
      data: {
        courierAcceptedAt: new Date(),
        pickedUpAt: new Date(),
        status: order.type === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'SERVED',
      },
      include: {
        courier: { select: { id: true, name: true, phone: true } },
        items: { include: { menuItem: true } },
      },
    });

    broadcastOrderUpdate(updated);
    return { order: updated, message: 'Sipariş alındı' };
  });

  // ---------------------------------------------------------------------------
  // POST /orders/:id/reject — kurye reddederse → courierId temizlenir
  // ---------------------------------------------------------------------------
  server.post('/orders/:id/reject', { preHandler: verifyCourier }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body || {}) as { reason?: string };
    const user = (request as any).user;

    const order = await request.db.order.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    if (order.courierId !== user.userId) {
      return reply.status(403).send({ error: 'Bu sipariş sana atanmamış' });
    }
    if (order.status !== 'READY') {
      return reply.status(400).send({ error: 'Bu durumda reddedilemez' });
    }

    const updated = await request.db.order.update({
      where: { id },
      data: {
        courierId: null,
        assignedAt: null,
        notes: reason
          ? `${order.notes ? order.notes + '\n' : ''}[Kurye reddi]: ${reason}`
          : order.notes,
      },
      include: {
        courier: { select: { id: true, name: true, phone: true } },
        items: { include: { menuItem: true } },
      },
    });

    broadcastOrderUpdate(updated);
    return { order: updated, message: 'Sipariş reddedildi' };
  });

  // ---------------------------------------------------------------------------
  // POST /orders/:id/delivery-photo — multipart foto upload
  // Foto teslimat anı kanıtı (kapı önü, vs.)
  // ---------------------------------------------------------------------------
  server.post('/orders/:id/delivery-photo', { preHandler: verifyCourier }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const order = await request.db.order.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    if (order.courierId !== user.userId) {
      return reply.status(403).send({ error: 'Bu sipariş sana atanmamış' });
    }

    // @fastify/multipart kayıtlı olmalı (mevcut /api/upload da kullanıyor)
    const data = await (request as any).file?.();
    if (!data) return reply.status(400).send({ error: 'Foto dosyası gerekli (multipart)' });

    // Dosyayı kaydet
    const ext = path.extname(data.filename || '.jpg') || '.jpg';
    const filename = `delivery_${id}_${Date.now()}${ext}`;
    const fullPath = path.join(UPLOAD_DIR, filename);
    try {
      // UPLOAD_DIR'ı varsa kullan, yoksa oluştur
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const writeStream = fs.createWriteStream(fullPath);
      await new Promise<void>((resolve, reject) => {
        data.file.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Foto kaydedilemedi', detail: err?.message });
    }

    const photoUrl = `/uploads/${filename}`;
    const updated = await request.db.order.update({
      where: { id },
      data: { deliveryPhotoUrl: photoUrl },
      select: { id: true, deliveryPhotoUrl: true },
    });

    return { ok: true, deliveryPhotoUrl: updated.deliveryPhotoUrl };
  });

  // ---------------------------------------------------------------------------
  // POST /orders/:id/deliver — teslim et (delivery-photo + deliveryNotes opsiyonel)
  // Alternatif: /api/orders/:id/courier/deliver (mevcut) ile aynı işi yapar
  // ---------------------------------------------------------------------------
  server.post('/orders/:id/deliver', { preHandler: verifyCourier }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const user = (request as any).user;
    const { deliveryPhotoUrl, deliveryNotes } = (request.body || {}) as {
      deliveryPhotoUrl?: string;
      deliveryNotes?: string;
    };

    const order = await request.db.order.findUnique({ where: { id } });
    if (!order) return reply.status(404).send({ error: 'Sipariş bulunamadı' });
    if (order.courierId !== user.userId) {
      return reply.status(403).send({ error: 'Bu sipariş sana atanmamış' });
    }
    if (!order.pickedUpAt) {
      return reply.status(400).send({ error: 'Sipariş henüz alınmadı' });
    }

    const updated = await request.db.order.update({
      where: { id },
      data: {
        deliveredAt: new Date(),
        completedAt: new Date(),
        status: order.type === 'DELIVERY' ? 'DELIVERED' : 'COMPLETED',
        ...(deliveryPhotoUrl ? { deliveryPhotoUrl } : {}),
        ...(deliveryNotes ? { deliveryNotes } : {}),
      },
      include: {
        courier: { select: { id: true, name: true, phone: true } },
        items: { include: { menuItem: true } },
      },
    });

    broadcastOrderUpdate(updated);
    return { order: updated, message: 'Sipariş teslim edildi' };
  });
}
