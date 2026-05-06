// Favorites store — backend ile sync, optimistik toggle
import { create } from "zustand";
import { endpoints, ApiMenuItem } from "./api";

type FavoritesState = {
  ids: Set<string>;
  items: ApiMenuItem[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  toggle: (menuItemId: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
};

export const useFavorites = create<FavoritesState>((set, get) => ({
  ids: new Set(),
  items: [],
  loaded: false,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const res = await endpoints.favorites();
      set({
        ids: new Set(res.favorites.map((f) => f.menuItemId)),
        items: res.items ?? [],
        loaded: true,
      });
    } catch {
      // sessizce geç — guest user vs.
    } finally {
      set({ loading: false });
    }
  },

  toggle: async (menuItemId: string) => {
    const has = get().ids.has(menuItemId);
    // Optimistik
    const next = new Set(get().ids);
    if (has) next.delete(menuItemId);
    else next.add(menuItemId);
    set({ ids: next });

    try {
      const res = await endpoints.toggleFavorite(menuItemId);
      // Backend gerçek durumu döner; senkronize et
      const final = new Set(get().ids);
      if (res.favorited) final.add(menuItemId);
      else final.delete(menuItemId);
      set({ ids: final });

      // Items listesini de güncelle (sadece favori sayfasında kritik)
      if (res.favorited === false) {
        set({ items: get().items.filter((it) => it.id !== menuItemId) });
      }
    } catch {
      // Hata: orijinaline geri sar
      set({ ids: get().ids });
    }
  },

  isFavorite: (id: string) => get().ids.has(id),
}));
