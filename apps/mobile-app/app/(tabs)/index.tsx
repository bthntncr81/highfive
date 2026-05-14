import { useMemo, useState, useEffect } from "react";
import { endpoints } from "@/lib/api";
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
import { useAuth } from "@/lib/auth";
import { CampaignCarousel } from "@/components/ui/CampaignCarousel";
import { CategoryStrip } from "@/components/ui/CategoryStrip";
import { ProductCard } from "@/components/ui/ProductCard";
import { Logo } from "@/components/ui/Logo";
import { ActiveOrderCard } from "@/components/ui/ActiveOrderCard";
import { BundleCard } from "@/components/ui/BundleCard";
import { LoyaltyTeaser } from "@/components/ui/LoyaltyTeaser";
import { StreakWidget } from "@/components/StreakWidget";
import { BirthdayCelebration } from "@/components/BirthdayCelebration";
import { DailySpinWheelTrigger } from "@/components/DailySpinWheelTrigger";
import { BuilderCategoryCards } from "@/components/BuilderCategoryCards";

export default function Home() {
  const [selectedCat, setSelectedCat] = useState("all");
  const menu = useMenu();
  const user = useAuth((s) => s.user);
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);

  // Streak + birthdate verisini lazy çek (kullanıcı giriş yapmışsa)
  useEffect(() => {
    if (!user) {
      setStreak(null);
      setBirthDate(null);
      return;
    }
    endpoints
      .loyaltyProgress()
      .then((res) => {
        const c = res.customer;
        if (c) {
          setStreak({ current: c.currentStreak ?? 0, longest: c.longestStreak ?? 0 });
          setBirthDate(c.birthDate ?? null);
        }
      })
      .catch(() => {});
  }, [user]);
  const campaigns = useCampaigns();

  const categories = menu.data?.categories?.filter((c) => c.active) ?? [];
  const items = menu.data?.items?.filter((i) => i.available) ?? [];
  const bundles = menu.data?.bundles ?? [];

  const featured = useMemo(() => {
    if (selectedCat === "all") {
      // Önce featured işaretliler, sonra ilk N
      const f = items.filter((i) => i.featured);
      return (f.length ? f : items).slice(0, 6);
    }
    return items.filter((p) => p.categoryId === selectedCat);
  }, [selectedCat, items]);

  // Kategoriye atanmış bundle'lar — seçili kategoride veya "all" değerinde göster
  const bundlesForCategory = useMemo(() => {
    if (selectedCat === "all") {
      return bundles.filter((b) => !b.categoryId); // sadece kategorisizler "all"'da top-level
    }
    return bundles.filter((b) => b.categoryId === selectedCat);
  }, [selectedCat, bundles]);

  // "All"'da gösterilen top-level paketler için başlık
  const hasUncategorizedBundles = bundles.some((b) => !b.categoryId);

  const refreshing = menu.loading || campaigns.loading;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Doğum günü kutlaması (yılda 1 kez) */}
      {user && birthDate && (
        <BirthdayCelebration birthDate={birthDate} customerName={user.name ?? null} />
      )}
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

        {/* Aktif sipariş kartı (varsa) */}
        <ActiveOrderCard />

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

        {/* Streak Widget (kullanıcı giriş yapmışsa) */}
        {user && streak && streak.current > 0 && (
          <StreakWidget currentStreak={streak.current} longestStreak={streak.longest} />
        )}

        {/* Spin Wheel artık otomatik açılır (her gün 1 kez) — burada kart yok */}
        {user && <DailySpinWheelTrigger />}

        {/* Kategorisiz "Paket Menüler" (artık kompakt, sadece kategoriye atanmamış paketler) */}
        {selectedCat === "all" && hasUncategorizedBundles && (
          <View className="mt-6 px-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-foreground">
                📦 Paket Menüler
              </Text>
              <Text className="text-xs text-foreground-muted">
                {bundles.filter((b) => !b.categoryId).length} paket
              </Text>
            </View>
            {bundles
              .filter((b) => !b.categoryId)
              .map((b) => (
                <BundleCard key={b.id} bundle={b} />
              ))}
          </View>
        )}

        {/* Sadakat programları (varsa) */}
        <LoyaltyTeaser />

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

        {/* HighFive Kazandıran Menüler kategorisi seçildiğinde Builder kartları */}
        {selectedCat === "cat-highfive" && (
          <View className="mt-6 px-5">
            <BuilderCategoryCards />
          </View>
        )}

        {/* Kategoriye atanmış paketler (kategori seçildiğinde) */}
        {selectedCat !== "all" && bundlesForCategory.length > 0 && (
          <View className="mt-6 px-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-foreground">
                {selectedCat === "cat-highfive"
                  ? "📦 Paket Menüler"
                  : `📦 ${categories.find((c) => c.id === selectedCat)?.name ?? ""} Paketleri`}
              </Text>
              <Text className="text-xs text-foreground-muted">
                {bundlesForCategory.length} paket
              </Text>
            </View>
            {bundlesForCategory.map((b) => (
              <BundleCard key={b.id} bundle={b} />
            ))}
          </View>
        )}

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
