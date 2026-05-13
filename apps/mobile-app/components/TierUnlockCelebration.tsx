// Tier Unlock Celebration — kullanıcı yeni tier'a yükseldiğinde
// 1 kere gösterilen tam ekran kutlama modal'ı.
//
// Kullanım:
//   <TierUnlockCelebration
//     currentTierKey={tier?.name}
//     currentTierColor={tier?.color}
//     currentTierIcon={tier?.icon}
//     currentTierDiscount={tier?.discountPercent}
//   />
//
// AsyncStorage'a son görülen tier kaydedilir; mevcut tier farklıysa
// (ve önceden bir tier kayıtlıysa) modal tetiklenir.

import { useEffect, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

const STORAGE_KEY = "hf_last_seen_tier";

export function TierUnlockCelebration({
  currentTierKey,
  currentTierColor,
  currentTierIcon,
  currentTierDiscount,
}: {
  currentTierKey?: string | null;
  currentTierColor?: string | null;
  currentTierIcon?: string | null;
  currentTierDiscount?: number | string | null;
}) {
  const [show, setShow] = useState(false);
  const [prevTier, setPrevTier] = useState<string | null>(null);

  // Animasyon sharedValue'ları
  const scale = useSharedValue(0.5);
  const rotate = useSharedValue(0);
  const sparkleScale = useSharedValue(1);

  useEffect(() => {
    if (!currentTierKey) return;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        if (!seen) {
          // İlk yüklemede sadece kaydet — kutlama yok
          await AsyncStorage.setItem(STORAGE_KEY, currentTierKey);
          return;
        }
        if (seen !== currentTierKey) {
          // Yeni tier'a yükseldi!
          setPrevTier(seen);
          setShow(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await AsyncStorage.setItem(STORAGE_KEY, currentTierKey);

          // Animasyon
          scale.value = withSpring(1, { damping: 12, stiffness: 90 });
          rotate.value = withRepeat(
            withSequence(
              withTiming(-3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
              withTiming(3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            true,
          );
          sparkleScale.value = withRepeat(
            withSequence(
              withTiming(1.2, { duration: 700 }),
              withTiming(0.9, { duration: 700 }),
            ),
            -1,
            true,
          );
        }
      } catch {
        // sessiz geç
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTierKey]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
  }));

  if (!show) return null;

  const color = currentTierColor || "#d97706";
  const discount = Number(currentTierDiscount ?? 0);

  return (
    <Modal
      visible={show}
      transparent
      animationType="fade"
      onRequestClose={() => setShow(false)}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <Animated.View
          style={[cardStyle, { backgroundColor: color }]}
          className="w-full rounded-3xl p-6"
        >
          {/* Kapatma butonu */}
          <Pressable
            onPress={() => setShow(false)}
            className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white/20"
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>

          {/* Sparkle dekorlar */}
          <Animated.Text
            style={[sparkleStyle, { position: "absolute", top: 20, left: 20 }]}
          >
            <Text className="text-3xl">✨</Text>
          </Animated.Text>
          <Animated.Text
            style={[sparkleStyle, { position: "absolute", top: 30, right: 60 }]}
          >
            <Text className="text-2xl">🌟</Text>
          </Animated.Text>
          <Animated.Text
            style={[sparkleStyle, { position: "absolute", bottom: 60, left: 30 }]}
          >
            <Text className="text-2xl">💫</Text>
          </Animated.Text>

          <Text className="text-center text-xs font-bold uppercase tracking-widest text-white/80">
            Tebrikler!
          </Text>
          <Text className="mt-2 text-center text-3xl">
            {currentTierIcon ?? "🏆"}
          </Text>
          <Text className="mt-3 text-center text-2xl font-extrabold text-white">
            {currentTierKey} Üye Oldun!
          </Text>
          {prevTier && (
            <Text className="mt-1 text-center text-xs text-white/80">
              {prevTier} seviyesinden yükseldin
            </Text>
          )}

          {discount > 0 && (
            <View className="mt-5 rounded-2xl bg-white/15 p-4">
              <Text className="text-center text-xs font-bold uppercase tracking-wide text-white/80">
                Yeni avantajın
              </Text>
              <Text className="mt-1 text-center text-3xl font-extrabold text-white">
                %{discount} İndirim
              </Text>
              <Text className="text-center text-xs text-white/80">
                tüm siparişlerinde
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => setShow(false)}
            className="mt-5 rounded-full bg-white px-6 py-3"
          >
            <Text className="text-center text-base font-extrabold" style={{ color }}>
              Harika! 🎉
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
