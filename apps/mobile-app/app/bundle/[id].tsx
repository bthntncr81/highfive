// Bundle Detail — paket menü detay + opsiyon grubu seçim ekranı.
// Kullanıcı her opsiyon grubundan min..max kadar ürün seçer, her ürünün
// extraPrice'i taban fiyatın üstüne eklenir.

import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useState, useMemo, useRef } from "react";

import { useMenu } from "@/lib/hooks";
import { useCart, type CartItemSelectedOption } from "@/lib/cart";
import { useFlyCart } from "@/lib/fly-cart";
import { imageUrl, parsePrice, type ApiBundleOptionGroup } from "@/lib/api";

export default function BundleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const menu = useMenu();
  const bundle = menu.data?.bundles?.find((b) => b.id === id);
  const add = useCart((s) => s.add);
  const fly = useFlyCart((s) => s.fly);
  const addBtnRef = useRef<View>(null);

  // selections[groupId] = OptionGroupItem.id[]
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  if (menu.loading && !menu.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#d97706" />
      </SafeAreaView>
    );
  }

  if (!bundle) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="p-5">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
          </Pressable>
          <Text className="mt-8 text-center text-foreground-muted">
            Paket bulunamadı.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const basePrice = parsePrice(bundle.bundlePrice);
  const original = parsePrice(bundle.originalPrice);
  const savings = parsePrice(bundle.savings);
  const img = imageUrl(bundle.image);
  const groups: ApiBundleOptionGroup[] = (bundle.optionGroupAssignments ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((a) => a.optionGroup);

  // Seçim ekleme/çıkarma
  const toggleItem = (group: ApiBundleOptionGroup, itemId: string) => {
    setSelections((cur) => {
      const arr = cur[group.id] ?? [];
      if (arr.includes(itemId)) {
        // remove
        return { ...cur, [group.id]: arr.filter((x) => x !== itemId) };
      }
      // ekle — maxSelect dolu mu kontrol et
      if (group.maxSelect === 1) {
        // single select → değiştir
        return { ...cur, [group.id]: [itemId] };
      }
      if (arr.length >= group.maxSelect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Limit dolu",
          `${group.name} grubundan en fazla ${group.maxSelect} ürün seçebilirsin.`,
        );
        return cur;
      }
      return { ...cur, [group.id]: [...arr, itemId] };
    });
  };

  // Validasyon
  const validation = useMemo(() => {
    for (const g of groups) {
      const sel = selections[g.id] ?? [];
      if (sel.length < g.minSelect) {
        return {
          ok: false,
          message: `"${g.name}" grubundan en az ${g.minSelect} ürün seç`,
        };
      }
      if (sel.length > g.maxSelect) {
        return {
          ok: false,
          message: `"${g.name}" grubundan en fazla ${g.maxSelect} ürün seçebilirsin`,
        };
      }
    }
    return { ok: true, message: "" };
  }, [groups, selections]);

  // Toplam ek fiyat
  const extrasTotal = useMemo(() => {
    let sum = 0;
    for (const g of groups) {
      const sel = selections[g.id] ?? [];
      for (const itemId of sel) {
        const it = g.items.find((i) => i.id === itemId);
        if (it) sum += Number(it.extraPrice);
      }
    }
    return sum;
  }, [groups, selections]);

  const finalPrice = basePrice + extrasTotal;

  const handleAdd = () => {
    if (!validation.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Eksik seçim", validation.message);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Tüm seçimleri flat liste haline getir
    const selectedOptions: CartItemSelectedOption[] = [];
    for (const g of groups) {
      const sel = selections[g.id] ?? [];
      for (const itemId of sel) {
        const it = g.items.find((i) => i.id === itemId);
        if (!it) continue;
        selectedOptions.push({
          groupId: g.id,
          groupName: g.name,
          itemId: it.id,
          menuItemId: it.menuItem.id,
          menuItemName: it.menuItem.name,
          extraPrice: Number(it.extraPrice),
        });
      }
    }

    // Cart item ID — bundle:bundleId#hash(seçimler) ile aynı seçim
    // tekrar eklenirse merge edilsin, farklıysa ayrı satır olsun.
    const selKey = selectedOptions
      .map((o) => o.itemId)
      .sort()
      .join("|");
    const cartId = `bundle:${bundle.id}${selKey ? "#" + selKey : ""}`;

    addBtnRef.current?.measureInWindow((x, y, w, h) => {
      fly({
        imageUrl: img,
        emoji: "📦",
        startX: x + w / 2,
        startY: y + h / 2,
      });
    });

    add({
      id: cartId,
      name: bundle.name,
      price: basePrice,
      imageUrl: img ?? undefined,
      selectedOptions,
      extrasTotal,
    });

    setTimeout(() => router.back(), 300);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text className="text-base font-bold text-foreground">Paket Menü</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Bundle görseli */}
        {img && (
          <Image
            source={{ uri: img }}
            style={{ width: "100%", height: 220 }}
            contentFit="cover"
            transition={200}
          />
        )}

        <View className="p-4">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-amber-500 px-2.5 py-1">
              <Text className="text-[10px] font-bold text-white">📦 PAKET</Text>
            </View>
            {savings > 0 && (
              <View className="rounded-full bg-green-500 px-2.5 py-1">
                <Text className="text-[10px] font-bold text-white">
                  {savings.toFixed(0)}₺ TASARRUF
                </Text>
              </View>
            )}
          </View>

          <Text className="mt-3 text-2xl font-extrabold text-foreground">
            {bundle.name}
          </Text>
          {bundle.description && (
            <Text className="mt-1 text-sm text-foreground-muted">
              {bundle.description}
            </Text>
          )}

          {/* Sabit içerik */}
          {bundle.items.length > 0 && (
            <View className="mt-4 rounded-2xl bg-amber-50 p-3">
              <Text className="text-xs font-bold text-amber-900">
                ✨ Pakete dahil
              </Text>
              <View className="mt-2 space-y-1">
                {bundle.items.map((it, i) => (
                  <View key={i} className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={14} color="#d97706" />
                    <Text className="ml-1.5 text-sm text-foreground">
                      {it.quantity}x {it.menuItem.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Opsiyon Grupları */}
          {groups.length > 0 && (
            <View className="mt-5 space-y-4">
              {groups.map((g) => {
                const sel = selections[g.id] ?? [];
                const isSingle = g.maxSelect === 1;
                return (
                  <View
                    key={g.id}
                    className="rounded-2xl border-2 border-amber-200 bg-white p-3"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-foreground">
                          📋 {g.name}
                        </Text>
                        {g.description && (
                          <Text className="text-xs text-foreground-muted">
                            {g.description}
                          </Text>
                        )}
                      </View>
                      <View
                        className={`rounded-full px-2.5 py-1 ${
                          sel.length >= g.minSelect
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      >
                        <Text className="text-[10px] font-bold text-white">
                          {sel.length}/
                          {g.minSelect === g.maxSelect
                            ? g.minSelect
                            : `${g.minSelect}-${g.maxSelect}`}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-1 text-[11px] text-foreground-subtle">
                      {g.minSelect === g.maxSelect
                        ? `Tam ${g.minSelect} ürün seç`
                        : `${g.minSelect}-${g.maxSelect} arası seç`}
                    </Text>

                    <View className="mt-3 space-y-2">
                      {g.items.map((it) => {
                        const checked = sel.includes(it.id);
                        const extra = Number(it.extraPrice);
                        return (
                          <Pressable
                            key={it.id}
                            onPress={() => toggleItem(g, it.id)}
                            className={`flex-row items-center rounded-xl border p-2.5 ${
                              checked
                                ? "border-amber-500 bg-amber-50"
                                : "border-border-light bg-white"
                            }`}
                          >
                            <View
                              className={`mr-3 h-6 w-6 items-center justify-center rounded-full border-2 ${
                                checked
                                  ? "border-amber-500 bg-amber-500"
                                  : "border-border-light bg-white"
                              }`}
                            >
                              {checked && (
                                <Ionicons
                                  name={isSingle ? "checkmark" : "checkmark"}
                                  size={14}
                                  color="#fff"
                                />
                              )}
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-semibold text-foreground">
                                {it.menuItem.name}
                              </Text>
                            </View>
                            {extra > 0 ? (
                              <Text className="text-sm font-bold text-amber-700">
                                +{extra.toFixed(2)} ₺
                              </Text>
                            ) : (
                              <Text className="text-xs text-foreground-subtle">
                                ücretsiz
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border-light bg-white px-4 pb-6 pt-3"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View className="flex-row items-end justify-between">
          <View>
            {original > basePrice && (
              <Text className="text-xs text-foreground-subtle line-through">
                {original.toFixed(2)} ₺
              </Text>
            )}
            <View className="flex-row items-baseline gap-1">
              <Text className="text-2xl font-extrabold text-amber-700">
                {finalPrice.toFixed(2)} ₺
              </Text>
              {extrasTotal > 0 && (
                <Text className="text-[11px] text-foreground-muted">
                  ({basePrice.toFixed(2)} + {extrasTotal.toFixed(2)})
                </Text>
              )}
            </View>
          </View>
          <Pressable
            ref={addBtnRef as any}
            onPress={handleAdd}
            disabled={!validation.ok}
            className={`flex-row items-center rounded-full px-5 py-3 ${
              validation.ok ? "bg-amber-500" : "bg-gray-300"
            }`}
          >
            <Ionicons name="cart" size={18} color="#fff" />
            <Text className="ml-2 text-base font-bold text-white">
              Sepete ekle
            </Text>
          </Pressable>
        </View>
        {!validation.ok && (
          <Text className="mt-1.5 text-[11px] text-red-600">
            ⚠️ {validation.message}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
