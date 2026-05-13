// Cross-sell toast — sepetteki ürünlere göre 1 tamamlayıcı ürün önerir.
// Mantık: sepette pizza varsa içecek/tatlı; içecek varsa tatlı; vb.
// Kullanıcı dismiss edebilir, AsyncStorage'a kaydedilir (24h).

import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useCart } from "@/lib/cart";
import { useFlyCart } from "@/lib/fly-cart";
import { useMenu } from "@/lib/hooks";
import { imageUrl, parsePrice, type ApiMenuItem } from "@/lib/api";

const DISMISSED_KEY = "hf_xsell_dismissed_at";
const DISMISS_HOURS = 4;

// Cross-sell mantığı: hangi kategoriden ürün önerelim?
function pickCrossSellCategory(
  cartCategoryIds: string[],
  allCategories: { id: string; name: string }[],
): string | null {
  const cartSet = new Set(cartCategoryIds);
  // Öncelik sırası: önce içecek (yoksa), sonra tatlı, sonra makarna
  const preferred = ["İçecek", "Tatlı", "Makarna", "Sandviçler"];
  for (const name of preferred) {
    const cat = allCategories.find((c) =>
      c.name.toLowerCase().includes(name.toLowerCase()),
    );
    if (cat && !cartSet.has(cat.id)) return cat.id;
  }
  return null;
}

export function CrossSellToast() {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const fly = useFlyCart((s) => s.fly);
  const menu = useMenu();
  const [dismissed, setDismissed] = useState(true); // başlangıçta gizli

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((raw) => {
      if (!raw) {
        setDismissed(false);
        return;
      }
      const ts = Number(raw);
      const ms = Date.now() - ts;
      setDismissed(ms < DISMISS_HOURS * 60 * 60 * 1000);
    });
  }, []);

  if (dismissed) return null;
  if (items.length === 0) return null;

  const categories = menu.data?.categories?.filter((c) => c.active) ?? [];
  const allItems = menu.data?.items?.filter((i) => i.available) ?? [];
  const cartCategoryIds: string[] = [];
  for (const it of items) {
    const matched = allItems.find((m) => m.id === it.id);
    if (matched?.categoryId) cartCategoryIds.push(matched.categoryId);
  }
  const suggestCatId = pickCrossSellCategory(cartCategoryIds, categories);
  if (!suggestCatId) return null;

  // Bu kategoriden featured veya en ucuz ürünü öner
  const candidates = allItems.filter((i) => i.categoryId === suggestCatId);
  if (candidates.length === 0) return null;
  const suggested =
    candidates.find((i) => i.featured) ??
    candidates.slice().sort((a, b) => parsePrice(a.price) - parsePrice(b.price))[0];

  const cat = categories.find((c) => c.id === suggestCatId);
  const img = imageUrl(suggested.image);

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    add({
      id: suggested.id,
      name: suggested.name,
      price: parsePrice(suggested.price),
      imageUrl: img ?? undefined,
    });
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  const handleDismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, String(Date.now()));
  };

  return (
    <View className="mx-5 my-3 flex-row items-center rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
      {img ? (
        <Image
          source={{ uri: img }}
          style={{ width: 56, height: 56, borderRadius: 12 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{ width: 56, height: 56, borderRadius: 12 }}
          className="items-center justify-center bg-amber-200"
        >
          <Text style={{ fontSize: 28 }}>{cat?.icon ?? "🍽️"}</Text>
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
          💡 Birlikte iyi gider
        </Text>
        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
          {suggested.name}
        </Text>
        <Text className="text-xs text-amber-700 font-extrabold">
          {parsePrice(suggested.price).toFixed(2)} ₺
        </Text>
      </View>
      <Pressable
        onPress={handleAdd}
        className="rounded-full bg-amber-500 px-3 py-2"
      >
        <Ionicons name="add" size={18} color="#fff" />
      </Pressable>
      <Pressable
        onPress={handleDismiss}
        hitSlop={8}
        className="ml-1 h-6 w-6 items-center justify-center"
      >
        <Ionicons name="close" size={14} color="#9a3412" />
      </Pressable>
    </View>
  );
}
