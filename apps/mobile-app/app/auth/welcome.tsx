import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { Logo } from "@/components/ui/Logo";

export default function Welcome() {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-white">
      <View className="flex-row items-center justify-end px-5 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="close" size={22} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 12 }}
      >
        {/* Hero */}
        <View className="items-center pt-4">
          <Logo height={48} />
          <Text className="mt-6 text-center text-3xl font-extrabold text-foreground">
            HighFive'a hoş geldin!
          </Text>
          <Text className="mt-2 text-center text-sm text-foreground-muted">
            Lezzetli yemekleri kapına getirelim
          </Text>
        </View>

        {/* Features */}
        <View className="mt-10 gap-4">
          <Feature
            icon="restaurant"
            title="Hızlı sipariş"
            description="Menüden seç, dakikalar içinde kapında"
          />
          <Feature
            icon="star"
            title="Puan kazan, indirim al"
            description="Her siparişte puan biriktir, sonraki siparişte kullan"
          />
          <Feature
            icon="bicycle"
            title="Canlı kurye takibi"
            description="Siparişin nerede, ne zaman gelir — anında bil"
          />
          <Feature
            icon="notifications"
            title="Kampanyaları kaçırma"
            description="Happy hour ve indirimleri ilk sen öğren"
          />
        </View>
      </ScrollView>

      {/* CTAs */}
      <View className="px-6 pb-6 pt-3">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace("/auth/signup");
          }}
          className="items-center rounded-full bg-primary-500 py-4"
        >
          <Text className="text-base font-bold text-white">
            🆕 Üye ol — puan kazanmaya başla
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.replace("/auth/login");
          }}
          className="mt-2 items-center rounded-full border border-border-light py-4"
        >
          <Text className="text-base font-bold text-foreground">
            👋 Hesabım var, giriş yap
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          className="mt-2 items-center py-4"
        >
          <Text className="text-sm font-semibold text-foreground-muted">
            Misafir olarak devam et →
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View className="flex-row items-start">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-50">
        <Ionicons name={icon} size={22} color="#bb1e10" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-foreground">{title}</Text>
        <Text className="mt-0.5 text-sm text-foreground-muted">
          {description}
        </Text>
      </View>
    </View>
  );
}
