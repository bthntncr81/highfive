// ============================================================================
// Destek talepleri — tenant personeli POS'tan talep/şikayet/teknik sorun açar.
// Platform operatörü admin.otorder.com'dan yanıtlar (platform/admin.ts).
// ============================================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TicketType, TicketPriority, TicketStatus } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';

const TYPES = new Set(Object.values(TicketType));
const PRIORITIES = new Set(Object.values(TicketPriority));

export default async function supportRoutes(server: FastifyInstance) {
  // Tenant'ın talepleri (yanıtlarıyla) — tüm personel görür
  server.get('/tickets', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const tickets = await request.db.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });
    return { tickets };
  });

  // Yeni talep aç
  server.post('/tickets', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, subject, message, priority } = request.body as {
      type?: string;
      subject?: string;
      message?: string;
      priority?: string;
    };
    const s = (subject || '').trim();
    const m = (message || '').trim();
    if (!s || !m) return reply.status(400).send({ error: 'Konu ve mesaj zorunlu' });
    if (s.length > 200) return reply.status(400).send({ error: 'Konu en fazla 200 karakter' });

    const user = (request as any).user as { userId: string };
    // Açan personelin adı (talep listesinde gösterim için snapshot)
    const membership = await request.db.membership.findFirst({
      where: { userId: user.userId },
      include: { user: { select: { name: true, email: true } } },
    });

    const ticket = await request.db.supportTicket.create({
      data: {
        openedById: user.userId,
        openedByName: membership?.user?.name || membership?.user?.email || null,
        type: (TYPES.has(type as TicketType) ? type : 'REQUEST') as TicketType,
        priority: (PRIORITIES.has(priority as TicketPriority) ? priority : 'NORMAL') as TicketPriority,
        source: 'POS',
        subject: s,
        message: m,
      },
    });
    return reply.status(201).send({ ticket });
  });

  // Talebe ek mesaj yaz (tenant tarafı) — kapalı talebe yazılamaz
  server.post('/tickets/:id/reply', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { message } = request.body as { message?: string };
    const m = (message || '').trim();
    if (!m) return reply.status(400).send({ error: 'Mesaj zorunlu' });

    const ticket = await request.db.supportTicket.findFirst({ where: { id } });
    if (!ticket) return reply.status(404).send({ error: 'Talep bulunamadı' });
    if (ticket.status === TicketStatus.CLOSED) {
      return reply.status(400).send({ error: 'Kapalı talebe mesaj yazılamaz — yeni talep açın' });
    }

    const user = (request as any).user as { userId: string };
    const membership = await request.db.membership.findFirst({
      where: { userId: user.userId },
      include: { user: { select: { name: true, email: true } } },
    });

    const r = await request.db.supportTicketReply.create({
      data: {
        ticketId: id,
        fromAdmin: false,
        authorName: membership?.user?.name || membership?.user?.email || null,
        message: m,
      },
    });
    // Yanıt gelince yeniden açılmış say (çözüldü → açık)
    if (ticket.status === TicketStatus.RESOLVED) {
      await request.db.supportTicket.update({ where: { id }, data: { status: TicketStatus.OPEN } });
    }
    return reply.status(201).send({ reply: r });
  });
}
