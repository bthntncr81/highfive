// Sepete uçan ürün animasyonu için global event store
import { create } from "zustand";

export type FlyingItem = {
  id: string;
  imageUrl?: string | null;
  emoji?: string;
  startX: number;
  startY: number;
};

type Store = {
  items: FlyingItem[];
  fly: (item: Omit<FlyingItem, "id">) => void;
  remove: (id: string) => void;
};

let counter = 0;
export const useFlyCart = create<Store>((set) => ({
  items: [],
  fly: (item) => {
    counter += 1;
    const id = `fly-${Date.now()}-${counter}`;
    set((s) => ({ items: [...s.items, { ...item, id }] }));
  },
  remove: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),
}));
