import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Link } from "expo-router";
import { ApiCampaign, imageUrl } from "@/lib/api";
import { Image } from "expo-image";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;

// Marka paletinden cycle eden arka plan renkleri
const BG_PALETTE = [
  { from: "#bb1e10", emoji: "🍕" }, // primary
  { from: "#005387", emoji: "🍝" }, // accent
  { from: "#8a1610", emoji: "🍔" }, // primary-dark
  { from: "#003d63", emoji: "🥤" }, // accent-dark
];

function pickColor(idx: number) {
  return BG_PALETTE[idx % BG_PALETTE.length];
}

export function CampaignCarousel({ campaigns }: { campaigns: ApiCampaign[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (CARD_WIDTH + 12));
    if (index !== activeIndex && index >= 0 && index < campaigns.length) {
      setActiveIndex(index);
    }
  };

  if (campaigns.length === 0) return null;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {campaigns.map((c, idx) => {
          const palette = pickColor(idx);
          const img = imageUrl(c.image);
          const priceText =
            c.discountType === "PERCENTAGE" && c.discountValue
              ? `%${c.discountValue} indirim`
              : c.discountType === "FIXED" && c.discountValue
              ? `${c.discountValue} ₺ indirim`
              : "Detaya bak";

          return (
            <Link
              key={c.id}
              href={{ pathname: "/campaign/[id]", params: { id: c.id } }}
              asChild
            >
              <Pressable
                style={{
                  width: CARD_WIDTH,
                  marginRight: idx === campaigns.length - 1 ? 0 : 12,
                  backgroundColor: palette.from,
                }}
                className="overflow-hidden rounded-3xl"
              >
                <View className="flex-row items-center p-6">
                  <View className="flex-1">
                    <View className="self-start rounded-full bg-white/20 px-2.5 py-1">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-white">
                        {c.type === "BUNDLE" ? "Menü" : "Kampanya"}
                      </Text>
                    </View>
                    <Text className="mt-3 text-2xl font-extrabold leading-tight text-white" numberOfLines={2}>
                      {c.name}
                    </Text>
                    {c.description && (
                      <Text className="mt-1 text-xs text-white/80" numberOfLines={2}>
                        {c.description}
                      </Text>
                    )}
                    <View className="mt-4 flex-row items-center">
                      <View className="rounded-full bg-white px-4 py-2">
                        <Text className="text-xs font-bold" style={{ color: palette.from }}>
                          {priceText}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {img ? (
                    <Image
                      source={{ uri: img }}
                      style={{ width: 96, height: 96, borderRadius: 16 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Text className="text-7xl">{palette.emoji}</Text>
                  )}
                </View>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>

      {campaigns.length > 1 && (
        <View className="mt-3 flex-row items-center justify-center">
          {campaigns.map((_, i) => (
            <View
              key={i}
              className={`mx-1 h-1.5 rounded-full ${
                i === activeIndex ? "w-5 bg-primary-500" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
