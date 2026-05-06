import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useMenu } from "@/lib/hooks";
import { CategoryStrip } from "@/components/ui/CategoryStrip";
import { ProductCard } from "@/components/ui/ProductCard";

export default function MenuScreen() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const menu = useMenu();

  const categories = menu.data?.categories?.filter((c) => c.active) ?? [];
  const allItems = menu.data?.items?.filter((i) => i.available) ?? [];

  const filtered = useMemo(() => {
    let list = allItems;
    if (selectedCat !== "all") {
      list = list.filter((p) => p.categoryId === selectedCat);
    }
    if (search.trim()) {
      const q = search.trim().toLocaleLowerCase("tr");
      list = list.filter(
        (p) =>
          p.name.toLocaleLowerCase("tr").includes(q) ||
          (p.description ?? "").toLocaleLowerCase("tr").includes(q),
      );
    }
    return list;
  }, [allItems, selectedCat, search]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="px-5 pb-3 pt-2">
        <Text className="text-2xl font-extrabold text-foreground">Menü</Text>
      </View>

      <View className="mx-5 mb-3 flex-row items-center rounded-2xl bg-surface px-4">
        <Ionicons name="search" size={20} color="#6b6b6b" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Ürün ara…"
          placeholderTextColor="#9a9a9a"
          className="ml-2 flex-1 py-3 text-base text-foreground"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} className="p-1">
            <Ionicons name="close-circle" size={18} color="#9a9a9a" />
          </Pressable>
        )}
      </View>

      <View className="mb-3">
        <CategoryStrip
          categories={categories}
          selectedId={selectedCat}
          onSelect={setSelectedCat}
        />
      </View>

      {menu.loading && !menu.data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#bb1e10" size="large" />
          <Text className="mt-3 text-sm text-foreground-muted">
            Menü yükleniyor…
          </Text>
        </View>
      ) : menu.error ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-4xl">⚠️</Text>
          <Text className="mt-2 text-base font-semibold text-foreground">
            Bağlantı hatası
          </Text>
          <Text className="mt-1 text-center text-xs text-foreground-muted">
            {menu.error}
          </Text>
          <Pressable
            onPress={menu.refresh}
            className="mt-4 rounded-full bg-primary-500 px-5 py-3"
          >
            <Text className="font-bold text-white">Tekrar dene</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={menu.loading}
              onRefresh={menu.refresh}
              tintColor="#bb1e10"
            />
          }
        >
          <Text className="pb-3 text-xs uppercase tracking-widest text-foreground-muted">
            {filtered.length} ürün bulundu
          </Text>

          <View className="flex-row flex-wrap justify-between gap-y-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} variant="grid" />
            ))}
          </View>

          {filtered.length === 0 && (
            <View className="mt-8 items-center rounded-3xl bg-surface px-6 py-12">
              <Text className="text-5xl">🔎</Text>
              <Text className="mt-3 text-base font-semibold text-foreground">
                Sonuç bulunamadı
              </Text>
              <Text className="mt-1 text-center text-xs text-foreground-muted">
                Aramayı veya kategoriyi değiştirmeyi deneyin
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
