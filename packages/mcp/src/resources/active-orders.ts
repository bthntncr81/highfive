import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { toNumber, formatTL, formatOrderNumber, getOrderStatusText, getOrderTypeText } from '../lib/format';

export function registerActiveOrdersResource(server: McpServer, prisma: PrismaClient): void {
  server.resource(
    'active-orders',
    'highfive://active-orders',
    {
      description: 'Aktif siparişler - bekleyen, hazırlanan, hazır',
      mimeType: 'text/plain',
    },
    async (uri) => {
      const orders = await prisma.order.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
        },
        include: {
          table: true,
          user: { select: { name: true } },
          items: {
            include: { menuItem: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (orders.length === 0) {
        return { contents: [{ uri: uri.href, text: 'Aktif sipariş yok.' }] };
      }

      const lines: string[] = [`=== Aktif Siparişler (${orders.length}) ===`, ''];

      for (const order of orders) {
        const elapsed = Math.round((Date.now() - order.createdAt.getTime()) / 60000);
        const table = order.table ? `Masa: ${order.table.name || order.table.number}` : 'Paket';
        lines.push(`${formatOrderNumber(order.orderNumber)} | ${getOrderStatusText(order.status)} | ${getOrderTypeText(order.type)} | ${elapsed} dk`);
        lines.push(`  ${table} | Garson: ${order.user?.name || '-'} | ${formatTL(toNumber(order.total))}`);
        for (const item of order.items) {
          lines.push(`    - ${item.menuItem.name} x${item.quantity} [${getOrderStatusText(item.status)}]${item.notes ? ` (${item.notes})` : ''}`);
        }
        lines.push('');
      }

      return { contents: [{ uri: uri.href, text: lines.join('\n') }] };
    }
  );
}
