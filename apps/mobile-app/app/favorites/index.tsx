import { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";

import { useFavorites } from "@/lib/favorites";
import { ProductCard } from "@/components/ui/ProductCard";

export default function FavoritesScreen() {
  const items = useFavorites((s) => s.items);
  const loading = useFavorites((s) => s.loading);
  const load = useFavorites((s) => s.load);

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="ml-3 text-2xl font-extrabold text-foreground">
          Favorilerim
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          paddingTop: 4,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor="#bb1e10"
          />
        }
      >
        {loading && items.length === 0 ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#bb1e10" />
          </View>
        ) : items.length === 0 ? (
          <View className="items-center rounded-3xl bg-surface px-6 py-12">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
              <Ionicons name="heart-outline" size={40} color="#bb1e10" />
            </View>
            <Text className="mt-3 text-base font-bold text-foreground">
              Favori ürünün yok
            </Text>
            <Text className="mt-1 text-center text-xs text-foreground-muted">
              Beğendiğin ürünlerin kart üzerindeki kalp ikonuyla buraya ekle.
            </Text>
            <Link href="/(tabs)/menu" asChild>
              <Pressable className="mt-4 rounded-full bg-primary-500 px-5 py-2.5">
                <Text className="text-sm font-bold text-white">Menüye git</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} variant="grid" />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
