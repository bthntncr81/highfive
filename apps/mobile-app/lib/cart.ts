import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Bundle için kullanıcı opsiyon grubundan seçim yapınca her seçim
// selectedOptions dizisinde tutulur — toplam fiyata extraPrice eklenir.
export type CartItemSelectedOption = {
  groupId: string;
  groupName: string;
  itemId: string; // OptionGroupItem.id
  menuItemId: string;
  menuItemName: string;
  extraPrice: number;
};

export type CartItem = {
  id: string;
  name: string;
  price: number; // base price (bundle base veya menu item price)
  qty: number;
  imageUrl?: string;
  // Bundle ürünlerine seçilen opsiyonlar (varsa)
  selectedOptions?: CartItemSelectedOption[];
  // Toplam ek fiyat (selectedOptions toplamı, hızlı erişim için cache)
  extrasTotal?: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  itemUnitTotal: (item: CartItem) => number;
  total: () => number;
};

const calcUnit = (item: CartItem) =>
  Number(item.price) + Number(item.extrasTotal ?? 0);

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.id === item.id ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, qty }] };
        }),
      remove: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      updateQty: (id, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.id !== id)
              : s.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        })),
      clear: () => set({ items: [] }),
      itemUnitTotal: calcUnit,
      total: () =>
        get().items.reduce((sum, i) => sum + calcUnit(i) * i.qty, 0),
    }),
    {
      name: "highfive-cart",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
