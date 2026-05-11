// Cart Offers — sepete uygun en avantajlı sadakat tek tek (no stacking)
import { useEffect } from "react";
import { create } from "zustand";
import { endpoints } from "./api";

export type CartOffer = {
  source: "PROGRAM" | "COUPON" | "TIER";
  programId?: string;
  programType?: string;
  couponId?: string;
  couponCode?: string;
  name: string;
  description?: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  calculatedDiscount: number;
};

type Store = {
  bestOffer: CartOffer | null;
  loading: boolean;
  // Manuel müdahale: kullanıcı banner'ı kapatmışsa override
  dismissed: boolean;
  setOffer: (o: CartOffer | null) => void;
  setLoading: (b: boolean) => void;
  setDismissed: (b: boolean) => void;
  reset: () => void;
};

export const useCartOffer = create<Store>((set) => ({
  bestOffer: null,
  loading: false,
  dismissed: false,
  setOffer: (o) => set({ bestOffer: o }),
  setLoading: (b) => set({ loading: b }),
  setDismissed: (b) => set({ dismissed: b }),
  reset: () => set({ bestOffer: null, loading: false, dismissed: false }),
}));

/**
 * Hook: sepetteki ürünler değiştikçe otomatik en avantajlı offer'ı çağırır.
 * Bundle ek opsiyon fiyatları (extrasTotal) unitPrice'a dahil edilir
 * — sadakat indirimi düzgün hesaplansın.
 * @param items cart items
 */
export function useAutoCartOffer(
  items: { id: string; price: number; qty: number; extrasTotal?: number }[],
) {
  const setOffer = useCartOffer((s) => s.setOffer);
  const setLoading = useCartOffer((s) => s.setLoading);

  useEffect(() => {
    // Sepet boşsa offer da boş
    if (items.length === 0) {
      setOffer(null);
      return;
    }
    // Bundle ID prefix'lerini ayıkla; bundle:xxx#sel formatından sadece bundle ID kalsın
    const evalItems = items.map((it) => ({
      menuItemId: it.id.replace(/^bundle:/, "").split("#")[0],
      quantity: it.qty,
      unitPrice: Number(it.price) + Number(it.extrasTotal ?? 0),
    }));

    // Debounce 500ms — hızlı qty değişiminde gereksiz network önle
    const timer = setTimeout(() => {
      setLoading(true);
      endpoints
        .cartEvaluate(evalItems)
        .then((res) => {
          setOffer(res.bestOffer ?? null);
        })
        .catch(() => setOffer(null))
        .finally(() => setLoading(false));
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(
      items.map((i) => `${i.id}:${i.qty}:${i.price}:${i.extrasTotal ?? 0}`),
    ),
  ]);
}
