// MysteryBoxTeaser — Sürpriz Kutu sayfasına davet eden küçük modal pop-up.
// Daily game rotation'ında gösterilir. SpinWheel'in görsel diline uyumlu:
// - Backdrop rgba(0,0,0,0.85), sağ üstte beyaz X
// - Dark navy header + altın aksanlar
// - Sallanan kutu emoji animasyonu
// - "Kutuya Bak" CTA → /mysterybox sayfasına yönlendirir

import { useEffect } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

export function MysteryBoxTeaser({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const tilt = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    tilt.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 320, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 320, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 320, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [visible]);

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt.value}deg` }, { scale: scale.value }],
  }));

  const handleGo = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    setTimeout(() => router.push("/mysterybox"), 100);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      >
        {/* Sağ üst kapatma */}
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
          {/* Başlık — dark navy, SpinWheel'le tutarlı */}
          <View
            className="px-5 pt-6 pb-4 items-center"
            style={{ backgroundColor: "#0f172a" }}
          >
            <Text style={{ fontSize: 32 }}>🎁</Text>
            <Text className="mt-1 text-xl font-extrabold text-white">
              Sana Bir Sürpriz Var
            </Text>
            <Text className="mt-1 text-xs text-white/70">
              Bugün bir hediye kutusu açabilirsin
            </Text>
          </View>

          {/* Sallanan kutu */}
          <View className="py-10 items-center px-6">
            <Animated.View style={boxStyle}>
              <Text style={{ fontSize: 110 }}>📦</Text>
            </Animated.View>

            <Text className="mt-6 text-center text-lg font-extrabold text-foreground">
              Sürpriz Kutu Açma Zamanı
            </Text>
            <Text className="mt-2 text-center text-xs text-foreground-muted leading-4 max-w-[260px]">
              Puanlarını harcayarak içinde indirim, ücretsiz ürün veya bonus puan
              olabilecek bir kutu aç.
            </Text>

            {/* Altın gradient şerit */}
            <View
              className="mt-5 self-stretch rounded-2xl px-4 py-3 flex-row items-center justify-between"
              style={{ backgroundColor: "#fef3c7", borderWidth: 1, borderColor: "#fcd34d" }}
            >
              <View className="flex-row items-center">
                <Text style={{ fontSize: 20 }}>⭐</Text>
                <Text className="ml-2 text-xs font-bold text-amber-900">
                  Puan harcayarak aç
                </Text>
              </View>
              <Text style={{ fontSize: 14 }}>🎲</Text>
            </View>

            {/* Aksiyon */}
            <Pressable
              onPress={handleGo}
              className="mt-6 self-stretch rounded-full py-4 items-center"
              style={{
                backgroundColor: "#0f172a",
                elevation: 6,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
              }}
            >
              <Text className="text-base font-extrabold text-white">
                🎁  Kutulara Göz At
              </Text>
            </Pressable>

            <Pressable onPress={onClose} className="mt-3" hitSlop={8}>
              <Text className="text-[12px] text-foreground-muted underline">
                Şimdi değil
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default MysteryBoxTeaser;
