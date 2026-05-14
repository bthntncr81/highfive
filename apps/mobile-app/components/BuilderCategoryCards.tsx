// HighFive Kazandıran Menüler kategorisinde gösterilen kompakt builder kartları.
// Pizza Tasarla + Sandviç Tasarla — yan yana 2'li kompakt grid.

import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export function BuilderCategoryCards() {
  return (
    <View>
      <Text className="mb-3 text-lg font-extrabold text-foreground">
        🎨 Kendi Yap
      </Text>
      <View className="flex-row gap-2">
        <Link href="/builder/pizza" asChild>
          <Pressable className="flex-1 rounded-2xl border-2 border-primary-200 bg-white overflow-hidden">
            <View
              className="items-center justify-center"
              style={{ height: 90, backgroundColor: "#fef3c7" }}
            >
              <Text style={{ fontSize: 56 }}>🍕</Text>
            </View>
            <View className="p-3">
              <Text className="text-sm font-extrabold text-foreground">
                Pizzanı Tasarla
              </Text>
              <Text className="text-[10px] text-foreground-muted mt-0.5">
                5 adımda kendi pizzan
              </Text>
              <View className="mt-2 flex-row items-center">
                <Text className="text-[11px] text-primary-600 font-semibold">
                  Başla
                </Text>
                <Ionicons name="chevron-forward" size={12} color="#bb1e10" />
              </View>
            </View>
          </Pressable>
        </Link>
        <Link href="/builder/sandwich" asChild>
          <Pressable className="flex-1 rounded-2xl border-2 border-accent-200 bg-white overflow-hidden">
            <View
              className="items-center justify-center"
              style={{ height: 90, backgroundColor: "#dbeafe" }}
            >
              <Text style={{ fontSize: 56 }}>🥪</Text>
            </View>
            <View className="p-3">
              <Text className="text-sm font-extrabold text-foreground">
                Sandviçini Tasarla
              </Text>
              <Text className="text-[10px] text-foreground-muted mt-0.5">
                Ekmek + içerik özgür
              </Text>
              <View className="mt-2 flex-row items-center">
                <Text className="text-[11px] text-accent-700 font-semibold">
                  Başla
                </Text>
                <Ionicons name="chevron-forward" size={12} color="#005387" />
              </View>
            </View>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
