// Birthday Celebration — kullanıcının doğum günü olduğu gün uygulamayı
// açtığında 1 kere gösterilen tam ekran kutlama.
//
// Customer.birthDate (YYYY-MM-DD) backend'te tutuluyor.
// AsyncStorage'a son gösterilen yıl kaydedilir (her yıl 1 kez gösterilir).
// processBirthdayPrograms cron'u zaten kupon üretiyor; bu sadece in-app celebration.

import { useEffect, useRef, useState } from "react";
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

const STORAGE_KEY = "hf_birthday_seen_year";

function isBirthdayToday(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false;
  // birthDate "YYYY-MM-DD" formatında
  const parts = isoDate.split("-");
  if (parts.length < 3) return false;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const now = new Date();
  return now.getMonth() + 1 === month && now.getDate() === day;
}

export function BirthdayCelebration({
  birthDate,
  customerName,
}: {
  birthDate: string | null | undefined;
  customerName: string | null | undefined;
}) {
  const [show, setShow] = useState(false);
  const scale = useSharedValue(0.5);
  const cakeRotate = useSharedValue(0);
  const sparkleScale = useSharedValue(1);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    if (!isBirthdayToday(birthDate)) return;

    (async () => {
      try {
        const seenYear = await AsyncStorage.getItem(STORAGE_KEY);
        const currentYear = String(new Date().getFullYear());
        if (seenYear === currentYear) return;

        setShow(true);
        await AsyncStorage.setItem(STORAGE_KEY, currentYear);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Animasyon
        scale.value = withSpring(1, { damping: 11, stiffness: 90 });
        cakeRotate.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 700, easing: Easing.inOut(Easing.ease) }),
            withTiming(5, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        );
        sparkleScale.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 600 }),
            withTiming(0.9, { duration: 600 }),
          ),
          -1,
          true,
        );
      } catch {
        // sessiz
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthDate]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const cakeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${cakeRotate.value}deg` }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
  }));

  if (!show) return null;

  const firstName = (customerName ?? "").split(" ")[0] || "dostum";

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <Animated.View
          style={[cardStyle, { backgroundColor: "#ec4899" }]}
          className="w-full rounded-3xl p-6"
        >
          {/* Kapatma */}
          <Pressable
            onPress={() => setShow(false)}
            className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white/20"
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>

          {/* Sparkles */}
          <Animated.View style={[sparkleStyle, { position: "absolute", top: 20, left: 20 }]}>
            <Text className="text-3xl">✨</Text>
          </Animated.View>
          <Animated.View style={[sparkleStyle, { position: "absolute", top: 30, right: 60 }]}>
            <Text className="text-2xl">🎊</Text>
          </Animated.View>
          <Animated.View style={[sparkleStyle, { position: "absolute", bottom: 60, left: 30 }]}>
            <Text className="text-2xl">🎁</Text>
          </Animated.View>
          <Animated.View style={[sparkleStyle, { position: "absolute", bottom: 80, right: 30 }]}>
            <Text className="text-2xl">🎈</Text>
          </Animated.View>

          <Text className="text-center text-xs font-bold uppercase tracking-widest text-white/90">
            🎉 Bugün senin günün!
          </Text>

          <Animated.View style={[cakeStyle, { marginTop: 12 }]}>
            <Text className="text-center" style={{ fontSize: 80 }}>
              🎂
            </Text>
          </Animated.View>

          <Text className="mt-3 text-center text-3xl font-extrabold text-white">
            İyi ki doğdun {firstName}!
          </Text>
          <Text className="mt-2 text-center text-sm text-white/90">
            HighFive ailesi olarak doğum gününü kutlarız 🎈
          </Text>

          <View className="mt-5 rounded-2xl bg-white/20 p-4">
            <Text className="text-center text-xs font-bold uppercase tracking-wide text-white/85">
              Sana özel sürpriz
            </Text>
            <Text className="mt-1 text-center text-base font-extrabold text-white">
              🎁 Doğum günü kuponun hesabında
            </Text>
            <Text className="mt-1 text-center text-xs text-white/85">
              Kuponlar sayfasından kontrol et
            </Text>
          </View>

          <Pressable
            onPress={() => setShow(false)}
            className="mt-5 rounded-full bg-white px-6 py-3"
          >
            <Text className="text-center text-base font-extrabold text-pink-600">
              Teşekkürler! 💕
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
