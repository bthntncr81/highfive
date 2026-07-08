import { BRAND_PRIMARY, BRAND_PRIMARY_DARK } from "@/lib/brand";
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
  { from: BRAND_PRIMARY, emoji: "🍕" }, // primary
  { from: "#005387", emoji: "🍝" }, // accent
  { from: BRAND_PRIMARY_DARK, emoji: "🍔" }, // primary-dark
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

          // Yakında / Aktif badge tespiti
          const now = new Date();
          const start = new Date(c.startDate);
          const isUpcoming = start > now;
          const daysUntil = isUpcoming
            ? Math.ceil((start.getTime() - now.getTime()) / 86400000)
            : 0;

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
                  height: 180,
                }}
                className="overflow-hidden rounded-3xl"
              >
                {/* Background image (varsa tam kaplama) */}
                {img && (
                  <Image
                    source={{ uri: img }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: "100%",
                      height: "100%",
                    }}
                    contentFit="cover"
                  />
                )}
                {/* Dark gradient overlay (okunabilirlik için) */}
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: img ? "rgba(0,0,0,0.45)" : "transparent",
                  }}
                />
                {/* Sol-alttan koyu gradient (text okunsun) */}
                {img && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: "70%",
                      backgroundColor: "transparent",
                    }}
                  />
                )}

                {/* İçerik */}
                <View className="flex-1 justify-between p-5">
                  <View className="flex-row items-center gap-2">
                    <View className="self-start rounded-full bg-white/25 px-2.5 py-1">
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-white">
                        {c.type === "BUNDLE" ? "Menü" : "Kampanya"}
                      </Text>
                    </View>
                    {isUpcoming && (
                      <View className="rounded-full bg-yellow-300 px-2.5 py-1">
                        <Text className="text-[10px] font-extrabold uppercase tracking-wide text-yellow-900">
                          ⏰ {daysUntil > 1 ? `${daysUntil} gün sonra` : "Yakında"}
                        </Text>
                      </View>
                    )}
                    {/* Görsel yoksa emoji köşede */}
                    {!img && (
                      <View className="ml-auto">
                        <Text className="text-3xl">{palette.emoji}</Text>
                      </View>
                    )}
                  </View>

                  <View>
                    <Text
                      className="text-2xl font-extrabold leading-tight text-white"
                      numberOfLines={2}
                      style={{
                        textShadowColor: img ? "rgba(0,0,0,0.6)" : "transparent",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 4,
                      }}
                    >
                      {c.name}
                    </Text>
                    {c.description && (
                      <Text
                        className="mt-1 text-xs text-white/90"
                        numberOfLines={2}
                        style={{
                          textShadowColor: img ? "rgba(0,0,0,0.5)" : "transparent",
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 3,
                        }}
                      >
                        {c.description}
                      </Text>
                    )}
                    <View className="mt-3 self-start rounded-full bg-white px-4 py-2">
                      <Text className="text-xs font-bold" style={{ color: palette.from }}>
                        {priceText}
                      </Text>
                    </View>
                  </View>
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
