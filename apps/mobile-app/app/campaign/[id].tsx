import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useCampaigns } from "@/lib/hooks";
import { imageUrl } from "@/lib/api";

const PALETTE = ["#bb1e10", "#005387", "#8a1610", "#003d63"];

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaigns = useCampaigns();

  if (campaigns.loading && !campaigns.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#bb1e10" />
      </SafeAreaView>
    );
  }

  const list = campaigns.data?.campaigns ?? [];
  const idx = list.findIndex((c) => c.id === id);
  const campaign = idx >= 0 ? list[idx] : null;
  const bg = PALETTE[idx >= 0 ? idx % PALETTE.length : 0];

  if (!campaign) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="p-5">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </Pressable>
          <Text className="mt-8 text-center text-foreground-muted">
            Kampanya bulunamadı.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const img = imageUrl(campaign.image);
  const priceText =
    campaign.discountType === "PERCENTAGE" && campaign.discountValue
      ? `%${campaign.discountValue} indirim`
      : campaign.discountType === "FIXED" && campaign.discountValue
      ? `${campaign.discountValue} ₺ indirim`
      : "Aşağıdaki koşullara göz at";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="px-5 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView className="flex-1">
        <View
          style={{ backgroundColor: bg }}
          className="mx-5 mt-2 items-center justify-center overflow-hidden rounded-3xl py-12"
        >
          {img ? (
            <Image
              source={{ uri: img }}
              style={{ width: 200, height: 200, borderRadius: 16 }}
              contentFit="cover"
            />
          ) : (
            <Text className="text-9xl">🎁</Text>
          )}
        </View>

        <View className="px-5 pt-6">
          <View className="self-start rounded-full bg-primary-50 px-3 py-1">
            <Text className="text-xs font-bold uppercase tracking-widest text-primary-600">
              {campaign.type === "BUNDLE" ? "Menü Kampanyası" : "Kampanya"}
            </Text>
          </View>

          <Text className="mt-3 text-3xl font-extrabold text-foreground">
            {campaign.name}
          </Text>

          {campaign.description && (
            <Text className="mt-2 text-base leading-6 text-foreground-muted">
              {campaign.description}
            </Text>
          )}

          <Text className="mt-6 text-2xl font-extrabold text-primary-500">
            {priceText}
          </Text>

          <View className="mt-6 rounded-2xl bg-surface p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
              Geçerlilik
            </Text>
            <View className="mt-2 flex-row items-center">
              <Ionicons name="calendar-outline" size={14} color="#1a1a1a" />
              <Text className="ml-2 text-sm text-foreground">
                {new Date(campaign.startDate).toLocaleDateString("tr-TR")} —{" "}
                {new Date(campaign.endDate).toLocaleDateString("tr-TR")}
              </Text>
            </View>
            {campaign.minPurchase && (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="cash-outline" size={14} color="#1a1a1a" />
                <Text className="ml-2 text-sm text-foreground">
                  Min. {campaign.minPurchase} ₺ tutar
                </Text>
              </View>
            )}
            {campaign.minItems && (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="cube-outline" size={14} color="#1a1a1a" />
                <Text className="ml-2 text-sm text-foreground">
                  Min. {campaign.minItems} adet
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-border-light px-5 pb-2 pt-4">
        <Pressable
          onPress={() => router.replace("/menu")}
          className="items-center rounded-full bg-primary-500 py-4"
        >
          <Text className="text-base font-bold text-white">
            Şimdi sipariş ver
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
