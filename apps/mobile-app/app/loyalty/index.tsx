import { useEffect, useState } from "react";
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
import { router } from "expo-router";

import { endpoints, ApiCustomer, ApiLoyaltyTier, ApiPointsTransaction } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";

export default function LoyaltyScreen() {
  const [data, setData] = useState<{
    customer: ApiCustomer;
    nextTier: ApiLoyaltyTier | null;
    pointsToNextTier: number | null;
    recentTransactions: ApiPointsTransaction[];
    pointsRules: { earnRate: string; redeemRate: string; minRedemption: number };
  } | null>(null);
  const [history, setHistory] = useState<ApiPointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      const [me, hist] = await Promise.all([
        endpoints.loyaltyMe(),
        endpoints.loyaltyHistory({ limit: 30 }),
      ]);
      setData(me);
      setHistory(hist.transactions);
    } catch (e: any) {
      handleApiError(e);
      setError(e?.message ?? "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading && !data) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#bb1e10" size="large" />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="px-5 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-foreground-muted">{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const c = data.customer;
  const tier = c.loyaltyTier;
  const tierProgress = data.nextTier
    ? Math.min(
        100,
        ((c.lifetimePoints - (tier?.minPoints ?? 0)) /
          Math.max(1, data.nextTier.minPoints - (tier?.minPoints ?? 0))) *
          100,
      )
    : 100;

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
          Sadakat
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#bb1e10"
          />
        }
      >
        {/* Puan kartı */}
        <View className="rounded-3xl bg-primary-500 p-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xs uppercase tracking-widest text-white/80">
                Toplam puanın
              </Text>
              <Text className="mt-1 text-5xl font-extrabold text-white">
                {c.totalPoints.toLocaleString("tr-TR")}
              </Text>
              <Text className="mt-1 text-xs text-white/80">
                ≈ {(c.totalPoints / 10).toFixed(2)}₺ indirim
              </Text>
            </View>
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <Ionicons name="star" size={28} color="#fff" />
            </View>
          </View>

          {tier && (
            <View className="mt-4 rounded-2xl bg-white/15 p-3">
              <View className="flex-row items-center">
                <Text className="text-2xl">{tier.icon ?? "🏆"}</Text>
                <View className="ml-2 flex-1">
                  <Text className="text-sm font-bold text-white">
                    {tier.name} Üye
                  </Text>
                  <Text className="text-[11px] text-white/80">
                    %{Number(tier.discountPercent)} indirim •{" "}
                    {Number(tier.pointsMultiplier)}x puan
                  </Text>
                </View>
              </View>

              {data.nextTier && (
                <View className="mt-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] text-white/80">
                      Sıradaki: {data.nextTier.name}
                    </Text>
                    <Text className="text-[11px] font-semibold text-white">
                      {data.pointsToNextTier} puan kaldı
                    </Text>
                  </View>
                  <View className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
                    <View
                      style={{ width: `${tierProgress}%` }}
                      className="h-full rounded-full bg-white"
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Stats */}
        <View className="mt-4 flex-row gap-3">
          <StatCard label="Toplam sipariş" value={String(c.orderCount)} icon="receipt-outline" />
          <StatCard
            label="Toplam harcama"
            value={`${Number(c.totalSpent).toFixed(0)}₺`}
            icon="cash-outline"
          />
          <StatCard
            label="Lifetime puan"
            value={c.lifetimePoints.toLocaleString("tr-TR")}
            icon="trending-up-outline"
          />
        </View>

        {/* Kurallar */}
        <View className="mt-5 rounded-2xl border border-border-light p-4">
          <Text className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
            Nasıl çalışır?
          </Text>
          <View className="mt-2">
            <Rule icon="trending-up" text={data.pointsRules.earnRate} />
            <Rule icon="cash" text={data.pointsRules.redeemRate} />
            <Rule
              icon="information-circle"
              text={`Min ${data.pointsRules.minRedemption} puan kullanabilirsin`}
            />
          </View>
        </View>

        {/* History */}
        <View className="mt-5">
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground-muted">
            Puan geçmişi
          </Text>
          {history.length === 0 ? (
            <View className="items-center rounded-2xl bg-surface px-4 py-8">
              <Text className="text-sm text-foreground-muted">
                Henüz puan hareketi yok
              </Text>
            </View>
          ) : (
            history.map((tx) => (
              <View
                key={tx.id}
                className="mb-2 flex-row items-center rounded-2xl border border-border-light bg-white p-3"
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    tx.points > 0 ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <Ionicons
                    name={tx.points > 0 ? "arrow-up" : "arrow-down"}
                    size={18}
                    color={tx.points > 0 ? "#10b981" : "#ef4444"}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                    {tx.description ?? typeLabel(tx.type)}
                  </Text>
                  <Text className="text-xs text-foreground-muted">
                    {new Date(tx.createdAt).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <Text
                  className={`text-base font-extrabold ${
                    tx.points > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tx.points > 0 ? "+" : ""}
                  {tx.points}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-border-light bg-white p-3">
      <Ionicons name={icon} size={16} color="#6b6b6b" />
      <Text className="mt-1 text-base font-extrabold text-foreground">
        {value}
      </Text>
      <Text className="text-[10px] text-foreground-muted">{label}</Text>
    </View>
  );
}

function Rule({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View className="mb-1 flex-row items-center">
      <Ionicons name={icon} size={14} color="#6b6b6b" />
      <Text className="ml-2 flex-1 text-xs text-foreground-muted">{text}</Text>
    </View>
  );
}

function typeLabel(t: string): string {
  switch (t) {
    case "EARN":
      return "Puan kazanım";
    case "SPEND":
      return "Puan kullanımı";
    case "BONUS":
      return "Bonus puan";
    case "EXPIRE":
      return "Süresi dolan puan";
    case "ADJUSTMENT":
      return "Düzeltme";
    default:
      return t;
  }
}
