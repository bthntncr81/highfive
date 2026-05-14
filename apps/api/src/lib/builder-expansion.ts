// Builder Expansion — kullanıcının "kendi pizzasını/sandviçini yap" cart item'ını
// order item'a dönüştürür ve fiyatı SERVER-SIDE yeniden doğrular.
//
// Cart item formatı (mobile + landing aynı):
//   { id: "builder:pizza:<baseId>:<ingredientIds.sorted>", price, selectedOptions }
//
// Backend mobile-orders.ts ve orders.ts /customer endpoint'lerinden çağrılır.
// Manipülasyon önlenir: client'ın gönderdiği fiyat backend'in hesapladığıyla
// eşleşmiyorsa order reddedilir.

import { PrismaClient, BuilderType } from '@prisma/client';

export type BuilderCartItem = {
  // Cart id formatı: "builder:pizza:<baseId>:<ingredientIds.sorted>"
  id: string;
  // Client'ın hesapladığı toplam (re-validation için referans)
  price: number;
  quantity?: number;
  selectedOptions?: Array<{
    groupId: string;
    groupName?: string;
    itemId: string;
    menuItemId?: string;
    menuItemName?: string;
    extraPrice?: number;
  }>;
};

export type BuilderExpansionResult =
  | { ok: true; subtotalDelta: number; orderItem: ExpandedBuilderOrderItem }
  | { ok: false; error: string };

export type ExpandedBuilderOrderItem = {
  menuItemId: null;
  menuItemName: string; // "🍕 Özel Pizza" / "🥪 Özel Sandviç"
  quantity: number;
  unitPrice: number;
  total: number;
  notes: string;
  modifiers: string[]; // ["Hamur: Klasik", "Sos: Domates", ...]
};

/**
 * Cart id'den builder type ve ID'leri parse et.
 * Örn: "builder:pizza:base123:ing1,ing2,ing3" → { type, baseId, ingredientIds }
 */
function parseCartId(cartId: string): {
  type: BuilderType;
  baseId: string;
  ingredientIds: string[];
} | null {
  const m = cartId.match(/^builder:(pizza|sandwich):([^:]+):(.*)$/);
  if (!m) return null;
  const type = m[1] === 'pizza' ? BuilderType.PIZZA : BuilderType.SANDWICH;
  const baseId = m[2];
  const ingredientIds = m[3]
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return { type, baseId, ingredientIds };
}

/**
 * Bir builder cart item'ını order item'a dönüştürür.
 * Backend'den base + ingredient'ları çeker, fiyatı yeniden hesaplar,
 * client'ın gönderdiği price ile eşleşmezse hata döner.
 */
export async function expandBuilderItem(
  prisma: PrismaClient,
  item: BuilderCartItem,
): Promise<BuilderExpansionResult> {
  const parsed = parseCartId(item.id);
  if (!parsed) {
    return { ok: false, error: `Geçersiz builder cart id: ${item.id}` };
  }
  const { type, baseId, ingredientIds } = parsed;

  const base = await prisma.builderBase.findUnique({ where: { id: baseId } });
  if (!base || !base.isActive || base.type !== type) {
    return { ok: false, error: `Taban bulunamadı veya aktif değil: ${baseId}` };
  }

  const ingredients =
    ingredientIds.length > 0
      ? await prisma.builderIngredient.findMany({
          where: {
            id: { in: ingredientIds },
            isActive: true,
            type,
          },
          orderBy: { layerOrder: 'asc' },
        })
      : [];

  // Fiyat hesabı (server tarafından otorite)
  const baseTotal = Number(base.basePrice);
  const extras = ingredients.reduce((s, i) => s + Number(i.extraPrice), 0);
  const expectedUnit = baseTotal + extras;

  // Client manipülasyon kontrolü (1 kuruş tolerans)
  const clientUnit = Number(item.price);
  if (Math.abs(clientUnit - expectedUnit) > 0.01) {
    return {
      ok: false,
      error: `Fiyat uyuşmazlığı (client: ${clientUnit.toFixed(2)} ₺, server: ${expectedUnit.toFixed(2)} ₺)`,
    };
  }

  // Modifier listesi (mutfağa basılan fiş için)
  const modifiers: string[] = [`Hamur: ${base.name}`];
  // Kategoriye göre grupla
  const byCategory = new Map<string, string[]>();
  for (const ing of ingredients) {
    const arr = byCategory.get(ing.category) ?? [];
    arr.push(ing.name + (Number(ing.extraPrice) > 0 ? ` (+${Number(ing.extraPrice).toFixed(0)}₺)` : ''));
    byCategory.set(ing.category, arr);
  }
  const labelMap: Record<string, string> = {
    BASE_SAUCE: 'Taban Sos',
    CHEESE: 'Peynir',
    MEAT: 'Et',
    VEGETABLE: 'Sebze',
    TOP_SAUCE: 'Üst Sos',
    DOUGH: 'Hamur Ek',
    EXTRA: 'Ekstra',
  };
  // Sıralı şekilde modifier ekle (BASE_SAUCE → CHEESE → MEAT → VEGETABLE → TOP_SAUCE)
  const order = ['BASE_SAUCE', 'CHEESE', 'MEAT', 'VEGETABLE', 'TOP_SAUCE', 'DOUGH', 'EXTRA'];
  for (const cat of order) {
    const items = byCategory.get(cat);
    if (items && items.length > 0) {
      modifiers.push(`${labelMap[cat] ?? cat}: ${items.join(', ')}`);
    }
  }

  const qty = Math.max(1, item.quantity ?? 1);
  const unitTotal = expectedUnit;

  const productName = type === BuilderType.PIZZA ? '🍕 Özel Pizza' : '🥪 Özel Sandviç';

  return {
    ok: true,
    subtotalDelta: unitTotal * qty,
    orderItem: {
      menuItemId: null,
      menuItemName: productName,
      quantity: qty,
      unitPrice: unitTotal,
      total: unitTotal * qty,
      notes: productName,
      modifiers,
    },
  };
}

/**
 * Cart id "builder:" ile başlayıp başlamadığını kontrol et.
 * mobile-orders.ts / orders.ts'te items dispatcher için kullanılır.
 */
export function isBuilderCartItem(cartId: string): boolean {
  return cartId.startsWith('builder:');
}
