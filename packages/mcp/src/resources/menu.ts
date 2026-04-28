import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { toNumber, formatTL } from '../lib/format';

export function registerMenuResource(server: McpServer, prisma: PrismaClient): void {
  server.resource(
    'menu',
    'highfive://menu',
    {
      description: 'Güncel menü - kategoriler, ürünler, fiyatlar',
      mimeType: 'text/plain',
    },
    async (uri) => {
      const categories = await prisma.category.findMany({
        where: { active: true },
        include: {
          items: {
            include: { modifiers: { where: { available: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      const lines: string[] = ['=== HighFive Menü ===', ''];

      for (const cat of categories) {
        lines.push(`--- ${cat.name} (${cat.items.length} ürün) ---`);
        for (const item of cat.items) {
          const price = item.discountPrice
            ? `${formatTL(toNumber(item.discountPrice))} (eski: ${formatTL(toNumber(item.price))})`
            : formatTL(toNumber(item.price));
          const status = item.available ? '' : ' [MEVCUT DEĞİL]';
          const badges = item.badges.length > 0 ? ` {${item.badges.join(', ')}}` : '';
          lines.push(`  ${item.name} - ${price}${status}${badges}`);
          if (item.description) lines.push(`    ${item.description}`);
          if (item.modifiers.length > 0) {
            const mods = item.modifiers.map((m) => `${m.name} (+${formatTL(toNumber(m.price))})`).join(', ');
            lines.push(`    Seçenekler: ${mods}`);
          }
        }
        lines.push('');
      }

      const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
      const availableItems = categories.reduce(
        (sum, c) => sum + c.items.filter((i) => i.available).length,
        0
      );
      lines.push(`Toplam: ${totalItems} ürün (${availableItems} mevcut)`);

      return { contents: [{ uri: uri.href, text: lines.join('\n') }] };
    }
  );
}
