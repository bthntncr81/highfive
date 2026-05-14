// Sürpriz Kutu (Mystery Box) — puan harcayarak rastgele ödül.
// Backend /api/games/mysterybox/list + /open ile çalışır.
// Açma animasyonu: kutu sallanma + scale, sonra ödül belirir.

import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

import { endpoints } from "@/lib/api";

type Box = {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  pointsCost: number;
  prizes: Array<{ label: string; type: string; emoji: string | null }>;
};

export default function MysteryBoxPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingBoxId, setOpeningBoxId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    prizeLabel: string;
    prizeType: string;
    prizeValue: number | null;
  } | null>(null);

  const shake = useSharedValue(0);
  const scale = useSharedValue(1);

  const refresh = async () => {
    try {
      const r = await endpoints.gameMysteryBoxList();
      setBoxes(r.boxes);
    } catch {
      setBoxes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleOpen = async (box: Box) => {
    Alert.alert(
      `${box.emoji} ${box.name}`,
      `${box.pointsCost} puan harcayarak bu kutuyu açmak istiyor musun?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Aç!",
          onPress: () => doOpen(box),
        },
      ],
    );
  };

  const doOpen = async (box: Box) => {
    setOpeningBoxId(box.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Sallanma + scale animasyonu (~2 saniye)
    shake.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 80, easing: Easing.linear }),
        withTiming(15, { duration: 80, easing: Easing.linear }),
      ),
      12,
      true,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(0.95, { duration: 200 }),
      ),
      5,
      true,
    );

    try {
      const r = await endpoints.gameMysteryBoxOpen(box.id);
      setTimeout(() => {
        shake.value = withSpring(0);
        scale.value = withSpring(1);
        runOnJS(showResult)(r.open);
      }, 1900);
    } catch (e: any) {
      shake.value = withSpring(0);
      scale.value = withSpring(1);
      setOpeningBoxId(null);
      Alert.alert("Açılamadı", e?.message ?? "Yetersiz puan ya da hata.");
    }
  };

  const showResult = (open: {
    prizeLabel: string;
    prizeType: string;
    prizeValue: number | null;
  }) => {
    setResult(open);
    setOpeningBoxId(null);
    if (open.prizeType === "NOTHING") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const boxAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: scale.value }],
  }));

  return (
    <SafeAreaView edges={["top"]} className="flex-1" style={{ backgroundColor: "#0f172a" }}>
      {/* Üst başlık — koyu navy, çark/teaser ile tutarlı */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text style={{ color: "#fbbf24", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }}>
            ÖDÜL OYUNLARI
          </Text>
          <Text className="text-xl font-extrabold text-white">
            🎁 Sürpriz Kutular
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        style={{ backgroundColor: "#f8fafc" }}
        className="flex-1 rounded-t-3xl"
      >
        {/* Bilgi kart — altın aksanlı */}
        <View
          className="mb-5 rounded-2xl p-4"
          style={{ backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fcd34d" }}
        >
          <View className="flex-row items-center mb-1">
            <Text style={{ fontSize: 18 }}>⭐</Text>
            <Text className="ml-2 text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Puan Harca, Sürpriz Kazan
            </Text>
          </View>
          <Text className="text-sm text-amber-900 leading-5">
            Puanlarını harcayarak farklı seviyelerde sürpriz kutular aç —
            indirim, bonus puan veya özel hediye kazan.
          </Text>
        </View>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#0f172a" size="large" />
          </View>
        ) : boxes.length === 0 ? (
          <View className="items-center rounded-2xl bg-white p-10 border border-gray-200">
            <Text style={{ fontSize: 56 }}>📦</Text>
            <Text className="mt-4 text-base font-extrabold text-foreground">
              Şu an açık kutu yok
            </Text>
            <Text className="mt-1 text-center text-xs text-foreground-muted">
              Yöneticiler kutuları aktive ettiğinde burada görünür
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {boxes.map((box) => {
              const opening = openingBoxId === box.id;
              return (
                <Pressable
                  key={box.id}
                  onPress={() => handleOpen(box)}
                  disabled={!!openingBoxId}
                  className="overflow-hidden rounded-3xl bg-white"
                  style={{
                    elevation: 4,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    borderWidth: opening ? 2 : 1,
                    borderColor: opening ? "#fbbf24" : "#e5e7eb",
                  }}
                >
                  {/* Üst — koyu navy şerit, kutu emoji */}
                  <View
                    className="px-5 py-4 flex-row items-center"
                    style={{ backgroundColor: "#0f172a" }}
                  >
                    <Animated.View style={opening ? boxAnim : undefined}>
                      <Text style={{ fontSize: 56 }}>{box.emoji}</Text>
                    </Animated.View>
                    <View className="ml-4 flex-1">
                      <Text className="text-lg font-extrabold text-white">
                        {box.name}
                      </Text>
                      {box.description && (
                        <Text className="text-[11px] text-white/70 mt-0.5" numberOfLines={2}>
                          {box.description}
                        </Text>
                      )}
                    </View>
                    {/* Puan badge */}
                    <View
                      className="rounded-full px-3 py-2 ml-2"
                      style={{ backgroundColor: "#fbbf24" }}
                    >
                      <Text className="text-xs font-extrabold" style={{ color: "#0f172a" }}>
                        {box.pointsCost} ⭐
                      </Text>
                    </View>
                  </View>

                  {/* Alt — ödül önizleme + AÇ butonu */}
                  <View className="px-5 py-4">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                      İçinden çıkabilecek {box.prizes.length} ödül
                    </Text>
                    <View className="flex-row items-center mb-3" style={{ gap: 6 }}>
                      {box.prizes.slice(0, 6).map((p, i) => (
                        <View
                          key={i}
                          className="rounded-full px-2 py-1"
                          style={{ backgroundColor: "#fef3c7" }}
                        >
                          <Text style={{ fontSize: 14 }}>{p.emoji ?? "🎁"}</Text>
                        </View>
                      ))}
                      {box.prizes.length > 6 && (
                        <Text className="text-[11px] font-bold text-gray-500">
                          +{box.prizes.length - 6}
                        </Text>
                      )}
                    </View>
                    <View
                      className="rounded-full py-3 items-center"
                      style={{
                        backgroundColor: opening ? "#94a3b8" : "#0f172a",
                      }}
                    >
                      <Text className="text-sm font-extrabold text-white">
                        {opening ? "🌀 Açılıyor..." : "🎁  KUTUYU AÇ"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Sonuç modal — wheel/teaser ile aynı dil */}
      <Modal
        visible={!!result}
        transparent
        animationType="fade"
        onRequestClose={() => setResult(null)}
      >
        <View
          className="flex-1 items-center justify-center px-5"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
        >
          {/* Sağ üst kapatma */}
          <Pressable
            onPress={() => {
              setResult(null);
              refresh();
            }}
            hitSlop={16}
            className="absolute right-5 top-12 h-12 w-12 items-center justify-center rounded-full bg-white"
            style={{
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
            }}
          >
            <Ionicons name="close" size={26} color="#1a1a1a" />
          </Pressable>

          <View
            className="w-full max-w-md rounded-3xl bg-white overflow-hidden"
            style={{
              elevation: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}
          >
            <View
              className="px-5 pt-6 pb-4 items-center"
              style={{ backgroundColor: "#0f172a" }}
            >
              <Text style={{ fontSize: 32 }}>
                {result?.prizeType === "NOTHING" ? "📦" : "🎁"}
              </Text>
              <Text className="mt-1 text-xl font-extrabold text-white">
                {result?.prizeType === "NOTHING" ? "Kutu Boş Çıktı" : "Kutu Açıldı!"}
              </Text>
            </View>

            <View className="py-10 items-center px-6">
              <Text style={{ fontSize: 80 }}>
                {result?.prizeType === "NOTHING" ? "😔" : "🎉"}
              </Text>
              <Text className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-foreground-muted">
                {result?.prizeType === "NOTHING" ? "Maalesef" : "Kazandığın"}
              </Text>
              <Text className="mt-1 text-center text-3xl font-extrabold text-foreground">
                {result?.prizeLabel}
              </Text>

              {result && result.prizeType !== "NOTHING" && (
                <View
                  className="mt-4 rounded-xl border px-4 py-2"
                  style={{
                    backgroundColor:
                      result.prizeType === "POINTS" ? "#dbeafe" : "#d1fae5",
                    borderColor:
                      result.prizeType === "POINTS" ? "#93c5fd" : "#86efac",
                  }}
                >
                  <Text
                    className="text-xs font-semibold text-center"
                    style={{
                      color: result.prizeType === "POINTS" ? "#1e40af" : "#065f46",
                    }}
                  >
                    {result.prizeType === "DISCOUNT_PERCENT" ||
                    result.prizeType === "DISCOUNT_FIXED"
                      ? "🎁 Kuponun hesabında — 7 gün geçerli"
                      : result.prizeType === "POINTS"
                        ? "⭐ Puanlar hesabına eklendi"
                        : "Ödülün hesabında"}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={() => {
                  setResult(null);
                  refresh();
                }}
                className="mt-6 rounded-full px-10 py-3"
                style={{ backgroundColor: "#0f172a" }}
              >
                <Text className="text-base font-extrabold text-white">
                  {result?.prizeType === "NOTHING" ? "Tamam" : "Harika!"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
