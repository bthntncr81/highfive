import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCart } from "@/lib/cart";
import { ApiBundle, imageUrl, parsePrice } from "@/lib/api";

export function BundleCard({ bundle }: { bundle: ApiBundle }) {
  const add = useCart((s) => s.add);
  const original = parsePrice(bundle.originalPrice);
  const price = parsePrice(bundle.bundlePrice);
  const savings = parsePrice(bundle.savings);
  const img = imageUrl(bundle.image);

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Bundle'ı tek bir item olarak ekle (id: bundle:xxx prefix ile)
    add({
      id: `bundle:${bundle.id}`,
      name: bundle.name,
      price,
      imageUrl: img ?? undefined,
    });
  };

  return (
    <View className="mb-3 overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50">
      {/* Görsel başlık (varsa arka plan, yoksa amber gradient) */}
      <View
        style={{
          height: img ? 180 : 60,
          backgroundColor: img ? "transparent" : "#fcd34d",
          position: "relative",
        }}
      >
        {img && (
          <Image
            source={{ uri: img }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            contentFit="cover"
            transition={200}
          />
        )}
        {/* Karartma overlay (text okunsun) */}
        {img && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
        )}

        {/* Üst-sol badge'ler */}
        <View className="absolute left-3 top-3 flex-row items-center gap-1.5">
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

        {/* Alt: bundle adı + açıklama (image üzerinde) */}
        {img && (
          <View
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 10,
            }}
          >
            <Text
              className="text-lg font-extrabold text-white"
              numberOfLines={2}
              style={{
                textShadowColor: "rgba(0,0,0,0.7)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {bundle.name}
            </Text>
            {bundle.description && (
              <Text
                className="mt-0.5 text-xs text-white/90"
                numberOfLines={1}
                style={{
                  textShadowColor: "rgba(0,0,0,0.6)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {bundle.description}
              </Text>
            )}
          </View>
        )}
      </View>

      <View className="p-3">
        {/* Görsel yoksa adı burada göster */}
        {!img && (
          <View>
            <Text className="text-base font-extrabold text-foreground">
              {bundle.name}
            </Text>
            {bundle.description && (
              <Text className="mt-0.5 text-xs text-foreground-muted" numberOfLines={2}>
                {bundle.description}
              </Text>
            )}
          </View>
        )}

        {/* Items list */}
        <View className={img ? "rounded-xl bg-white/80 p-2" : "mt-2 rounded-xl bg-white/70 p-2"}>
          {bundle.items.slice(0, 4).map((it, i) => (
            <View key={i} className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={12} color="#d97706" />
              <Text className="ml-1.5 text-xs text-foreground-muted" numberOfLines={1}>
                {it.quantity}x {it.menuItem.name}
              </Text>
            </View>
          ))}
          {bundle.items.length > 4 && (
            <Text className="text-[10px] text-foreground-subtle mt-0.5">
              +{bundle.items.length - 4} ürün daha
            </Text>
          )}
        </View>

        {/* Price + CTA */}
        <View className="mt-3 flex-row items-end justify-between">
          <View>
            {original > price && (
              <Text className="text-xs text-foreground-subtle line-through">
                {original.toFixed(2)} ₺
              </Text>
            )}
            <Text className="text-2xl font-extrabold text-amber-700">
              {price.toFixed(2)} ₺
            </Text>
          </View>
          <Pressable
            onPress={handleAdd}
            className="flex-row items-center rounded-full bg-amber-500 px-4 py-2.5"
          >
            <Ionicons name="cart" size={16} color="#fff" />
            <Text className="ml-1.5 text-sm font-bold text-white">Sepete ekle</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
