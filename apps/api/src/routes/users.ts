import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { verifyAdmin } from '../middleware/auth';
import { assertWithinUserLimit } from '../lib/plan-limits';

// Personel = User (platform kimliği: email/name/password) + Membership (bu tenant'ta
// rol + PIN + aktiflik). Rol/PIN artık Membership'te olduğundan tüm CRUD üyelik
// üzerinden döner. req.db.user platform-passthrough (global), req.db.membership
// tenant-scoped'tur.
export default async function userRoutes(server: FastifyInstance) {
  // Get all staff (bu tenant'ın üyelikleri)
  server.get('/', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const memberships = await request.db.membership.findMany({
      include: { user: { select: { id: true, email: true, name: true, avatar: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const users = memberships.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      avatar: m.user.avatar,
      active: m.active,
      locationId: m.locationId,
      createdAt: m.user.createdAt,
    }));
    return { users };
  });

  // Get single staff (bu tenant'taki üyeliği)
  server.get('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const membership = await request.db.membership.findFirst({
      where: { userId: id },
      include: { user: { select: { id: true, email: true, name: true, avatar: true, createdAt: true, updatedAt: true } } },
    });
    if (!membership) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }
    return {
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        role: membership.role,
        avatar: membership.user.avatar,
        active: membership.active,
        locationId: membership.locationId,
        createdAt: membership.user.createdAt,
        updatedAt: membership.user.updatedAt,
      },
    };
  });

  // Create staff — isim + rol + 6 haneli PIN. Yeni User + bu tenant'a Membership.
  server.post('/', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, role, pin, locationId } = request.body as {
      name: string;
      role?: UserRole;
      pin: string;
      locationId?: string;
    };

    if (!name || !pin) {
      return reply.status(400).send({ error: 'İsim ve 6 haneli şifre gerekli' });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return reply.status(400).send({ error: 'Şifre 4-6 haneli sayı olmalı' });
    }

    // Paket kullanıcı limiti (feature-flag) — aşımda 403
    if (await assertWithinUserLimit(request.tenant!.id, reply)) return;

    // PIN bu TENANT içinde benzersiz (Membership [tenantId, pin])
    const existingPin = await request.db.membership.findFirst({ where: { pin } });
    if (existingPin) {
      return reply.status(400).send({ error: 'Bu şifre zaten kullanılıyor, başka bir şifre seç' });
    }

    // email + password DB'de zorunlu — sentetik üret. Giriş yalnızca PIN'le.
    const syntheticEmail = `personel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@highfive.local`;
    const hashedPassword = await bcrypt.hash(pin, 10);

    const user = await request.db.user.create({
      data: { email: syntheticEmail, password: hashedPassword, name },
      select: { id: true, name: true },
    });
    const membership = await request.db.membership.create({
      data: {
        userId: user.id,
        role: role || UserRole.WAITER,
        pin,
        locationId: locationId ?? null,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        role: membership.role,
        active: membership.active,
        locationId: membership.locationId,
        createdAt: membership.createdAt,
      },
    };
  });

  // Update staff — isim (User) / rol · PIN · aktiflik · şube (Membership)
  server.put('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { name, role, pin, active, locationId } = request.body as {
      name?: string;
      role?: UserRole;
      pin?: string;
      active?: boolean;
      locationId?: string | null;
    };

    const membership = await request.db.membership.findFirst({ where: { userId: id } });
    if (!membership) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    // PIN değişiyorsa 4-6 haneli + tenant içinde benzersiz olmalı
    if (pin && pin !== membership.pin) {
      if (!/^\d{4,6}$/.test(pin)) {
        return reply.status(400).send({ error: 'Şifre 4-6 haneli sayı olmalı' });
      }
      const existingPin = await request.db.membership.findFirst({ where: { pin } });
      if (existingPin) {
        return reply.status(400).send({ error: 'Bu şifre zaten kullanılıyor' });
      }
    }

    // İsim User'da; şifre değişince User.password (yedek) da güncellenir
    if (name || pin) {
      await request.db.user.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(pin ? { password: await bcrypt.hash(pin, 10) } : {}),
        },
      });
    }

    const updated = await request.db.membership.update({
      where: { id: membership.id },
      data: {
        ...(role ? { role } : {}),
        ...(pin ? { pin } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(locationId !== undefined ? { locationId } : {}),
      },
      include: { user: { select: { name: true } } },
    });

    return {
      user: {
        id,
        name: updated.user.name,
        role: updated.role,
        active: updated.active,
        locationId: updated.locationId,
        updatedAt: updated.updatedAt,
      },
    };
  });

  // Delete staff (soft) — bu tenant'taki üyeliği pasifleştir (global User'a dokunma)
  server.delete('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const membership = await request.db.membership.findFirst({ where: { userId: id } });
    if (!membership) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }
    await request.db.membership.update({
      where: { id: membership.id },
      data: { active: false },
    });
    return { success: true };
  });

  // Get activity logs for a user (tenant-scoped)
  server.get('/:id/activity', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const logs = await request.db.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { logs };
  });
}
