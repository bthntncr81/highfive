// Haftalık Liderlik Tablosu — en çok puan kazanan top 10 müşteri (anonim).
// Auth varsa kullanıcının kendi sırası da gösterilir.

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

import { endpoints } from "@/lib/api";

const RANK_BG: Record<number, string> = {
  1: "#fef3c7",
  2: "#e5e7eb",
  3: "#fed7aa",
};
const RANK_TEXT: Record<number, string> = {
  1: "#92400e",
  2: "#374151",
  3: "#9a3412",
};
const RANK_ICON: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export default function Leaderboard() {
  const [data, setData] = useState<{
    weekStart: string;
    myRank: number | null;
    myPoints: number;
    leaderboard: Array<{
      rank: number;
      name: string;
      points: number;
      tier: { name: string; icon: string | null; color: string | null } | null;
      isMe: boolean;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const r = await endpoints.gameLeaderboard();
      setData(r);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="ml-3 flex-1 text-lg font-extrabold text-foreground">
          🏆 Haftalık Liderlik
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {/* Açıklama */}
        <View className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-3">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
            Bu Hafta
          </Text>
          <Text className="mt-1 text-sm text-amber-900">
            En çok puan kazanan top 10 müşteri. Sıralama her gün güncellenir.
            İsimler gizlilik için anonim gösterilir.
          </Text>
        </View>

        {/* Kullanıcının kendi sırası */}
        {data?.myRank && (
          <View className="mb-4 rounded-2xl bg-primary-500 p-4">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-white/80">
              Senin sıran
            </Text>
            <View className="mt-1 flex-row items-baseline justify-between">
              <Text className="text-3xl font-extrabold text-white">
                #{data.myRank}
              </Text>
              <Text className="text-base font-bold text-white">
                {data.myPoints.toLocaleString("tr-TR")} puan
              </Text>
            </View>
            {data.myRank > 10 && (
              <Text className="mt-1 text-xs text-white/85">
                Top 10'a girmek için daha fazla puan kazan!
              </Text>
            )}
          </View>
        )}

        {loading && !data ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#bb1e10" />
          </View>
        ) : !data || data.leaderboard.length === 0 ? (
          <View className="items-center rounded-2xl bg-surface p-8">
            <Text style={{ fontSize: 48 }}>🏆</Text>
            <Text className="mt-3 text-base font-bold text-foreground">
              Bu hafta henüz veri yok
            </Text>
            <Text className="mt-1 text-center text-xs text-foreground-muted">
              İlk sipariş veren sen ol, listede ol!
            </Text>
          </View>
        ) : (
          <View className="space-y-2">
            {data.leaderboard.map((entry) => {
              const bg = RANK_BG[entry.rank] ?? "#f9fafb";
              const text = RANK_TEXT[entry.rank] ?? "#1f2937";
              const icon = RANK_ICON[entry.rank] ?? `#${entry.rank}`;
              return (
                <View
                  key={entry.rank}
                  className="flex-row items-center rounded-2xl p-3"
                  style={{ backgroundColor: bg }}
                >
                  <View className="w-12 items-center">
                    <Text
                      style={{ color: text, fontSize: entry.rank <= 3 ? 26 : 16 }}
                      className="font-extrabold"
                    >
                      {icon}
                    </Text>
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-sm font-bold" style={{ color: text }}>
                      {entry.name}
                    </Text>
                    {entry.tier && (
                      <Text className="text-[10px] mt-0.5" style={{ color: text, opacity: 0.7 }}>
                        {entry.tier.icon ?? "🏅"} {entry.tier.name}
                      </Text>
                    )}
                  </View>
                  <Text className="text-base font-extrabold" style={{ color: text }}>
                    {entry.points.toLocaleString("tr-TR")}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
