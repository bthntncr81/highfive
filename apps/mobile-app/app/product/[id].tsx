import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useState } from "react";

import { useMenu } from "@/lib/hooks";
import { useCart } from "@/lib/cart";
import { imageUrl, parsePrice } from "@/lib/api";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const menu = useMenu();
  const product = menu.data?.items.find((p) => p.id === id);
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);

  if (menu.loading && !menu.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#bb1e10" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="p-5">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-down" size={24} color="#1a1a1a" />
          </Pressable>
          <Text className="mt-8 text-center text-foreground-muted">
            Ürün bulunamadı.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const price = parsePrice(product.price);
  const discountPrice = product.discountPrice
    ? parsePrice(product.discountPrice)
    : null;
  const finalPrice = discountPrice ?? price;
  const oldPrice = discountPrice ? price : null;
  const img = imageUrl(product.image);
  const primaryBadge = product.badges?.[0];

  const handleAdd = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    add(
      {
        id: product.id,
        name: product.name,
        price: finalPrice,
        imageUrl: img ?? undefined,
      },
      qty,
    );
    router.back();
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="px-5 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-down" size={24} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView className="flex-1">
        {/* Görsel */}
        <View className="mx-5 mt-2 overflow-hidden rounded-3xl bg-primary-50">
          {img ? (
            <Image
              source={{ uri: img }}
              style={{ width: "100%", aspectRatio: 1 }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="aspect-square items-center justify-center">
              <Text className="text-9xl">🍽️</Text>
            </View>
          )}
          {primaryBadge && (
            <View className="absolute right-4 top-4 rounded-full bg-primary-500 px-3 py-1">
              <Text className="text-xs font-bold text-white">
                {primaryBadge}
              </Text>
            </View>
          )}
        </View>

        <View className="px-5 pt-5">
          {/* Badges row */}
          {product.badges && product.badges.length > 1 && (
            <View className="mb-2 flex-row flex-wrap gap-2">
              {product.badges.slice(1).map((b) => (
                <View
                  key={b}
                  className="rounded-full bg-surface px-2.5 py-1"
                >
                  <Text className="text-[10px] font-semibold text-foreground">
                    {b}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text className="text-3xl font-extrabold text-foreground">
            {product.name}
          </Text>

          {product.description && (
            <Text className="mt-2 text-sm leading-5 text-foreground-muted">
              {product.description}
            </Text>
          )}

          <View className="mt-5 flex-row items-center gap-4">
            {product.prepTime && (
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#6b6b6b" />
                <Text className="ml-1 text-xs text-foreground-muted">
                  {product.prepTime} dk
                </Text>
              </View>
            )}
            {product.calories && (
              <View className="flex-row items-center">
                <Ionicons name="flame-outline" size={14} color="#6b6b6b" />
                <Text className="ml-1 text-xs text-foreground-muted">
                  {product.calories} kcal
                </Text>
              </View>
            )}
          </View>

          <View className="mt-6 flex-row items-center">
            <Text className="text-3xl font-extrabold text-primary-500">
              {finalPrice} ₺
            </Text>
            {oldPrice && (
              <Text className="ml-3 text-base text-foreground-subtle line-through">
                {oldPrice} ₺
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Alt buton + qty */}
      <View className="border-t border-border-light px-5 pb-2 pt-4">
        <View className="flex-row items-center">
          <View className="flex-row items-center rounded-full bg-surface">
            <Pressable
              onPress={() => setQty((q) => Math.max(1, q - 1))}
              className="h-11 w-11 items-center justify-center"
            >
              <Ionicons name="remove" size={20} color="#1a1a1a" />
            </Pressable>
            <Text className="w-8 text-center font-bold text-foreground">
              {qty}
            </Text>
            <Pressable
              onPress={() => setQty((q) => q + 1)}
              className="h-11 w-11 items-center justify-center"
            >
              <Ionicons name="add" size={20} color="#1a1a1a" />
            </Pressable>
          </View>

          <Pressable
            onPress={handleAdd}
            className="ml-3 flex-1 items-center rounded-full bg-primary-500 py-4"
          >
            <Text className="text-base font-bold text-white">
              Sepete ekle • {(finalPrice * qty).toFixed(0)} ₺
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
