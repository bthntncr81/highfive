import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days in seconds

export default async function authRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Login with email and password
  server.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      if (!email || !password) {
        return reply.status(400).send({ error: 'Email ve şifre gerekli' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.active) {
        return reply.status(401).send({ error: 'Geçersiz email veya şifre' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return reply.status(401).send({ error: 'Geçersiz email veya şifre' });
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      // Create session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: { method: 'email' },
          ipAddress: request.ip,
        },
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
      };
    },
  );

  // Login with PIN (quick login for POS)
  server.post(
    '/pin-login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { pin } = request.body as { pin: string };

      if (!pin || pin.length !== 4) {
        return reply.status(400).send({ error: 'Geçerli bir PIN giriniz' });
      }

      const user = await prisma.user.findFirst({
        where: { pin, active: true },
      });

      if (!user) {
        return reply.status(401).send({ error: 'Geçersiz PIN' });
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: 60 * 60 * 12 }, // 12 hours in seconds
      );

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: { method: 'pin' },
          ipAddress: request.ip,
        },
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
      };
    },
  );

  // Logout
  server.post(
    '/logout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Token gerekli' });
      }

      const token = authHeader.replace('Bearer ', '');

      await prisma.session.deleteMany({
        where: { token },
      });

      return { success: true };
    },
  );

  // Get current user
  server.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({ error: 'Token gerekli' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          active: true,
        },
      });

      if (!user || !user.active) {
        return reply.status(401).send({ error: 'Kullanıcı bulunamadı' });
      }

      return { user };
    } catch (err) {
      return reply.status(401).send({ error: 'Geçersiz token' });
    }
  });

  // Change password
  server.post(
    '/change-password',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ error: 'Token gerekli' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      if (!currentPassword || !newPassword) {
        return reply
          .status(400)
          .send({ error: 'Mevcut ve yeni şifre gerekli' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          return reply.status(401).send({ error: 'Kullanıcı bulunamadı' });
        }

        const validPassword = await bcrypt.compare(
          currentPassword,
          user.password,
        );
        if (!validPassword) {
          return reply.status(401).send({ error: 'Mevcut şifre yanlış' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });

        await prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'PASSWORD_CHANGE',
            ipAddress: request.ip,
          },
        });

        return { success: true };
      } catch (err) {
        return reply.status(401).send({ error: 'Geçersiz token' });
      }
    },
  );
}
