// Rozetler / Achievements ekranı
// /api/games/achievements/me — kullanıcının kazandığı + kazanabileceği rozetler

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

type Ach = {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  rewardPoints: number;
  unlocked: boolean;
  unlockedAt: string | null;
  seenAt: string | null;
};

export default function Achievements() {
  const [data, setData] = useState<Ach[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const r = await endpoints.gameAchievementsMe();
      setData(r.achievements);
    } catch {
      // sessiz
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const unlockedCount = data.filter((a) => a.unlocked).length;
  const totalCount = data.length;
  const percent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

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
          🏅 Rozetlerim
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        {/* Progress summary */}
        {!loading && totalCount > 0 && (
          <View className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-bold text-amber-900">
                İlerlemen
              </Text>
              <Text className="text-sm font-extrabold text-amber-900">
                {unlockedCount} / {totalCount}
              </Text>
            </View>
            <View className="h-2 rounded-full bg-amber-200 overflow-hidden">
              <View
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${percent}%` }}
              />
            </View>
            <Text className="mt-2 text-[11px] text-amber-800">
              %{percent} tamamlandı
            </Text>
          </View>
        )}

        {loading && data.length === 0 ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#d97706" />
          </View>
        ) : data.length === 0 ? (
          <View className="items-center rounded-2xl bg-surface p-8">
            <Text style={{ fontSize: 48 }}>🏅</Text>
            <Text className="mt-3 text-base font-bold text-foreground">
              Henüz rozet yok
            </Text>
            <Text className="mt-1 text-center text-xs text-foreground-muted">
              Sipariş ver, streak yap, rozetleri topla!
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {data.map((a) => (
              <View
                key={a.id}
                className={`mb-3 w-[48%] rounded-2xl border p-3 ${
                  a.unlocked
                    ? "border-amber-300 bg-amber-50"
                    : "border-border-light bg-surface opacity-60"
                }`}
              >
                <Text
                  style={{
                    fontSize: 32,
                    opacity: a.unlocked ? 1 : 0.4,
                  }}
                >
                  {a.icon}
                </Text>
                <Text className="mt-2 text-sm font-bold text-foreground" numberOfLines={1}>
                  {a.name}
                </Text>
                <Text className="text-[10px] text-foreground-muted mt-0.5" numberOfLines={2}>
                  {a.description}
                </Text>
                {a.unlocked && a.unlockedAt && (
                  <Text className="mt-1 text-[10px] font-semibold text-amber-700">
                    ✓ {new Date(a.unlockedAt).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                )}
                {!a.unlocked && (
                  <View className="mt-2 rounded-full bg-foreground-subtle/20 px-2 py-0.5 self-start">
                    <Text className="text-[9px] font-bold text-foreground-subtle">
                      🔒 KİLİTLİ
                    </Text>
                  </View>
                )}
                {a.unlocked && a.rewardPoints > 0 && (
                  <Text className="mt-1 text-[10px] font-semibold text-emerald-700">
                    +{a.rewardPoints} puan
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
