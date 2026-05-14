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
    <View className="items-center justify-center px-3">
      <Text style={{ fontSize: 56 }}>
        {isNothing
          ? "😔"
          : reward.prizeType === "POINTS"
            ? "⭐"
            : "🎉"}
      </Text>
      <Text
        className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest"
        style={{ color: isNothing ? "#6b7280" : "#0f172a" }}
      >
        {isNothing ? "Maalesef" : "Kazandın"}
      </Text>
      <Text
        className="mt-1 text-center text-2xl font-extrabold leading-tight"
        style={{ color: isNothing ? "#374151" : "#0f172a" }}
        numberOfLines={2}
      >
        {reward.prizeLabel}
      </Text>
      {!isNothing && reward.prizeType === "DISCOUNT_PERCENT" && (
        <View
          className="mt-3 rounded-full px-3 py-1"
          style={{ backgroundColor: "#0f172a" }}
        >
          <Text className="text-[10px] font-bold text-white">
            🎁 Kupon · 7 gün geçerli
          </Text>
        </View>
      )}
      {!isNothing && reward.prizeType === "POINTS" && (
        <View
          className="mt-3 rounded-full px-3 py-1"
          style={{ backgroundColor: "#0f172a" }}
        >
          <Text className="text-[10px] font-bold text-white">
            ⭐ Puanlar hesabında
          </Text>
        </View>
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

  // Altın metalik şerit görünümü — gümüş yerine sıcak amber tonlar
  const gradients = [
    { bg: "#d97706", inner: "#fbbf24" },
    { bg: "#b45309", inner: "#f59e0b" },
    { bg: "#d97706", inner: "#fbbf24" },
    { bg: "#b45309", inner: "#f59e0b" },
    { bg: "#d97706", inner: "#fbbf24" },
  ];
  const colors = gradients[index % gradients.length];

  return (
    <Pressable
      onPress={handleScratch}
      style={{
        flex: 1,
        marginHorizontal: 2,
        height: "100%",
      }}
    >
      <Animated.View
        style={[
          animStyle,
          {
            flex: 1,
            backgroundColor: colors.bg,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.inner,
          },
        ]}
      >
        {/* Altın metalik vurgu */}
        <View
          style={{
            position: "absolute",
            top: "20%",
            left: "10%",
            right: "10%",
            height: 2,
            backgroundColor: colors.inner,
            opacity: 0.6,
            borderRadius: 1,
          }}
        />
        <Text style={{ fontSize: 22 }}>🪙</Text>
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
      <View
        className="my-4 rounded-3xl p-6 items-center"
        style={{ backgroundColor: "#0f172a" }}
      >
        <Text style={{ fontSize: 32 }}>🎁</Text>
        <Text className="mt-2 text-center text-sm font-bold text-white">
          Sürpriz hazırlanıyor...
        </Text>
      </View>
    );
  }

  if (!reward) return null;

  const showPrize = scratchedCount >= STRIPES;

  return (
    <View
      className="my-4 overflow-hidden rounded-3xl"
      style={{
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#fcd34d",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      }}
    >
      {/* Üst başlık — koyu navy + altın aksanı */}
      <View
        className="flex-row items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#0f172a" }}
      >
        <View className="flex-row items-center">
          <Text style={{ fontSize: 20 }}>🎉</Text>
          <View className="ml-2">
            <Text style={{ color: "#fbbf24", fontSize: 9, fontWeight: "800", letterSpacing: 1.2 }}>
              SİPARİŞ HEDİYESİ
            </Text>
            <Text className="text-sm font-extrabold text-white">
              Kazı Kazan Kartın
            </Text>
          </View>
        </View>
        {onClose && (
          <Pressable
            onPress={onClose}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        )}
      </View>

      <View className="p-5">
        <Text
          className="text-center text-[11px] mb-3 font-semibold"
          style={{ color: showPrize ? "#0f172a" : "#92400e" }}
        >
          {showPrize
            ? "🎊 Sürprizi açtın!"
            : "🪙 Şeritlere dokun — sürpriz altında saklı"}
        </Text>

        {/* Kart altında ödül */}
        <View
          className="rounded-2xl p-4 items-center justify-center"
          style={{
            minHeight: 180,
            backgroundColor: "#fef3c7",
            borderWidth: 1,
            borderColor: "#fcd34d",
          }}
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
                borderRadius: 14,
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
          <View className="mt-4 flex-row items-center justify-center" style={{ gap: 4 }}>
            {Array.from({ length: STRIPES }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 24,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i < scratchedCount ? "#0f172a" : "#e5e7eb",
                }}
              />
            ))}
            <Text className="ml-2 text-[10px] font-bold text-foreground-muted">
              {scratchedCount}/{STRIPES}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
