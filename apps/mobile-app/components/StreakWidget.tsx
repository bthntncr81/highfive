// Streak Widget — kullanıcının günlük sipariş streak'i.
// Customer modelinde currentStreak / longestStreak field'leri zaten var.
// Bu widget loyalty endpoint'ten gelen değerleri kullanır.

import { View, Text } from "react-native";

export function StreakWidget({
  currentStreak,
  longestStreak,
}: {
  currentStreak: number;
  longestStreak: number;
}) {
  if (currentStreak <= 0) return null;

  return (
    <View className="mx-5 mt-3 flex-row items-center rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-3" style={{ backgroundColor: "#f97316" }}>
      <Text style={{ fontSize: 32 }}>🔥</Text>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-extrabold text-white">
          {currentStreak} günlük streak!
        </Text>
        <Text className="text-[11px] text-white/85">
          Devam et — streak'ini bozma. En uzun: {longestStreak} gün
        </Text>
      </View>
      <View className="rounded-full bg-white/20 px-3 py-1.5">
        <Text className="text-base font-extrabold text-white">{currentStreak}🔥</Text>
      </View>
    </View>
  );
}
