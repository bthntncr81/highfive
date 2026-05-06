import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";

import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

export default function CartScreen() {
  const items = useCart((s) => s.items);
  const updateQty = useCart((s) => s.updateQty);
  const clear = useCart((s) => s.clear);
  const total = useCart((s) => s.total());
  const user = useAuth((s) => s.user);

  const handleCheckout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      Alert.alert(
        "Giriş gerekli",
        "Sipariş vermek için önce giriş yap.",
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Giriş yap", onPress: () => router.push("/auth/login") },
        ],
      );
      return;
    }
    router.push("/checkout");
  };

  if (items.length === 0) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="px-5 pt-2 pb-3">
          <Text className="text-2xl font-extrabold text-foreground">
            Sepetim
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-50">
            <Ionicons name="cart-outline" size={48} color="#bb1e10" />
          </View>
          <Text className="mt-4 text-lg font-bold text-foreground">
            Sepetin boş
          </Text>
          <Text className="mt-1 text-center text-sm text-foreground-muted">
            Lezzetli yemekler seni bekliyor!
          </Text>
          <Link href="/menu" asChild>
            <Pressable className="mt-6 rounded-full bg-primary-500 px-6 py-3">
              <Text className="font-bold text-white">Menüye git</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  const onClear = () => {
    Alert.alert("Sepeti temizle", "Tüm ürünler silinecek, emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Temizle",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          clear();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Text className="text-2xl font-extrabold text-foreground">Sepetim</Text>
        <Pressable onPress={onClear}>
          <Text className="text-sm font-semibold text-primary-500">
            Temizle
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 4 }}
      >
        {items.map((it) => (
          <View
            key={it.id}
            className="mb-3 flex-row items-center rounded-2xl border border-border-light bg-white p-3"
          >
            {it.imageUrl ? (
              <Image
                source={{ uri: it.imageUrl }}
                style={{ width: 64, height: 64, borderRadius: 12 }}
                contentFit="cover"
              />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-xl bg-primary-50">
                <Text className="text-3xl">🍽️</Text>
              </View>
            )}

            <View className="ml-3 flex-1">
              <Text
                className="text-sm font-bold text-foreground"
                numberOfLines={1}
              >
                {it.name}
              </Text>
              <Text className="mt-0.5 text-xs text-foreground-muted">
                {it.price} ₺ / adet
              </Text>

              <View className="mt-2 flex-row items-center justify-between">
                <View className="flex-row items-center rounded-full bg-surface">
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      updateQty(it.id, it.qty - 1);
                    }}
                    className="h-8 w-8 items-center justify-center"
                  >
                    <Ionicons
                      name={it.qty === 1 ? "trash-outline" : "remove"}
                      size={16}
                      color="#1a1a1a"
                    />
                  </Pressable>
                  <Text className="w-6 text-center text-sm font-bold text-foreground">
                    {it.qty}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      updateQty(it.id, it.qty + 1);
                    }}
                    className="h-8 w-8 items-center justify-center"
                  >
                    <Ionicons name="add" size={16} color="#1a1a1a" />
                  </Pressable>
                </View>

                <Text className="text-base font-extrabold text-primary-600">
                  {(it.price * it.qty).toFixed(2)} ₺
                </Text>
              </View>
            </View>
          </View>
        ))}

        <View className="mt-2 flex-row items-center rounded-2xl bg-surface p-3">
          <Ionicons name="information-circle" size={18} color="#005387" />
          <Text className="ml-2 flex-1 text-xs text-foreground-muted">
            Teslimat ücreti ödeme adımında hesaplanır.
          </Text>
        </View>
      </ScrollView>

      <View className="border-t border-border-light px-5 pb-2 pt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm text-foreground-muted">Ara toplam</Text>
          <Text className="text-2xl font-extrabold text-foreground">
            {total.toFixed(2)} ₺
          </Text>
        </View>
        <Pressable
          onPress={handleCheckout}
          className="items-center rounded-full bg-primary-500 py-4"
        >
          <Text className="text-base font-bold text-white">
            Ödemeye geç • {total.toFixed(2)} ₺
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
