// Home ekranında gösterilen "Şans Çarkı'nı çevir!" tetikleyici kart
// Tıklayınca SpinWheel modal'ını açar.

import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { SpinWheel } from "./SpinWheel";

export function SpinWheelCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setOpen(true);
        }}
        className="mx-5 mt-3 overflow-hidden rounded-2xl"
        style={{ backgroundColor: "#d97706" }}
      >
        <View className="flex-row items-center p-4">
          <Text style={{ fontSize: 44 }}>🎡</Text>
          <View className="ml-3 flex-1">
            <Text className="text-base font-extrabold text-white">
              Şans Çarkını Çevir!
            </Text>
            <Text className="mt-0.5 text-xs text-white/85">
              Günde 1 hak — indirim, puan veya sürpriz kazan
            </Text>
          </View>
          <View className="rounded-full bg-white/20 px-3 py-1.5">
            <Text className="text-xs font-bold text-white">ÇEVİR →</Text>
          </View>
        </View>
      </Pressable>

      <SpinWheel visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
