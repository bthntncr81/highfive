// Reusable bundle expansion helper — mobile-orders + guest order için ortak.
// Body'den gelen bundles[] dizisini valide eder, orderItems satırlarını
// üretir, subtotal'a eklenecek tutarı döner.

import { PrismaClient } from '@prisma/client';

export type BundleRequest = {
  bundleId: string;
  quantity?: number;
  // Reusable opsiyon grubu seçimleri (BundleOptionGroupAssignment üzerinden)
  assignedSelections?: { optionGroupId: string; optionGroupItemIds: string[] }[];
};

export type ExpandedOrderItem = {
  menuItemId: string | null;
  menuItemName?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
  modifiers: string[];
};

export type BundleExpandResult =
  | { ok: true; subtotalDelta: number; orderItems: ExpandedOrderItem[] }
  | { ok: false; error: string };

export async function expandBundles(
  prisma: PrismaClient,
  bundles: BundleRequest[],
): Promise<BundleExpandResult> {
  let subtotalDelta = 0;
  const orderItems: ExpandedOrderItem[] = [];

  for (const bundleReq of bundles || []) {
    const qty = Math.max(1, bundleReq.quantity || 1);
    const bundle = await prisma.bundleDeal.findUnique({
      where: { id: bundleReq.bundleId },
      include: {
        items: { include: { menuItem: true } },
        optionGroupAssignments: {
          include: {
            optionGroup: {
              include: { items: { include: { menuItem: true } } },
            },
          },
        },
      },
    });
    if (!bundle || !bundle.isActive) {
      return { ok: false, error: `Paket mevcut değil: ${bundleReq.bundleId}` };
    }

    // Reusable opsiyon grubu seçimleri
    const selByGroupId = new Map<string, string[]>();
    for (const s of bundleReq.assignedSelections || []) {
      selByGroupId.set(s.optionGroupId, s.optionGroupItemIds || []);
    }

    let extrasPerUnit = 0;
    const selectedExtraLines: {
      itemId: string;
      menuItemId: string;
      menuItemName: string;
      extra: number;
      groupName: string;
    }[] = [];

    for (const a of bundle.optionGroupAssignments) {
      const g = a.optionGroup;
      const picked = selByGroupId.get(g.id) || [];
      if (picked.length < g.minSelect || picked.length > g.maxSelect) {
        return {
          ok: false,
          error: `"${g.name}" grubundan ${g.minSelect === g.maxSelect ? `tam ${g.minSelect}` : `${g.minSelect}-${g.maxSelect}`} ürün seç`,
        };
      }
      for (const pickId of picked) {
        const ogi = g.items.find((it) => it.id === pickId);
        if (!ogi) {
          return { ok: false, error: `"${g.name}" için seçilen ürün geçerli değil` };
        }
        extrasPerUnit += Number(ogi.extraPrice);
        selectedExtraLines.push({
          itemId: ogi.id,
          menuItemId: ogi.menuItemId,
          menuItemName: ogi.menuItem.name,
          extra: Number(ogi.extraPrice),
          groupName: g.name,
        });
      }
    }

    const unitTotal = Number(bundle.bundlePrice) + extrasPerUnit;
    subtotalDelta += unitTotal * qty;

    // Wrapper line
    orderItems.push({
      menuItemId: null,
      menuItemName: `📦 ${bundle.name}`,
      quantity: qty,
      unitPrice: unitTotal,
      total: unitTotal * qty,
      notes: 'Paket Menü',
      modifiers: selectedExtraLines.map(
        (l) => `${l.groupName}: ${l.menuItemName}${l.extra > 0 ? ` (+${l.extra}₺)` : ''}`,
      ),
    });

    // Sabit içerik (fiyatı 0)
    for (const fi of bundle.items) {
      orderItems.push({
        menuItemId: fi.menuItemId,
        quantity: fi.quantity * qty,
        unitPrice: 0,
        total: 0,
        notes: `📦 ${bundle.name}`,
        modifiers: [],
      });
    }

    // Seçilen ek ürünler — fiyatı zaten wrapper'a eklendi, burada 0 line
    for (const sel of selectedExtraLines) {
      orderItems.push({
        menuItemId: sel.menuItemId,
        quantity: qty,
        unitPrice: 0,
        total: 0,
        notes: `📦 ${bundle.name} — ${sel.groupName}${sel.extra > 0 ? ` (+${sel.extra}₺ dahil)` : ''}`,
        modifiers: [],
      });
    }
  }

  return { ok: true, subtotalDelta, orderItems };
}
