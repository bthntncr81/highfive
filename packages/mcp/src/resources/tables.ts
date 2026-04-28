import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { toNumber, formatTL, getTableStatusText } from '../lib/format';

export function registerTablesResource(server: McpServer, prisma: PrismaClient): void {
  server.resource(
    'tables',
    'highfive://tables',
    {
      description: 'Masa durumu haritası',
      mimeType: 'text/plain',
    },
    async (uri) => {
      const tables = await prisma.table.findMany({
        where: { active: true },
        include: {
          orders: {
            where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            select: { id: true, total: true, status: true },
          },
        },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      });

      const statusCounts = {
        FREE: tables.filter((t) => t.status === 'FREE').length,
        OCCUPIED: tables.filter((t) => t.status === 'OCCUPIED').length,
        RESERVED: tables.filter((t) => t.status === 'RESERVED').length,
        CLEANING: tables.filter((t) => t.status === 'CLEANING').length,
      };

      const lines: string[] = [
        '=== Masa Durumu ===',
        `Toplam: ${tables.length} | Boş: ${statusCounts.FREE} | Dolu: ${statusCounts.OCCUPIED} | Rezerve: ${statusCounts.RESERVED} | Temizleniyor: ${statusCounts.CLEANING}`,
        '',
      ];

      // Group by floor
      const floors: Record<number, typeof tables> = {};
      for (const t of tables) {
        if (!floors[t.floor]) floors[t.floor] = [];
        floors[t.floor].push(t);
      }

      for (const [floor, floorTables] of Object.entries(floors)) {
        lines.push(`--- Kat ${floor} ---`);
        for (const t of floorTables) {
          const name = t.name || `Masa ${t.number}`;
          const status = getTableStatusText(t.status);
          const orderInfo = t.orders.length > 0
            ? ` | ${t.orders.length} sipariş (${formatTL(t.orders.reduce((s, o) => s + toNumber(o.total), 0))})`
            : '';
          lines.push(`  [${status}] ${name} (${t.capacity} kişi)${orderInfo}`);
        }
        lines.push('');
      }

      return { contents: [{ uri: uri.href, text: lines.join('\n') }] };
    }
  );
}
