// Şans Çarkı (Spin Wheel) — modern, temiz UI.
// Backend /api/games/spin/config + /api/games/spin/play kullanır.
// SVG dilimler + üzerine absolute positioned View label'lar (daha temiz tipografi).

import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import Svg, { G, Path, Circle as SvgCircle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { endpoints } from "@/lib/api";

type Slice = {
  label: string;
  type: string;
  value: number;
  color: string;
  emoji?: string | null;
};

type Config = {
  id: string;
  name: string;
  description: string | null;
  cooldownHours: number;
  minCartTotal: number;
  slices: Slice[];
  canSpin?: boolean;
  nextSpinAt?: string | null;
};

const { width: SCREEN_W } = Dimensions.get("window");
const WHEEL_SIZE = Math.min(SCREEN_W - 80, 320);
const RADIUS = WHEEL_SIZE / 2;
const INNER_RADIUS = RADIUS * 0.32; // merkez disk

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Şimdi";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours >= 1) return `${hours} saat ${minutes} dakika`;
  if (minutes >= 1) return `${minutes} dakika`;
  return "az kaldı";
}

export function SpinWheel({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{
    prizeLabel: string;
    prizeType: string;
    prizeValue: number;
  } | null>(null);

  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    setResult(null);
    setLoading(true);
    rotation.value = 0;
    endpoints.gameSpinConfig()
      .then((r) => setConfig(r.config as any))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSpin = async () => {
    if (!config || spinning) return;
    setSpinning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const res = await endpoints.gameSpinPlay();
      const prizeIndex = res.attempt.prizeIndex;
      const sliceCount = config.slices.length;
      const anglePerSlice = 360 / sliceCount;
      const targetAngle = -(prizeIndex * anglePerSlice + anglePerSlice / 2);
      const finalRotation = 360 * 6 + targetAngle;

      rotation.value = withTiming(
        finalRotation,
        { duration: 4500, easing: Easing.out(Easing.cubic) },
        () => {
          runOnJS(showResult)({
            prizeLabel: res.attempt.prizeLabel,
            prizeType: res.attempt.prizeType,
            prizeValue: res.attempt.prizeValue ?? 0,
          });
        },
      );
    } catch (e: any) {
      setSpinning(false);
      Alert.alert("Çark çevirilemedi", e?.message ?? "Bir hata oluştu");
    }
  };

  const showResult = (r: { prizeLabel: string; prizeType: string; prizeValue: number }) => {
    setResult(r);
    setSpinning(false);
    if (r.prizeType === "NOTHING" || r.prizeType === "TRY_AGAIN") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const sliceCount = config?.slices?.length ?? 0;
  const anglePerSlice = sliceCount > 0 ? 360 / sliceCount : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      >
        {/* Sağ üst kapatma butonu */}
        <Pressable
          onPress={onClose}
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

        {/* İçerik kart */}
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
          {/* Üst başlık — minimal */}
          <View
            className="px-5 pt-6 pb-4 items-center"
            style={{ backgroundColor: "#0f172a" }}
          >
            <Text style={{ fontSize: 32 }}>🎡</Text>
            <Text className="mt-1 text-xl font-extrabold text-white">
              Şans Çarkı
            </Text>
            {config && config.canSpin !== false && (
              <Text className="mt-1 text-xs text-white/70">
                Bugün için tek hak — şansını dene
              </Text>
            )}
          </View>

          {loading ? (
            <View className="my-12 items-center">
              <ActivityIndicator color="#0f172a" size="large" />
            </View>
          ) : !config ? (
            <View className="py-12 items-center">
              <Text style={{ fontSize: 48 }}>😴</Text>
              <Text className="mt-3 text-base font-semibold text-foreground">
                Çark şu an aktif değil
              </Text>
            </View>
          ) : config.canSpin === false && config.nextSpinAt ? (
            // Cooldown
            <View className="py-10 items-center px-6">
              <Text style={{ fontSize: 64 }}>⏳</Text>
              <Text className="mt-4 text-center text-xl font-extrabold text-foreground">
                Bugünkü hakkını kullandın!
              </Text>
              <View className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 w-full">
                <Text className="text-center text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  Sonraki Çark
                </Text>
                <Text className="mt-1 text-center text-base font-bold text-amber-900">
                  {formatRemaining(
                    new Date(config.nextSpinAt).getTime() - Date.now(),
                  )}{" "}
                  sonra
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                className="mt-5 rounded-full px-8 py-3"
                style={{ backgroundColor: "#0f172a" }}
              >
                <Text className="text-base font-bold text-white">Tamam</Text>
              </Pressable>
            </View>
          ) : result ? (
            // Sonuç ekranı
            <View className="py-10 items-center px-6">
              <Text style={{ fontSize: 80 }}>
                {result.prizeType === "NOTHING" || result.prizeType === "TRY_AGAIN"
                  ? "😔"
                  : "🎉"}
              </Text>
              <Text className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-foreground-muted">
                Kazandığın
              </Text>
              <Text className="mt-1 text-center text-3xl font-extrabold text-foreground">
                {result.prizeLabel}
              </Text>
              {result.prizeType === "DISCOUNT_PERCENT" && (
                <View className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2">
                  <Text className="text-xs font-semibold text-emerald-800 text-center">
                    🎁 Kupon hesabında — 7 gün geçerli
                  </Text>
                </View>
              )}
              {result.prizeType === "POINTS" && (
                <View className="mt-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2">
                  <Text className="text-xs font-semibold text-blue-800 text-center">
                    ⭐ Puan hesabına eklendi
                  </Text>
                </View>
              )}
              <Pressable
                onPress={onClose}
                className="mt-6 rounded-full px-10 py-3"
                style={{ backgroundColor: "#0f172a" }}
              >
                <Text className="text-base font-extrabold text-white">Harika!</Text>
              </Pressable>
            </View>
          ) : (
            <View className="py-6 items-center">
              {/* Çark + label overlay */}
              <View
                style={{
                  width: WHEEL_SIZE + 24,
                  height: WHEEL_SIZE + 24,
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {/* Ok (üstten aşağıya) */}
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    zIndex: 30,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 14,
                    borderRightWidth: 14,
                    borderTopWidth: 22,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: "#0f172a",
                  }}
                />
                {/* Ok altı küçük halka */}
                <View
                  style={{
                    position: "absolute",
                    top: 16,
                    zIndex: 31,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: "#0f172a",
                    borderWidth: 2,
                    borderColor: "#fff",
                  }}
                />

                {/* Çark — animated container */}
                <Animated.View
                  style={[
                    wheelStyle,
                    {
                      width: WHEEL_SIZE,
                      height: WHEEL_SIZE,
                    },
                  ]}
                >
                  <Svg
                    width={WHEEL_SIZE}
                    height={WHEEL_SIZE}
                    style={{ position: "absolute", top: 0, left: 0 }}
                  >
                    <Defs>
                      <RadialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
                        <Stop offset="90%" stopColor="#fbbf24" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#d97706" stopOpacity="1" />
                      </RadialGradient>
                    </Defs>

                    {/* Dış halka (altın) */}
                    <SvgCircle
                      cx={RADIUS}
                      cy={RADIUS}
                      r={RADIUS}
                      fill="url(#ringGrad)"
                    />
                    {/* İç dilim alanı */}
                    <SvgCircle
                      cx={RADIUS}
                      cy={RADIUS}
                      r={RADIUS - 8}
                      fill="#ffffff"
                    />

                    {/* Dilimler */}
                    <G>
                      {config.slices.map((slice, i) => {
                        const startAngle = i * anglePerSlice;
                        const endAngle = startAngle + anglePerSlice;
                        return (
                          <Path
                            key={i}
                            d={describeArc(
                              RADIUS,
                              RADIUS,
                              RADIUS - 8,
                              startAngle,
                              endAngle,
                            )}
                            fill={slice.color}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        );
                      })}
                    </G>
                  </Svg>

                  {/* Label overlay — absolute View'lerde tipografi temiz */}
                  {config.slices.map((slice, i) => {
                    const midAngle = i * anglePerSlice + anglePerSlice / 2;
                    const labelRadius = RADIUS * 0.66;
                    const labelPos = polarToCartesian(RADIUS, RADIUS, labelRadius, midAngle);
                    return (
                      <View
                        key={`label-${i}`}
                        style={{
                          position: "absolute",
                          left: labelPos.x - 36,
                          top: labelPos.y - 32,
                          width: 72,
                          height: 64,
                          alignItems: "center",
                          justifyContent: "center",
                          transform: [{ rotate: `${midAngle}deg` }],
                        }}
                      >
                        <Text style={{ fontSize: 24, lineHeight: 26 }}>
                          {slice.emoji ?? "🎁"}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "800",
                            color: "#fff",
                            textAlign: "center",
                            marginTop: 2,
                            textShadowColor: "rgba(0,0,0,0.5)",
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 2,
                          }}
                          numberOfLines={2}
                        >
                          {slice.label}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Merkez disk (sabit, çark döndüğünde de döner — ama küçük olduğu için fark etmez) */}
                  <View
                    style={{
                      position: "absolute",
                      top: RADIUS - INNER_RADIUS,
                      left: RADIUS - INNER_RADIUS,
                      width: INNER_RADIUS * 2,
                      height: INNER_RADIUS * 2,
                      borderRadius: INNER_RADIUS,
                      backgroundColor: "#0f172a",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 4,
                      borderColor: "#fbbf24",
                    }}
                  >
                    <Text style={{ fontSize: 28 }}>🎯</Text>
                  </View>
                </Animated.View>
              </View>

              {/* Çevir butonu */}
              <Pressable
                onPress={handleSpin}
                disabled={spinning}
                className="mt-4 rounded-full px-12 py-4"
                style={{
                  backgroundColor: spinning ? "#94a3b8" : "#0f172a",
                  elevation: 6,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                }}
              >
                <Text className="text-center text-base font-extrabold text-white">
                  {spinning ? "🌀 Çevriliyor..." : "🎲  ÇEVİR"}
                </Text>
              </Pressable>
              <Text className="mt-3 text-[10px] text-foreground-muted">
                Sonuç tamamen rastgele — şansını dene
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
