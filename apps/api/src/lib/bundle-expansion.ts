// Reusable bundle expansion helper — mobile-orders + guest order için ortak.
// Body'den gelen bundles[] dizisini valide eder, orderItems satırlarını
// üretir, subtotal'a eklenecek tutarı döner.
//
// Slot konsepti:
//   BundleOptionGroupAssignment.quantity > 1 ise aynı grup birden fazla slot
//   olarak gösterilir. Mobile her slot için ayrı seçim gönderir
//   (assignmentId + slotIndex anahtarı).

import { PrismaClient } from '@prisma/client';

export type BundleSlotSelection = {
  assignmentId: string;          // BundleOptionGroupAssignment.id
  slotIndex: number;             // 0..(quantity-1)
  optionGroupItemIds: string[];  // bu slottan seçilen ürünler
};

export type BundleRequest = {
  bundleId: string;
  quantity?: number;
  // Yeni slot bazlı format
  selections?: BundleSlotSelection[];
  // Geriye uyumluluk: groupId bazlı (her grup tek slot)
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
          orderBy: { sortOrder: 'asc' },
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

    // Slot bazlı index (assignmentId:slotIndex → ids)
    const selBySlot = new Map<string, string[]>();
    for (const s of bundleReq.selections || []) {
      selBySlot.set(`${s.assignmentId}:${s.slotIndex}`, s.optionGroupItemIds || []);
    }
    // Geri uyumluluk: assignedSelections[].optionGroupId → assignment.id'ye çevir
    if (bundleReq.assignedSelections && bundleReq.assignedSelections.length > 0) {
      for (const a of bundle.optionGroupAssignments) {
        const old = bundleReq.assignedSelections.find(
          (x) => x.optionGroupId === a.optionGroupId,
        );
        if (old) selBySlot.set(`${a.id}:0`, old.optionGroupItemIds);
      }
    }

    let extrasPerUnit = 0;
    const selectedExtraLines: {
      itemId: string;
      menuItemId: string;
      menuItemName: string;
      extra: number;
      groupName: string;
      slotLabel: string;
    }[] = [];

    for (const a of bundle.optionGroupAssignments) {
      const g = a.optionGroup;
      const slotCount = Math.max(1, a.quantity || 1);
      for (let slot = 0; slot < slotCount; slot++) {
        const picked = selBySlot.get(`${a.id}:${slot}`) || [];
        const slotLabel = slotCount > 1 ? `${g.name} #${slot + 1}` : g.name;
        if (picked.length < g.minSelect || picked.length > g.maxSelect) {
          return {
            ok: false,
            error: `"${slotLabel}" için ${g.minSelect === g.maxSelect ? `tam ${g.minSelect}` : `${g.minSelect}-${g.maxSelect}`} ürün seç`,
          };
        }
        for (const pickId of picked) {
          const ogi = g.items.find((it) => it.id === pickId);
          if (!ogi) {
            return { ok: false, error: `"${slotLabel}" için seçilen ürün geçerli değil` };
          }
          extrasPerUnit += Number(ogi.extraPrice);
          selectedExtraLines.push({
            itemId: ogi.id,
            menuItemId: ogi.menuItemId,
            menuItemName: ogi.menuItem.name,
            extra: Number(ogi.extraPrice),
            groupName: g.name,
            slotLabel,
          });
        }
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
        (l) => `${l.slotLabel}: ${l.menuItemName}${l.extra > 0 ? ` (+${l.extra}₺)` : ''}`,
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
        notes: `📦 ${bundle.name} — ${sel.slotLabel}${sel.extra > 0 ? ` (+${sel.extra}₺ dahil)` : ''}`,
        modifiers: [],
      });
    }
  }

  return { ok: true, subtotalDelta, orderItems };
}
