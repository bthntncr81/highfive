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
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="ml-3 flex-1 text-lg font-extrabold text-foreground">
          🎁 Sürpriz Kutular
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-4 rounded-2xl bg-purple-50 border border-purple-200 p-3">
          <Text className="text-[11px] font-bold uppercase tracking-wide text-purple-800">
            Puan harca, sürpriz kazan
          </Text>
          <Text className="mt-1 text-sm text-purple-900">
            Kazanılan puanlarınla farklı seviyelerde sürpriz kutular açarak indirim, bonus puan veya özel hediye kazanabilirsin.
          </Text>
        </View>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#8b5cf6" />
          </View>
        ) : boxes.length === 0 ? (
          <View className="items-center rounded-2xl bg-surface p-8">
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text className="mt-3 text-base font-bold text-foreground">
              Şu an açık kutu yok
            </Text>
            <Text className="mt-1 text-center text-xs text-foreground-muted">
              Yöneticiler kutuları aktive ettiğinde burada görünür
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {boxes.map((box) => (
              <Pressable
                key={box.id}
                onPress={() => handleOpen(box)}
                disabled={!!openingBoxId}
                className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-4"
              >
                <View className="flex-row items-center">
                  <Animated.View style={openingBoxId === box.id ? boxAnim : undefined}>
                    <Text style={{ fontSize: 56 }}>{box.emoji}</Text>
                  </Animated.View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-extrabold text-purple-900">
                      {box.name}
                    </Text>
                    {box.description && (
                      <Text className="text-xs text-purple-700 mt-0.5">
                        {box.description}
                      </Text>
                    )}
                    <View className="mt-2 flex-row items-center gap-1">
                      {box.prizes.slice(0, 5).map((p, i) => (
                        <View
                          key={i}
                          className="rounded-full bg-white/80 px-1.5 py-0.5"
                        >
                          <Text className="text-[10px]">{p.emoji ?? "🎁"}</Text>
                        </View>
                      ))}
                      {box.prizes.length > 5 && (
                        <Text className="text-[10px] text-purple-700">
                          +{box.prizes.length - 5}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-[11px] text-purple-700">
                    {box.prizes.length} farklı ödül
                  </Text>
                  <View className="rounded-full bg-purple-500 px-4 py-2">
                    <Text className="text-sm font-extrabold text-white">
                      {openingBoxId === box.id
                        ? "Açılıyor..."
                        : `${box.pointsCost} puan → AÇ`}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sonuç modal */}
      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => setResult(null)}>
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View
            className="w-full rounded-3xl p-6"
            style={{
              backgroundColor: result?.prizeType === "NOTHING" ? "#6b7280" : "#8b5cf6",
            }}
          >
            <Text className="text-center text-6xl mt-2">
              {result?.prizeType === "NOTHING" ? "😔" : "🎉"}
            </Text>
            <Text className="mt-4 text-center text-2xl font-extrabold text-white">
              {result?.prizeLabel}
            </Text>
            {result && result.prizeType !== "NOTHING" && (
              <Text className="mt-1 text-center text-xs text-white/80">
                {result.prizeType === "DISCOUNT_PERCENT" || result.prizeType === "DISCOUNT_FIXED"
                  ? "Kuponun otomatik oluşturuldu, 7 gün geçerli"
                  : result.prizeType === "POINTS"
                    ? "Puanlar hesabına eklendi"
                    : "Ödül hesabında"}
              </Text>
            )}
            <Pressable
              onPress={() => {
                setResult(null);
                refresh();
              }}
              className="mt-5 rounded-full bg-white px-6 py-3"
            >
              <Text
                className="text-center text-base font-extrabold"
                style={{
                  color: result?.prizeType === "NOTHING" ? "#374151" : "#8b5cf6",
                }}
              >
                Tamam
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
