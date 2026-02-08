import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, TableStatus } from '@prisma/client';
import { verifyAuth } from '../middleware/auth';
import { broadcastTableUpdate } from '../websocket';
import crypto from 'crypto';

// Generate a random session token
const generateSessionToken = () => crypto.randomBytes(16).toString('hex');

export default async function tableRoutes(server: FastifyInstance) {
  const prisma = (server as any).prisma as PrismaClient;

  // Get all tables
  server.get('/', { preHandler: verifyAuth }, async () => {
    const tables = await prisma.table.findMany({
      where: { active: true },
      include: {
        orders: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
        },
        mergedTables: true, // Birleştirilmiş masaları da getir
      },
      orderBy: { number: 'asc' },
    });
    return { tables };
  });

  // Get all tables (public - for QR code generator)
  server.get('/public', async () => {
    const tables = await prisma.table.findMany({
      where: { active: true },
      select: {
        id: true,
        number: true,
        name: true,
        status: true,
      },
      orderBy: { number: 'asc' },
    });
    return { tables };
  });

  // Get table info and start session (public - for QR code scans)
  server.get('/:id/public', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const table = await prisma.table.findUnique({
      where: { id, active: true },
    });

    if (!table) {
      return reply.status(404).send({ error: 'Masa bulunamadı' });
    }

    // Generate or refresh session token if table is FREE or doesn't have one
    let sessionToken = table.sessionToken;
    if (!sessionToken || table.status === 'FREE') {
      sessionToken = generateSessionToken();
      await prisma.table.update({
        where: { id },
        data: { 
          sessionToken,
          sessionStartedAt: new Date(),
          status: 'OCCUPIED', // Mark as occupied when session starts
        },
      });
    }

    return { 
      table: {
        id: table.id,
        number: table.number,
        name: table.name || `Masa ${table.number}`,
        status: table.status,
        sessionToken, // Send session token to client
      }
    };
  });

  // Get single table with current order (requires auth)
  server.get('/:id', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!table) {
      return reply.status(404).send({ error: 'Masa bulunamadı' });
    }

    return { table };
  });

  // Create table
  server.post('/', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { number, name, capacity, positionX, positionY, floor } = request.body as {
      number: number;
      name?: string;
      capacity?: number;
      positionX?: number;
      positionY?: number;
      floor?: number;
    };

    if (!number) {
      return reply.status(400).send({ error: 'Masa numarası gerekli' });
    }

    const existing = await prisma.table.findFirst({ where: { number } });
    if (existing) {
      return reply.status(400).send({ error: 'Bu masa numarası zaten kullanılıyor' });
    }

    const table = await prisma.table.create({
      data: {
        number,
        name: name || `Masa ${number}`,
        capacity: capacity || 4,
        positionX,
        positionY,
        floor: floor || 1,
      },
    });

    broadcastTableUpdate(table);
    return { table };
  });

  // Update table
  server.put('/:id', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { number, name, capacity, status, positionX, positionY, floor, active } = request.body as {
      number?: number;
      name?: string;
      capacity?: number;
      status?: TableStatus;
      positionX?: number;
      positionY?: number;
      floor?: number;
      active?: boolean;
    };

    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) {
      return reply.status(404).send({ error: 'Masa bulunamadı' });
    }

    // Check number uniqueness
    if (number && number !== table.number) {
      const existing = await prisma.table.findFirst({ where: { number } });
      if (existing) {
        return reply.status(400).send({ error: 'Bu masa numarası zaten kullanılıyor' });
      }
    }

    const updatedTable = await prisma.table.update({
      where: { id },
      data: {
        number,
        name,
        capacity,
        status,
        positionX,
        positionY,
        floor,
        active,
      },
    });

    broadcastTableUpdate(updatedTable);
    return { table: updatedTable };
  });

  // Update table status
  server.patch('/:id/status', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: TableStatus };

    if (!status) {
      return reply.status(400).send({ error: 'Durum gerekli' });
    }

    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) {
      return reply.status(404).send({ error: 'Masa bulunamadı' });
    }

    // If setting to FREE, clear the session token (invalidate old sessions)
    const updateData: any = { status };
    if (status === 'FREE') {
      updateData.sessionToken = null;
      updateData.sessionStartedAt = null;
    }

    const updatedTable = await prisma.table.update({
      where: { id },
      data: updateData,
    });

    broadcastTableUpdate(updatedTable);
    return { table: updatedTable };
  });

  // Delete table (soft delete)
  server.delete('/:id', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) {
      return reply.status(404).send({ error: 'Masa bulunamadı' });
    }

    // Check for active orders
    const activeOrders = await prisma.order.count({
      where: {
        tableId: id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    if (activeOrders > 0) {
      return reply.status(400).send({ error: 'Bu masada aktif sipariş var' });
    }

    await prisma.table.update({
      where: { id },
      data: { active: false },
    });

    return { success: true };
  });

  // Get floor layout
  server.get('/floor/:floor', { preHandler: verifyAuth }, async (request: FastifyRequest) => {
    const { floor } = request.params as { floor: string };

    const tables = await prisma.table.findMany({
      where: {
        floor: parseInt(floor, 10),
        active: true,
      },
      include: {
        orders: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    return { tables };
  });

  // Merge tables
  server.post('/:id/merge', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { tableIds } = request.body as { tableIds: string[] };

    if (!tableIds || tableIds.length === 0) {
      return reply.status(400).send({ error: 'Birleştirilecek masa seçilmedi' });
    }

    // Ana masa
    const mainTable = await prisma.table.findUnique({ 
      where: { id },
      include: { mergedTables: true }
    });

    if (!mainTable) {
      return reply.status(404).send({ error: 'Ana masa bulunamadı' });
    }

    // Birleştirilecek masaları kontrol et
    const tablesToMerge = await prisma.table.findMany({
      where: { 
        id: { in: tableIds },
        mergedWithId: null, // Zaten birleştirilmemiş olmalı
      },
    });

    if (tablesToMerge.length !== tableIds.length) {
      return reply.status(400).send({ error: 'Bazı masalar zaten birleştirilmiş' });
    }

    // Masaları birleştir
    await prisma.table.updateMany({
      where: { id: { in: tableIds } },
      data: { 
        mergedWithId: id,
        status: mainTable.status, // Ana masanın durumunu al
      },
    });

    // Toplam kapasiteyi güncelle
    const totalCapacity = mainTable.capacity + tablesToMerge.reduce((sum, t) => sum + t.capacity, 0);
    const updatedMainTable = await prisma.table.update({
      where: { id },
      data: { capacity: totalCapacity },
      include: { 
        mergedTables: true,
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        },
      },
    });

    broadcastTableUpdate(updatedMainTable);
    return { table: updatedMainTable, message: `${tableIds.length} masa birleştirildi` };
  });

  // Unmerge tables
  server.post('/:id/unmerge', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const mainTable = await prisma.table.findUnique({ 
      where: { id },
      include: { mergedTables: true }
    });

    if (!mainTable) {
      return reply.status(404).send({ error: 'Masa bulunamadı' });
    }

    if (mainTable.mergedTables.length === 0) {
      return reply.status(400).send({ error: 'Bu masada birleştirilmiş masa yok' });
    }

    // Orijinal kapasiteyi hesapla
    const originalCapacity = mainTable.capacity - mainTable.mergedTables.reduce((sum, t) => sum + t.capacity, 0);

    // Birleştirilmiş masaları ayır
    await prisma.table.updateMany({
      where: { mergedWithId: id },
      data: { 
        mergedWithId: null,
        status: 'FREE',
      },
    });

    // Ana masanın kapasitesini geri al
    const updatedMainTable = await prisma.table.update({
      where: { id },
      data: { capacity: Math.max(originalCapacity, 2) }, // Minimum 2 kapasite
      include: { mergedTables: true },
    });

    broadcastTableUpdate(updatedMainTable);
    return { table: updatedMainTable, message: 'Masalar ayrıldı' };
  });

  // Get merged tables info
  server.get('/:id/merged', { preHandler: verifyAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const table = await prisma.table.findUnique({
      where: { id },
      include: { 
        mergedTables: true,
        mergedWith: true,
      },
    });

    if (!table) {
      return reply.status(404).send({ error: 'Masa bulunamadı' });
    }

    return { 
      table,
      isMerged: !!table.mergedWithId,
      hasMergedTables: table.mergedTables.length > 0,
    };
  });
}

