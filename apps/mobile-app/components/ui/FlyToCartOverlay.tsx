// Sepete uçan ürün animasyonu — root layout'a mount edilir
// ProductCard / BundleCard "Sepete ekle" basıldığında ürün ikonu sepete uçar.

import { useEffect } from "react";
import { Dimensions, View, Text, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { useFlyCart, type FlyingItem } from "@/lib/fly-cart";

const { width: SW, height: SH } = Dimensions.get("window");

// Sepet ikonu konumu (tab bar 5 tab, sepet 3. sırada — orta-sağa hafif kayık)
// 5 tab eşit dağılım: %10, %30, %50, %70, %90
const CART_TARGET_X = SW * 0.5; // tab 3 (Sepet)
const CART_TARGET_Y = SH - (Platform.OS === "ios" ? 60 : 50);

export function FlyToCartOverlay() {
  const items = useFlyCart((s) => s.items);
  if (items.length === 0) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      {items.map((it) => (
        <FlyingDot key={it.id} item={it} />
      ))}
    </View>
  );
}

function FlyingDot({ item }: { item: FlyingItem }) {
  const remove = useFlyCart((s) => s.remove);
  const x = useSharedValue(item.startX);
  const y = useSharedValue(item.startY);
  const scale = useSharedValue(1);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const dx = CART_TARGET_X - item.startX;
    const dy = CART_TARGET_Y - item.startY;
    const arcMidY = item.startY - 100; // yukarı bir yay çiz
    const dur = 700;

    // X düz hareket
    x.value = withTiming(CART_TARGET_X, {
      duration: dur,
      easing: Easing.bezier(0.5, 0, 0.6, 1),
    });

    // Y çift segmentli (önce yukarı, sonra parabol gibi sepete iniş)
    y.value = withSequence(
      withTiming(arcMidY, { duration: dur * 0.4, easing: Easing.out(Easing.quad) }),
      withTiming(CART_TARGET_Y, { duration: dur * 0.6, easing: Easing.in(Easing.quad) }),
    );

    // Sepete yaklaşırken küçül + dön + sönükleş
    scale.value = withTiming(0.25, { duration: dur, easing: Easing.in(Easing.quad) });
    rot.value = withTiming(720, { duration: dur, easing: Easing.linear });
    opacity.value = withSequence(
      withTiming(1, { duration: dur * 0.7 }),
      withTiming(0, { duration: dur * 0.3 }, () => {
        runOnJS(remove)(item.id);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - 32 },
      { translateY: y.value - 32 },
      { scale: scale.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: 64,
          height: 64,
          borderRadius: 32,
          overflow: "hidden",
          backgroundColor: "#fff",
          shadowColor: "#bb1e10",
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 12,
          borderWidth: 3,
          borderColor: "#bb1e10",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      ) : (
        <Text style={{ fontSize: 36, lineHeight: 40 }}>{item.emoji ?? "🍕"}</Text>
      )}
    </Animated.View>
  );
}
