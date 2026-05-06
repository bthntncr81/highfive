import { useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

import { useMenu, useCampaigns } from "@/lib/hooks";
import { CampaignCarousel } from "@/components/ui/CampaignCarousel";
import { CategoryStrip } from "@/components/ui/CategoryStrip";
import { ProductCard } from "@/components/ui/ProductCard";
import { Logo } from "@/components/ui/Logo";

export default function Home() {
  const [selectedCat, setSelectedCat] = useState("all");
  const menu = useMenu();
  const campaigns = useCampaigns();

  const categories = menu.data?.categories?.filter((c) => c.active) ?? [];
  const items = menu.data?.items?.filter((i) => i.available) ?? [];

  const featured = useMemo(() => {
    if (selectedCat === "all") {
      // Önce featured işaretliler, sonra ilk N
      const f = items.filter((i) => i.featured);
      return (f.length ? f : items).slice(0, 6);
    }
    return items.filter((p) => p.categoryId === selectedCat);
  }, [selectedCat, items]);

  const refreshing = menu.loading || campaigns.loading;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              menu.refresh();
              campaigns.refresh();
            }}
            tintColor="#bb1e10"
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <View className="flex-row items-center">
            <Logo height={36} />
          </View>
          <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-surface">
            <Ionicons name="notifications-outline" size={22} color="#1a1a1a" />
          </Pressable>
        </View>

        {/* Adres barı */}
        <Pressable className="mx-5 mt-1 flex-row items-center rounded-2xl border border-border-light bg-white px-4 py-3">
          <Ionicons name="location" size={20} color="#bb1e10" />
          <View className="ml-2 flex-1">
            <Text className="text-[10px] uppercase tracking-wide text-foreground-muted">
              Teslimat adresi
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              Akçakoca, Düzce
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9a9a9a" />
        </Pressable>

        {/* Kampanya carousel */}
        <View className="mt-5 min-h-[140px]">
          {campaigns.loading && !campaigns.data ? (
            <View className="mx-5 items-center justify-center rounded-3xl bg-surface py-12">
              <ActivityIndicator color="#bb1e10" />
            </View>
          ) : campaigns.data?.campaigns?.length ? (
            <CampaignCarousel campaigns={campaigns.data.campaigns} />
          ) : (
            <View className="mx-5 items-center justify-center rounded-3xl bg-surface py-10">
              <Text className="text-3xl">🎁</Text>
              <Text className="mt-2 text-sm text-foreground-muted">
                Şu anda aktif kampanya yok
              </Text>
            </View>
          )}
        </View>

        {/* Kategoriler */}
        <View className="mt-7 flex-row items-center justify-between px-5 pb-3">
          <Text className="text-lg font-extrabold text-foreground">
            Kategoriler
          </Text>
          <Link href="/menu" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-primary-500">
                Tüm menü
              </Text>
            </Pressable>
          </Link>
        </View>
        <CategoryStrip
          categories={categories}
          selectedId={selectedCat}
          onSelect={setSelectedCat}
        />

        {/* Öne çıkanlar */}
        <View className="mt-7 flex-row items-center justify-between px-5 pb-3">
          <Text className="text-lg font-extrabold text-foreground">
            {selectedCat === "all"
              ? "Öne çıkanlar"
              : categories.find((c) => c.id === selectedCat)?.name ?? "Ürünler"}
          </Text>
          <Text className="text-xs text-foreground-muted">
            {featured.length} ürün
          </Text>
        </View>

        <View className="px-5">
          {menu.loading && !menu.data ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#bb1e10" />
            </View>
          ) : menu.error ? (
            <View className="items-center rounded-3xl bg-surface px-6 py-10">
              <Text className="text-3xl">⚠️</Text>
              <Text className="mt-2 text-sm font-semibold text-foreground">
                Menü yüklenemedi
              </Text>
              <Text className="mt-1 text-center text-xs text-foreground-muted">
                {menu.error}
              </Text>
              <Pressable
                onPress={menu.refresh}
                className="mt-3 rounded-full bg-primary-500 px-4 py-2"
              >
                <Text className="text-xs font-bold text-white">Tekrar dene</Text>
              </Pressable>
            </View>
          ) : (
            featured.map((p) => (
              <ProductCard key={p.id} product={p} variant="list" />
            ))
          )}
          {!menu.loading && !menu.error && featured.length === 0 && (
            <View className="items-center rounded-3xl bg-surface px-6 py-10">
              <Text className="text-4xl">🔍</Text>
              <Text className="mt-2 text-sm font-semibold text-foreground">
                Bu kategoride ürün yok
              </Text>
            </View>
          )}
        </View>

        {/* Hızlı teslimat banner */}
        <View className="mx-5 mt-6 flex-row items-center rounded-2xl border border-border-light bg-surface px-4 py-4">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-accent-500">
            <Ionicons name="bicycle" size={20} color="#fff" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-bold text-foreground">
              Hızlı teslimat
            </Text>
            <Text className="text-xs text-foreground-muted">
              Ortalama 30 dakikada kapında
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
