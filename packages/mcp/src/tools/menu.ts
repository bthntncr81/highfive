import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { toNumber, formatTL } from '../lib/format';

export function registerMenuTools(server: McpServer, prisma: PrismaClient): void {
  server.tool(
    'list_menu_items',
    'Menü ürünlerini listele',
    {
      categoryId: z.string().optional().describe('Kategori ID filtresi'),
      available: z.boolean().optional().describe('Sadece mevcut ürünler (true/false)'),
      search: z.string().optional().describe('İsimde arama'),
    },
    async ({ categoryId, available, search }) => {
      try {
        const where: Record<string, unknown> = {};
        if (categoryId) where.categoryId = categoryId;
        if (available !== undefined) where.available = available;
        if (search) where.name = { contains: search, mode: 'insensitive' };

        const items = await prisma.menuItem.findMany({
          where,
          include: {
            category: { select: { name: true } },
            modifiers: { where: { available: true } },
          },
          orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        });

        if (items.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Ürün bulunamadı.' }] };
        }

        // Group by category
        const grouped: Record<string, typeof items> = {};
        for (const item of items) {
          const cat = item.category.name;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(item);
        }

        const lines: string[] = [];
        for (const [cat, catItems] of Object.entries(grouped)) {
          lines.push(`\n--- ${cat} ---`);
          for (const item of catItems) {
            const price = item.discountPrice
              ? `~~${formatTL(toNumber(item.price))}~~ ${formatTL(toNumber(item.discountPrice))}`
              : formatTL(toNumber(item.price));
            const badges = item.badges.length > 0 ? ` [${item.badges.join(', ')}]` : '';
            const stock = !item.available ? ' (MEVCUT DEĞİL)' : '';
            const mods = item.modifiers.length > 0
              ? `\n    Modifier: ${item.modifiers.map((m) => `${m.name} (+${formatTL(toNumber(m.price))})`).join(', ')}`
              : '';
            lines.push(`  ${item.name} - ${price}${badges}${stock}${mods}`);
            lines.push(`    ID: ${item.id}`);
          }
        }

        return {
          content: [{ type: 'text' as const, text: `=== Menü (${items.length} ürün) ===${lines.join('\n')}` }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_menu_item',
    'Menü ürünü detayını getir (malzemeler, modifier dahil)',
    { menuItemId: z.string().describe('Menü ürünü ID') },
    async ({ menuItemId }) => {
      try {
        const item = await prisma.menuItem.findUnique({
          where: { id: menuItemId },
          include: {
            category: { select: { name: true } },
            modifiers: true,
            ingredients: {
              include: { rawMaterial: true },
            },
          },
        });

        if (!item) {
          return { content: [{ type: 'text' as const, text: `Ürün bulunamadı: ${menuItemId}` }] };
        }

        const ingredients = item.ingredients
          .map((ing) => `  - ${ing.rawMaterial.name}: ${toNumber(ing.amount)} ${ing.rawMaterial.unit}${ing.optional ? ' (çıkarılabilir)' : ''}`)
          .join('\n');

        const modifiers = item.modifiers
          .map((m) => `  - ${m.name}: +${formatTL(toNumber(m.price))}${!m.available ? ' (mevcut değil)' : ''}`)
          .join('\n');

        const text = [
          `=== ${item.name} ===`,
          `Kategori: ${item.category.name}`,
          `Fiyat: ${formatTL(toNumber(item.price))}`,
          item.discountPrice ? `İndirimli Fiyat: ${formatTL(toNumber(item.discountPrice))}` : null,
          `Mevcut: ${item.available ? 'Evet' : 'Hayır'}`,
          item.outOfStockReason ? `Mevcut Değil Sebebi: ${item.outOfStockReason}` : null,
          item.description ? `Açıklama: ${item.description}` : null,
          item.prepTime ? `Hazırlık Süresi: ${item.prepTime} dk` : null,
          item.calories ? `Kalori: ${item.calories} kcal` : null,
          item.allergens.length > 0 ? `Alerjenler: ${item.allergens.join(', ')}` : null,
          item.badges.length > 0 ? `Rozetler: ${item.badges.join(', ')}` : null,
          item.stockQuantity !== null ? `Stok: ${item.stockQuantity}` : null,
          item.featured ? `Öne Çıkan: Evet` : null,
          '',
          ingredients.length > 0 ? `--- Malzemeler ---\n${ingredients}` : 'Malzeme tanımlı değil.',
          '',
          modifiers.length > 0 ? `--- Modifier'lar ---\n${modifiers}` : 'Modifier tanımlı değil.',
          '',
          `ID: ${item.id}`,
          `Oluşturulma: ${item.createdAt.toLocaleDateString('tr-TR')}`,
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
    'toggle_item_availability',
    'Menü ürününü mevcut/mevcut değil olarak ayarla',
    {
      menuItemId: z.string().describe('Menü ürünü ID'),
      available: z.boolean().describe('Mevcut mu (true/false)'),
    },
    async ({ menuItemId, available }) => {
      try {
        const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
        if (!item) {
          return { content: [{ type: 'text' as const, text: `Ürün bulunamadı: ${menuItemId}` }] };
        }

        const updated = await prisma.menuItem.update({
          where: { id: menuItemId },
          data: {
            available,
            outOfStockReason: available ? null : 'Manuel kapatıldı',
          },
        });

        return {
          content: [{
            type: 'text' as const,
            text: `"${updated.name}" ${available ? 'MEVCUT' : 'MEVCUT DEĞİL'} olarak ayarlandı.`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );

  server.tool(
    'update_menu_item_price',
    'Menü ürünü fiyatını güncelle',
    {
      menuItemId: z.string().describe('Menü ürünü ID'),
      price: z.number().describe('Yeni fiyat (TL)'),
      discountPrice: z.number().optional().describe('İndirimli fiyat (TL, opsiyonel)'),
    },
    async ({ menuItemId, price, discountPrice }) => {
      try {
        const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
        if (!item) {
          return { content: [{ type: 'text' as const, text: `Ürün bulunamadı: ${menuItemId}` }] };
        }

        const data: Record<string, unknown> = { price };
        if (discountPrice !== undefined) {
          data.discountPrice = discountPrice;
        }

        const updated = await prisma.menuItem.update({
          where: { id: menuItemId },
          data,
        });

        const msg = discountPrice !== undefined
          ? `"${updated.name}" fiyatı: ${formatTL(price)} (indirimli: ${formatTL(discountPrice)})`
          : `"${updated.name}" fiyatı: ${formatTL(price)}`;

        return { content: [{ type: 'text' as const, text: msg }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Hata: ${err}` }], isError: true };
      }
    }
  );
}
