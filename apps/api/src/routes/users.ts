import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { verifyAdmin } from '../middleware/auth';

export default async function userRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Get all users (admin only)
  server.get('/', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const users = await prisma.user.findMany({
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
    
    const user = await prisma.user.findUnique({
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

  // Create user (admin only)
  server.post('/', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password, name, role, pin } = request.body as {
      email: string;
      password: string;
      name: string;
      role: UserRole;
      pin?: string;
    };

    if (!email || !password || !name) {
      return reply.status(400).send({ error: 'Email, şifre ve isim gerekli' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(400).send({ error: 'Bu email zaten kullanılıyor' });
    }

    if (pin) {
      const existingPin = await prisma.user.findFirst({ where: { pin } });
      if (existingPin) {
        return reply.status(400).send({ error: 'Bu PIN zaten kullanılıyor' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || UserRole.WAITER,
        pin,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return { user };
  });

  // Update user (admin only)
  server.put('/:id', { preHandler: verifyAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { email, name, role, pin, active, password } = request.body as {
      email?: string;
      name?: string;
      role?: UserRole;
      pin?: string;
      active?: boolean;
      password?: string;
    };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    // Check email uniqueness
    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(400).send({ error: 'Bu email zaten kullanılıyor' });
      }
    }

    // Check PIN uniqueness
    if (pin && pin !== user.pin) {
      const existingPin = await prisma.user.findFirst({ where: { pin } });
      if (existingPin) {
        return reply.status(400).send({ error: 'Bu PIN zaten kullanılıyor' });
      }
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (pin !== undefined) updateData.pin = pin;
    if (active !== undefined) updateData.active = active;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
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

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.status(404).send({ error: 'Kullanıcı bulunamadı' });
    }

    // Soft delete - just deactivate
    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return { success: true };
  });

  // Get activity logs for a user
  server.get('/:id/activity', { preHandler: verifyAdmin }, async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const logs = await prisma.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { logs };
  });
}

