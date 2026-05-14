// Şans Çarkı (Spin Wheel) — günde 1 kez açılır.
// Backend'ten config alır, kullanıcı çevirince /api/games/spin/play çağrılır.
// Çark animasyonu prizeIndex'e göre dönülür (server outcome'a senkron).

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
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

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Şimdi açılabilir";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours >= 1) return `${hours} saat ${minutes} dakika`;
  if (minutes >= 1) return `${minutes} dakika`;
  return "Birkaç saniye";
}

const WHEEL_SIZE = 280;
const RADIUS = WHEEL_SIZE / 2;

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
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);

  const rotation = useSharedValue(0);

  // Config yükle (modal açılınca)
  useEffect(() => {
    if (!visible) return;
    setResult(null);
    setCooldownEnd(null);
    setLoading(true);
    (endpoints as any).gameSpinConfig?.()
      .then((r: any) => setConfig(r.config))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [visible]);

  const handleSpin = async () => {
    if (!config || spinning) return;
    setSpinning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const res: any = await (endpoints as any).gameSpinPlay();
      const prizeIndex: number = res.attempt.prizeIndex;
      const sliceCount = config.slices.length;
      const anglePerSlice = 360 / sliceCount;
      // Ok yukarıyı gösterir; prizeIndex'in ortasına denk gelecek şekilde döndür
      const targetAngle = -(prizeIndex * anglePerSlice + anglePerSlice / 2);
      // 6 tam tur + hedef
      const finalRotation = 360 * 6 + targetAngle;

      rotation.value = withTiming(
        finalRotation,
        { duration: 4000, easing: Easing.out(Easing.cubic) },
        () => {
          // Animasyon bitince sonucu göster
          runOnJS(showResult)({
            prizeLabel: res.attempt.prizeLabel,
            prizeType: res.attempt.prizeType,
            prizeValue: res.attempt.prizeValue ?? 0,
          });
        },
      );
    } catch (e: any) {
      setSpinning(false);
      const msg = e?.message ?? "Bir hata oluştu";
      if (e?.code === 429 || /süre dolmadı/i.test(msg)) {
        // Cooldown — backend nextSpinAt döndürür
        const detail = e?.data ?? e;
        if (detail?.nextSpinAt) setCooldownEnd(new Date(detail.nextSpinAt));
        Alert.alert("Henüz erken!", "Yarın tekrar gel — günde 1 çark hakkın var.");
      } else {
        Alert.alert("Çark çevirilemedi", msg);
      }
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
      <View className="flex-1 items-center justify-center bg-black/80 px-5">
        {/* Kapatma butonu — sağ üstte belirgin */}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          className="absolute right-5 top-12 h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg"
          style={{ elevation: 6, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6 }}
        >
          <Ionicons name="close" size={24} color="#1a1a1a" />
        </Pressable>

        <View className="w-full rounded-3xl bg-gradient-to-b from-amber-400 to-amber-600 p-5" style={{ backgroundColor: "#d97706" }}>
          <Text className="text-center text-3xl font-extrabold text-white">
            🎡 Şans Çarkı
          </Text>
          {config && (
            <Text className="mt-1 text-center text-xs text-white/80">
              Günde 1 hak — şansını dene!
            </Text>
          )}

          {loading ? (
            <View className="my-10 items-center">
              <ActivityIndicator color="#fff" size="large" />
            </View>
          ) : !config ? (
            <Text className="my-10 text-center text-white">
              Şu an çark aktif değil.
            </Text>
          ) : config.canSpin === false && config.nextSpinAt ? (
            // Cooldown — kullanıcı bugün çevirmiş
            <View className="my-8 items-center">
              <Text style={{ fontSize: 56 }}>⏳</Text>
              <Text className="mt-3 text-center text-xl font-extrabold text-white">
                Bugünkü hakkını kullandın!
              </Text>
              <Text className="mt-2 text-center text-sm text-white/85">
                Bir sonraki çark:
              </Text>
              <Text className="mt-1 text-center text-base font-bold text-white">
                {new Date(config.nextSpinAt).toLocaleString("tr-TR", {
                  weekday: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text className="mt-2 text-center text-xs text-white/70">
                {formatRemaining(
                  new Date(config.nextSpinAt).getTime() - Date.now(),
                )}{" "}
                sonra tekrar gel
              </Text>
              <Pressable
                onPress={onClose}
                className="mt-5 rounded-full bg-white px-6 py-3"
              >
                <Text className="text-base font-bold text-amber-700">Tamam</Text>
              </Pressable>
            </View>
          ) : result ? (
            // Sonuç ekranı
            <View className="my-6 items-center">
              <Text className="text-5xl">
                {result.prizeType === "NOTHING" || result.prizeType === "TRY_AGAIN"
                  ? "😔"
                  : "🎉"}
              </Text>
              <Text className="mt-3 text-center text-2xl font-extrabold text-white">
                {result.prizeLabel}
              </Text>
              {result.prizeType === "DISCOUNT_PERCENT" && (
                <Text className="mt-1 text-center text-xs text-white/80">
                  Kuponun otomatik oluşturuldu, 7 gün geçerli
                </Text>
              )}
              {result.prizeType === "POINTS" && (
                <Text className="mt-1 text-center text-xs text-white/80">
                  Puanların hesabına eklendi
                </Text>
              )}
              <Pressable
                onPress={onClose}
                className="mt-5 rounded-full bg-white px-8 py-3"
              >
                <Text className="text-base font-extrabold text-amber-700">
                  Harika!
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Çark */}
              <View className="my-5 items-center" style={{ height: WHEEL_SIZE + 30 }}>
                {/* Ok (indicator) */}
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    zIndex: 10,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 14,
                    borderRightWidth: 14,
                    borderTopWidth: 20,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: "#fff",
                  }}
                />
                <Animated.View style={[wheelStyle, { marginTop: 15 }]}>
                  <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                    {/* Dış altın halka */}
                    <G>
                      <Path
                        d={`M ${RADIUS} ${RADIUS} m -${RADIUS} 0 a ${RADIUS} ${RADIUS} 0 1 0 ${RADIUS * 2} 0 a ${RADIUS} ${RADIUS} 0 1 0 -${RADIUS * 2} 0 Z`}
                        fill="#fbbf24"
                      />
                    </G>
                    <G>
                      {config.slices.map((slice, i) => {
                        const startAngle = i * anglePerSlice;
                        const endAngle = startAngle + anglePerSlice;
                        const midAngle = startAngle + anglePerSlice / 2;
                        const labelPos = polarToCartesian(
                          RADIUS,
                          RADIUS,
                          RADIUS * 0.65,
                          midAngle,
                        );
                        // Daha kısa label — emoji + ilk birkaç kelime
                        const shortLabel = slice.label.length > 9 ? slice.label.slice(0, 8) + "…" : slice.label;
                        return (
                          <G key={i}>
                            <Path
                              d={describeArc(
                                RADIUS,
                                RADIUS,
                                RADIUS - 4,
                                startAngle,
                                endAngle,
                              )}
                              fill={slice.color}
                              stroke="#fff"
                              strokeWidth={1.5}
                            />
                            {/* Emoji - büyük, dilim ortasında */}
                            <SvgText
                              x={labelPos.x}
                              y={labelPos.y - 8}
                              fill="#fff"
                              fontSize={20}
                              textAnchor="middle"
                              alignmentBaseline="middle"
                              transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y - 8})`}
                            >
                              {slice.emoji ?? ""}
                            </SvgText>
                            {/* Label - emoji altında küçük */}
                            <SvgText
                              x={labelPos.x}
                              y={labelPos.y + 12}
                              fill="#fff"
                              fontSize={9}
                              fontWeight="bold"
                              textAnchor="middle"
                              alignmentBaseline="middle"
                              transform={`rotate(${midAngle}, ${labelPos.x}, ${labelPos.y + 12})`}
                            >
                              {shortLabel}
                            </SvgText>
                          </G>
                        );
                      })}
                    </G>
                  </Svg>
                </Animated.View>
                {/* Merkez */}
                <View
                  style={{
                    position: "absolute",
                    top: WHEEL_SIZE / 2 - 5,
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: "#fff",
                    borderWidth: 4,
                    borderColor: "#d97706",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🎯</Text>
                </View>
              </View>

              <Pressable
                onPress={handleSpin}
                disabled={spinning}
                className={`rounded-full px-6 py-4 ${spinning ? "bg-white/50" : "bg-white"}`}
              >
                <Text className="text-center text-lg font-extrabold text-amber-700">
                  {spinning ? "🌀 Çevriliyor..." : "🎲 Çevir!"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
