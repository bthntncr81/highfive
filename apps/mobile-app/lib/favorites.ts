// Favorites store — backend ile sync, optimistik toggle
import { create } from "zustand";
import { endpoints, ApiMenuItem, ApiError } from "./api";

type FavoritesState = {
  ids: string[]; // Array — referans değişince selector kesinlikle re-render
  items: ApiMenuItem[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  toggle: (menuItemId: string, item?: ApiMenuItem) => Promise<void>;
  isFavorite: (id: string) => boolean;
};

export const useFavorites = create<FavoritesState>((set, get) => ({
  ids: [],
  items: [],
  loaded: false,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const res = await endpoints.favorites();
      set({
        ids: res.favorites.map((f) => f.menuItemId),
        items: res.items ?? [],
        loaded: true,
      });
    } catch (e) {
      // 404/network sessizce geç (guest user / endpoint yok)
      console.log("[favorites] load failed", e);
    } finally {
      set({ loading: false });
    }
  },

  toggle: async (menuItemId: string, item?: ApiMenuItem) => {
    const prevIds = get().ids;
    const prevItems = get().items;
    const isFav = prevIds.includes(menuItemId);

    // Optimistik
    if (isFav) {
      set({
        ids: prevIds.filter((id) => id !== menuItemId),
        items: prevItems.filter((it) => it.id !== menuItemId),
      });
    } else {
      set({
        ids: [menuItemId, ...prevIds],
        items: item ? [item, ...prevItems] : prevItems,
      });
    }

    try {
      const res = await endpoints.toggleFavorite(menuItemId);
      // Backend gerçek durumu döner — emin olmak için listeyi yenile
      // (özellikle items array için item objesi gerekiyor)
      if (res.favorited && !item) {
        // Item objesi yoksa listeyi tazele
        get().load();
      }
    } catch (e: any) {
      // Rollback
      set({ ids: prevIds, items: prevItems });
      if (!(e instanceof ApiError && e.status === 404)) {
        // 404 sessiz, diğer hataları log
        console.log("[favorites] toggle failed", e);
      }
    }
  },

  isFavorite: (id: string) => get().ids.includes(id),
}));
