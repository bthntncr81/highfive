import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { toNumber, formatTL } from '../lib/format';

export function registerStockTools(server: McpServer, prisma: PrismaClient): void {
  server.tool(
    'check_stock_levels',
    'Ham madde stok durumunu kontrol et',
    {
      search: z.string().optional().describe('Ham madde ismiyle arama'),
    },
    async ({ search }) => {
      try {
        const where: Record<string, unknown> = { active: true };
        if (search) where.name = { contains: search, mode: 'insensitive' };

        const materials = await prisma.rawMaterial.findMany({
          where,
          include: {
            ingredients: {
              include: { menuItem: { select: { name: true } } },
            },
          },
          orderBy: { name: 'asc' },
        });

        if (materials.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Ham madde bulunamadı.' }] };
        }

        const lines = materials.map((m) => {
          const current = toNumber(m.currentStock);
          const min = toNumber(m.minStock);
          const isLow = min > 0 && current <= min;
          const warning = isLow ? ' ⚠️ DÜŞÜK STOK' : '';
          const usedIn = m.ingredients.length > 0
            ? `\n    Kullanıldığı ürünler: ${m.ingredients.map((i) => i.menuItem.name).join(', ')}`
            : '';
          return `  ${m.name}: ${current} ${m.unit} (min: ${min})${warning} | Birim maliyet: ${formatTL(toNumber(m.costPerUnit))}${m.supplier ? ` | Tedarikçi: ${m.supplier}` : ''}${usedIn}`;
        });

        return {
          content: [{ type: 'text' as const, text: `=== Ham Madde Stok (${materials.length}) ===\n\n${lines.join('\n\n')}` }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_low_stock_items',
    'Düşük stoklu ham maddeleri getir',
    {},
    async () => {
      try {
        const materials = await prisma.rawMaterial.findMany({
          where: { active: true },
          include: {
            ingredients: {
              include: { menuItem: { select: { name: true, available: true } } },
            },
          },
          orderBy: { name: 'asc' },
        });

        const lowStock = materials.filter((m) => {
          const min = toNumber(m.minStock);
          return min > 0 && toNumber(m.currentStock) <= min;
        });

        if (lowStock.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Düşük stoklu ham madde yok.' }] };
        }

        const lines = lowStock.map((m) => {
          const current = toNumber(m.currentStock);
          const min = toNumber(m.minStock);
          const affectedItems = m.ingredients
            .map((i) => `${i.menuItem.name}${!i.menuItem.available ? ' (kapalı)' : ''}`)
            .join(', ');
          return `  ${m.name}: ${current}/${min} ${m.unit}${m.supplier ? ` | Tedarikçi: ${m.supplier}` : ''}\n    Etkilenen ürünler: ${affectedItems || 'yok'}`;
        });

        return {
          content: [{
            type: 'text' as const,
            text: `=== Düşük Stok Uyarısı (${lowStock.length}) ===\n\n${lines.join('\n\n')}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'adjust_stock',
    'Ham madde stok miktarını ayarla',
    {
      rawMaterialId: z.string().describe('Ham madde ID'),
      amount: z.number().describe('Miktar'),
      operation: z.enum(['SET', 'ADD', 'SUBTRACT']).describe('İşlem: SET (ayarla), ADD (ekle), SUBTRACT (çıkar)'),
    },
    async ({ rawMaterialId, amount, operation }) => {
      try {
        const material = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
        if (!material) {
          return { content: [{ type: 'text' as const, text: `Ham madde bulunamadı: ${rawMaterialId}` }] };
        }

        let newStock: number;
        const current = toNumber(material.currentStock);

        switch (operation) {
          case 'SET':
            newStock = amount;
            break;
          case 'ADD':
            newStock = current + amount;
            break;
          case 'SUBTRACT':
            newStock = Math.max(0, current - amount);
            break;
        }

        const updated = await prisma.rawMaterial.update({
          where: { id: rawMaterialId },
          data: { currentStock: newStock },
        });

        return {
          content: [{
            type: 'text' as const,
            text: `"${updated.name}" stok güncellendi: ${current} → ${newStock} ${updated.unit}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );
}
