import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { toNumber, formatTL, formatOrderNumber, getTableStatusText, getOrderStatusText } from '../lib/format';

export function registerTableTools(server: McpServer, prisma: PrismaClient): void {
  server.tool(
    'list_tables',
    'Masaları listele (durum, aktif sipariş sayısı dahil)',
    {
      floor: z.number().optional().describe('Kat filtresi'),
    },
    async ({ floor }) => {
      try {
        const where: Record<string, unknown> = { active: true };
        if (floor !== undefined) where.floor = floor;

        const tables = await prisma.table.findMany({
          where,
          include: {
            orders: {
              where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
              select: { id: true, orderNumber: true, status: true, total: true },
            },
          },
          orderBy: [{ floor: 'asc' }, { number: 'asc' }],
        });

        if (tables.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Masa bulunamadı.' }] };
        }

        // Group by floor
        const floors: Record<number, typeof tables> = {};
        for (const t of tables) {
          const f = t.floor;
          if (!floors[f]) floors[f] = [];
          floors[f].push(t);
        }

        const lines: string[] = [];
        for (const [f, floorTables] of Object.entries(floors)) {
          lines.push(`\n=== Kat ${f} ===`);
          for (const t of floorTables) {
            const name = t.name || `Masa ${t.number}`;
            const status = getTableStatusText(t.status);
            const orderCount = t.orders.length;
            const orderTotal = t.orders.reduce((sum, o) => sum + toNumber(o.total), 0);
            const orderInfo = orderCount > 0
              ? ` | ${orderCount} sipariş (${formatTL(orderTotal)})`
              : '';
            lines.push(`  [${status}] ${name} (${t.capacity} kişi)${orderInfo} | ID: ${t.id}`);
          }
        }

        const statusCounts = {
          FREE: tables.filter((t) => t.status === 'FREE').length,
          OCCUPIED: tables.filter((t) => t.status === 'OCCUPIED').length,
          RESERVED: tables.filter((t) => t.status === 'RESERVED').length,
          CLEANING: tables.filter((t) => t.status === 'CLEANING').length,
        };

        const summary = `Toplam: ${tables.length} | Boş: ${statusCounts.FREE} | Dolu: ${statusCounts.OCCUPIED} | Rezerve: ${statusCounts.RESERVED} | Temizleniyor: ${statusCounts.CLEANING}`;

        return {
          content: [{ type: 'text' as const, text: `=== Masalar ===\n${summary}${lines.join('\n')}` }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_table',
    'Masa detayını ve aktif siparişlerini getir',
    { tableId: z.string().describe('Masa ID') },
    async ({ tableId }) => {
      try {
        const table = await prisma.table.findUnique({
          where: { id: tableId },
          include: {
            orders: {
              where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
              include: {
                items: { include: { menuItem: { select: { name: true } } } },
                user: { select: { name: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
            location: { select: { name: true } },
          },
        });

        if (!table) {
          return { content: [{ type: 'text' as const, text: `Masa bulunamadı: ${tableId}` }] };
        }

        const orderLines = table.orders.map((o) => {
          const items = o.items
            .map((i) => `      ${i.menuItem.name} x${i.quantity}${i.notes ? ` (${i.notes})` : ''}`)
            .join('\n');
          return [
            `  ${formatOrderNumber(o.orderNumber)} | ${getOrderStatusText(o.status)} | ${formatTL(toNumber(o.total))}`,
            `    Garson: ${o.user?.name || '-'}`,
            items,
          ].join('\n');
        });

        const text = [
          `=== ${table.name || `Masa ${table.number}`} ===`,
          `Durum: ${getTableStatusText(table.status)}`,
          `Kapasite: ${table.capacity} kişi`,
          `Kat: ${table.floor}`,
          table.section ? `Bölüm: ${table.section}` : null,
          table.location ? `Lokasyon: ${table.location.name}` : null,
          '',
          table.orders.length > 0
            ? `--- Aktif Siparişler (${table.orders.length}) ---\n${orderLines.join('\n\n')}`
            : 'Aktif sipariş yok.',
        ]
          .filter(Boolean)
          .join('\n');

        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'update_table_status',
    'Masa durumunu güncelle',
    {
      tableId: z.string().describe('Masa ID'),
      status: z.enum(['FREE', 'OCCUPIED', 'RESERVED', 'CLEANING']).describe('Yeni masa durumu'),
    },
    async ({ tableId, status }) => {
      try {
        const table = await prisma.table.findUnique({ where: { id: tableId } });
        if (!table) {
          return { content: [{ type: 'text' as const, text: `Masa bulunamadı: ${tableId}` }] };
        }

        const data: Record<string, unknown> = { status };
        if (status === 'FREE') {
          data.sessionToken = null;
          data.sessionStartedAt = null;
        }

        const updated = await prisma.table.update({
          where: { id: tableId },
          data,
        });

        return {
          content: [{
            type: 'text' as const,
            text: `"${updated.name || `Masa ${updated.number}`}" durumu güncellendi: ${getTableStatusText(status)}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );
}
