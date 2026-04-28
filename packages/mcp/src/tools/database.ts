import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE',
  'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE',
];

export function registerDatabaseTools(server: McpServer, prisma: PrismaClient): void {
  server.tool(
    'run_query',
    'Salt okunur SQL sorgusu çalıştır (sadece SELECT)',
    {
      query: z.string().describe('SQL SELECT sorgusu'),
    },
    async ({ query }) => {
      try {
        const trimmed = query.trim();

        // Validate: must start with SELECT
        if (!trimmed.toUpperCase().startsWith('SELECT')) {
          return {
            content: [{ type: 'text' as const, text: 'Hata: Sadece SELECT sorguları çalıştırılabilir.' }],
            isError: true,
          };
        }

        // Check for forbidden keywords
        const upper = trimmed.toUpperCase();
        for (const keyword of FORBIDDEN_KEYWORDS) {
          // Check for keyword as a standalone word (not part of another word)
          const regex = new RegExp(`\\b${keyword}\\b`);
          if (regex.test(upper)) {
            return {
              content: [{
                type: 'text' as const,
                text: `Hata: Yasaklı anahtar kelime tespit edildi: ${keyword}. Sadece SELECT sorgularına izin verilir.`,
              }],
              isError: true,
            };
          }
        }

        const result = await prisma.$queryRawUnsafe(trimmed) as Record<string, unknown>[];

        if (!Array.isArray(result) || result.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Sorgu sonucu: 0 kayıt' }] };
        }

        // Format as table
        const columns = Object.keys(result[0]);
        const rows = result.slice(0, 100); // Limit to 100 rows

        const header = columns.join(' | ');
        const separator = columns.map((c) => '-'.repeat(Math.max(c.length, 5))).join('-+-');
        const dataRows = rows.map((row) =>
          columns.map((col) => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
          }).join(' | ')
        );

        const text = [
          `Sonuç: ${result.length} kayıt${result.length > 100 ? ' (ilk 100 gösteriliyor)' : ''}`,
          '',
          header,
          separator,
          ...dataRows,
        ].join('\n');

        return { content: [{ type: 'text' as const, text }] };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `SQL Hata: ${err}` }],
          isError: true,
        };
      }
    }
  );
}
