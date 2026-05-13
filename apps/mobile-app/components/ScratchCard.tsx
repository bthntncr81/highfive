// Kazı Kazan kartı — sipariş sonrası ödül kazandırır.
// Backend /api/games/scratch/issue/:orderId ile kart oluşturulur (server outcome).
// Müşteri parmakla kartın üstündeki "kazıma katmanı"nı çıkarır → ödül belirir.
//
// Gerçek pixel-mask için react-native-skia gerekir; biz pratik bir alternatif
// kullanıyoruz: 5 ayrı şerit (cover panel), kullanıcı her birine tap eder →
// opacity 1→0 animasyonu. Tüm şeritler açılınca card kazıldı sayılır + API
// /scratch/:id/scratch çağrılır (idempotent).

import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { endpoints } from "@/lib/api";

const STRIPES = 5;

type Reward = {
  id: string;
  prizeType: string; // DISCOUNT_PERCENT, POINTS, NOTHING
  prizeLabel: string;
  prizeValue: number | null;
  couponId: string | null;
  scratchedAt: string | null;
};

function PrizeContent({ reward }: { reward: Reward }) {
  const isNothing = reward.prizeType === "NOTHING";
  return (
    <View className="items-center justify-center">
      <Text style={{ fontSize: 48 }}>
        {isNothing
          ? "😔"
          : reward.prizeType === "POINTS"
            ? "⭐"
            : "🎉"}
      </Text>
      <Text
        className={`mt-2 text-center text-2xl font-extrabold ${
          isNothing ? "text-gray-500" : "text-amber-700"
        }`}
      >
        {reward.prizeLabel}
      </Text>
      {!isNothing && reward.prizeType === "DISCOUNT_PERCENT" && (
        <Text className="mt-1 text-center text-[11px] text-amber-700/80">
          Kupon hesabında — 7 gün geçerli
        </Text>
      )}
      {!isNothing && reward.prizeType === "POINTS" && (
        <Text className="mt-1 text-center text-[11px] text-amber-700/80">
          Puanlar hesabına eklendi
        </Text>
      )}
    </View>
  );
}

function ScratchStripe({
  index,
  onScratched,
}: {
  index: number;
  onScratched: () => void;
}) {
  const opacity = useSharedValue(1);
  const [hidden, setHidden] = useState(false);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handleScratch = () => {
    if (hidden) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    opacity.value = withTiming(
      0,
      { duration: 300, easing: Easing.out(Easing.ease) },
    );
    setHidden(true);
    setTimeout(() => onScratched(), 320);
  };

  // Renk çeşitlemesi
  const colors = ["#9ca3af", "#a3a3a3", "#9ca3af", "#a3a3a3", "#9ca3af"];
  const bg = colors[index % colors.length];

  return (
    <Pressable
      onPress={handleScratch}
      style={{
        flex: 1,
        marginHorizontal: 1,
        height: "100%",
      }}
    >
      <Animated.View
        style={[
          animStyle,
          {
            flex: 1,
            backgroundColor: bg,
            borderRadius: 4,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text style={{ fontSize: 20 }}>🪙</Text>
      </Animated.View>
    </Pressable>
  );
}

export function ScratchCard({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose?: () => void;
}) {
  const [reward, setReward] = useState<Reward | null>(null);
  const [loading, setLoading] = useState(true);
  const [scratchedCount, setScratchedCount] = useState(0);
  const allDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    endpoints
      .gameScratchIssue(orderId)
      .then((r) => {
        if (cancelled) return;
        setReward(r.reward ?? null);
      })
      .catch(() => setReward(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Tüm şeritler açıldı → backend'e işaretle + success haptic
  useEffect(() => {
    if (!reward || allDone.current) return;
    if (scratchedCount >= STRIPES) {
      allDone.current = true;
      Haptics.notificationAsync(
        reward.prizeType === "NOTHING"
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      );
      endpoints.gameScratchOpen(reward.id).catch(() => {});
    }
  }, [scratchedCount, reward]);

  if (loading) {
    return (
      <View className="my-4 rounded-2xl bg-amber-50 p-5">
        <Text className="text-center text-sm text-amber-800">
          Sürpriz hazırlanıyor...
        </Text>
      </View>
    );
  }

  if (!reward) return null;

  const showPrize = scratchedCount >= STRIPES;

  return (
    <View className="my-4 overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50">
      <View className="flex-row items-center justify-between px-4 py-3 bg-amber-100 border-b border-amber-200">
        <View className="flex-row items-center">
          <Text style={{ fontSize: 20 }}>🎁</Text>
          <Text className="ml-2 text-sm font-extrabold text-amber-900">
            Kazı Kazan Kartın!
          </Text>
        </View>
        {onClose && (
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={18} color="#92400e" />
          </Pressable>
        )}
      </View>

      <View className="p-5">
        <Text className="text-center text-[11px] text-amber-800 mb-3">
          {showPrize
            ? "🎊 Sürprizi açtın!"
            : "🪙 Parmağınla şeritleri kazı — sürpriz altında saklı"}
        </Text>

        {/* Kart altında ödül */}
        <View
          className="rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 p-4 items-center justify-center"
          style={{ minHeight: 160, backgroundColor: "#fef3c7" }}
        >
          <PrizeContent reward={reward} />

          {/* Üstündeki kazıma katmanı — şerit'ler */}
          {!showPrize && (
            <View
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                right: 8,
                bottom: 8,
                flexDirection: "row",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {Array.from({ length: STRIPES }).map((_, i) => (
                <ScratchStripe
                  key={i}
                  index={i}
                  onScratched={() => setScratchedCount((c) => c + 1)}
                />
              ))}
            </View>
          )}
        </View>

        {!showPrize && (
          <Text className="mt-3 text-center text-[10px] text-amber-700">
            {scratchedCount} / {STRIPES} şerit açıldı
          </Text>
        )}
      </View>
    </View>
  );
}
