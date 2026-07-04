import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { verifyAdmin } from '../middleware/auth';

export default async function userRoutes(server: FastifyInstance) {
  // Get all users (admin only)
  server.get('/', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const users = await request.db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { users };
  });

  // Get single user
  server.get('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    
    const user = await request.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    return { user };
  });

  // Create user (admin only) — isim + rol + 6 haneli şifre. E-posta/kullanıcı adı yok.
  server.post('/', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, role, pin } = request.body as {
      name: string;
      role?: UserRole;
      pin: string;
    };

    if (!name || !pin) {
      return reply.status(400).send({ error: 'İsim ve 6 haneli şifre gerekli' });
    }
    if (!/^\d{6}$/.test(pin)) {
      return reply.status(400).send({ error: 'Şifre 6 haneli sayı olmalı' });
    }

    const existingPin = await request.db.user.findFirst({ where: { pin } });
    if (existingPin) {
      return reply.status(400).send({ error: 'Bu şifre zaten kullanılıyor, başka bir şifre seç' });
    }

    // email + password DB'de zorunlu — sentetik üret. Giriş yalnızca 6 haneli şifreyle.
    const syntheticEmail = `personel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@highfive.local`;
    const hashedPassword = await bcrypt.hash(pin, 10);

    const user = await request.db.user.create({
      data: {
        email: syntheticEmail,
        password: hashedPassword,
        name,
        role: role || UserRole.WAITER,
        pin,
      },
      select: {
        id: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return { user };
  });

  // Update user (admin only) — isim / rol / 6 haneli şifre / aktiflik
  server.put('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { name, role, pin, active } = request.body as {
      name?: string;
      role?: UserRole;
      pin?: string;
      active?: boolean;
    };

    const user = await request.db.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    // Şifre değişiyorsa 6 haneli + benzersiz olmalı
    if (pin && pin !== user.pin) {
      if (!/^\d{6}$/.test(pin)) {
        return reply.status(400).send({ error: 'Şifre 6 haneli sayı olmalı' });
      }
      const existingPin = await request.db.user.findFirst({ where: { pin } });
      if (existingPin) {
        return reply.status(400).send({ error: 'Bu şifre zaten kullanılıyor' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (active !== undefined) updateData.active = active;
    // Şifre değişince hem pin hem (yedek) password güncellenir
    if (pin) {
      updateData.pin = pin;
      updateData.password = await bcrypt.hash(pin, 10);
    }

    const updatedUser = await request.db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    return { user: updatedUser };
  });

  // Delete user (admin only)
  server.delete('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const user = await request.db.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    // Soft delete - just deactivate
    await request.db.user.update({
      where: { id },
      data: { active: false },
    });

    return { success: true };
  });

  // Get activity logs for a user
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

