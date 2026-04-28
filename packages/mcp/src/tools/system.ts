import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

export function registerSystemTools(server: McpServer, prisma: PrismaClient): void {
  server.tool(
    'health_check',
    'Veritabanı ve sistem durumunu kontrol et',
    {},
    async () => {
      try {
        const result = await prisma.$queryRaw<[{ now: Date }]>`SELECT NOW() as now`;
        const counts = await Promise.all([
          prisma.user.count(),
          prisma.order.count(),
          prisma.menuItem.count(),
          prisma.table.count(),
          prisma.customer.count(),
        ]);

        const text = [
          '=== HighFive System Health ===',
          `Database: OK`,
          `Server Time: ${result[0].now.toISOString()}`,
          '',
          '--- Record Counts ---',
          `Users: ${counts[0]}`,
          `Orders: ${counts[1]}`,
          `Menu Items: ${counts[2]}`,
          `Tables: ${counts[3]}`,
          `Customers: ${counts[4]}`,
        ].join('\n');

        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Database connection failed: ${err}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_settings',
    'Sistem ayarlarını oku',
    { key: z.string().optional().describe('Belirli bir ayar anahtarı (boş bırakılırsa tümü döner)') },
    async ({ key }) => {
      try {
        if (key) {
          const setting = await prisma.settings.findUnique({ where: { key } });
          if (!setting) {
            return { content: [{ type: 'text' as const, text: `Ayar bulunamadı: ${key}` }] };
          }
          return {
            content: [{ type: 'text' as const, text: `${setting.key}: ${JSON.stringify(setting.value, null, 2)}` }],
          };
        }

        const settings = await prisma.settings.findMany({ orderBy: { key: 'asc' } });
        if (settings.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Henüz ayar tanımlanmamış.' }] };
        }

        const text = settings
          .map((s) => `${s.key}: ${JSON.stringify(s.value)}`)
          .join('\n');

        return { content: [{ type: 'text' as const, text: `=== Ayarlar (${settings.length}) ===\n${text}` }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Hata: ${err}` }],
          isError: true,
        };
      }
    }
  );
}
