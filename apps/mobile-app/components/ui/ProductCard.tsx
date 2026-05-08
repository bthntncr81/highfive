import { useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { useAuth } from "@/lib/auth";
import { useFlyCart } from "@/lib/fly-cart";
import { ApiMenuItem, imageUrl, parsePrice } from "@/lib/api";

type Props = {
  product: ApiMenuItem;
  variant?: "list" | "grid";
};

const FALLBACK_EMOJI: Record<string, string> = {
  "cat-pizza": "🍕",
  "cat-makarna": "🍝",
  "cat-icecek": "🥤",
  "cat-burger": "🍔",
  "cat-tatli": "🍰",
  "cat-sandvic": "🥪",
};

function ProductImage({
  product,
  size,
}: {
  product: ApiMenuItem;
  size: "sm" | "lg";
}) {
  const url = imageUrl(product.image);
  const emoji = FALLBACK_EMOJI[product.categoryId] ?? "🍽️";

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={size === "sm" ? { width: 96, height: 96 } : { width: "100%", aspectRatio: 1 }}
        contentFit="cover"
        transition={200}
      />
    );
  }
  return (
    <View
      className="items-center justify-center bg-primary-50"
      style={size === "sm" ? { width: 96, height: 96 } : { width: "100%", aspectRatio: 1 }}
    >
      <Text style={{ fontSize: size === "sm" ? 36 : 56 }}>{emoji}</Text>
    </View>
  );
}

export function ProductCard({ product, variant = "list" }: Props) {
  const add = useCart((s) => s.add);
  const fly = useFlyCart((s) => s.fly);
  const isFav = useFavorites((s) => s.ids.includes(product.id));
  const toggleFav = useFavorites((s) => s.toggle);
  const user = useAuth((s) => s.user);
  const price = parsePrice(product.price);
  const discountPrice = product.discountPrice
    ? parsePrice(product.discountPrice)
    : null;
  const finalPrice = discountPrice ?? price;
  const oldPrice = discountPrice ? price : null;
  const primaryBadge = product.badges?.[0];

  const addBtnRef = useRef<View>(null);

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Buton pozisyonunu ölç → ürün sepete uçsun
    addBtnRef.current?.measureInWindow((x, y, w, h) => {
      fly({
        imageUrl: imageUrl(product.image),
        emoji: FALLBACK_EMOJI[product.categoryId] ?? "🍽️",
        startX: x + w / 2,
        startY: y + h / 2,
      });
    });
    add({
      id: product.id,
      name: product.name,
      price: finalPrice,
      imageUrl: imageUrl(product.image) ?? undefined,
    });
  };

  const handleFav = () => {
    if (!user) return;
    Haptics.selectionAsync();
    toggleFav(product.id, product);
  };

  if (variant === "grid") {
    return (
      <Link href={{ pathname: "/product/[id]", params: { id: product.id } }} asChild>
        <Pressable className="w-[48%] overflow-hidden rounded-2xl border border-border-light bg-white">
          <View className="overflow-hidden">
            <ProductImage product={product} size="lg" />
            {primaryBadge && (
              <View className="absolute left-2 top-2 rounded-full bg-primary-500 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-white">
                  {primaryBadge}
                </Text>
              </View>
            )}
            {user && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleFav();
                }}
                hitSlop={8}
                className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/90"
              >
                <Ionicons
                  name={isFav ? "heart" : "heart-outline"}
                  size={16}
                  color={isFav ? "#bb1e10" : "#6b6b6b"}
                />
              </Pressable>
            )}
          </View>
          <View className="p-3">
            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
              {product.name}
            </Text>
            {product.description && (
              <Text
                className="mt-0.5 text-[11px] text-foreground-muted"
                numberOfLines={1}
              >
                {product.description}
              </Text>
            )}
            <View className="mt-2 flex-row items-center justify-between">
              <View className="flex-row items-baseline">
                <Text className="text-base font-extrabold text-primary-600">
                  {finalPrice} ₺
                </Text>
                {oldPrice && (
                  <Text className="ml-1 text-[10px] text-foreground-subtle line-through">
                    {oldPrice} ₺
                  </Text>
                )}
              </View>
              <Pressable
                ref={addBtnRef as any}
                onPress={handleAdd}
                className="h-7 w-7 items-center justify-center rounded-full bg-primary-500"
              >
                <Ionicons name="add" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Link>
    );
  }

  return (
    <Link href={{ pathname: "/product/[id]", params: { id: product.id } }} asChild>
      <Pressable className="mb-3 flex-row overflow-hidden rounded-2xl border border-border-light bg-white">
        <View className="relative">
          <ProductImage product={product} size="sm" />
          {primaryBadge && (
            <View className="absolute left-1.5 top-1.5 rounded-full bg-primary-500 px-1.5 py-0.5">
              <Text className="text-[9px] font-bold text-white">
                {primaryBadge}
              </Text>
            </View>
          )}
          {user && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleFav();
              }}
              hitSlop={8}
              className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-white/90"
            >
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={14}
                color={isFav ? "#bb1e10" : "#6b6b6b"}
              />
            </Pressable>
          )}
        </View>
        <View className="flex-1 justify-center p-3">
          <Text className="text-base font-bold text-foreground">
            {product.name}
          </Text>
          {product.description && (
            <Text
              className="mt-0.5 text-xs text-foreground-muted"
              numberOfLines={1}
            >
              {product.description}
            </Text>
          )}
          <View className="mt-2 flex-row items-center justify-between">
            <View className="flex-row items-baseline">
              <Text className="text-base font-extrabold text-primary-600">
                {finalPrice} ₺
              </Text>
              {oldPrice && (
                <Text className="ml-2 text-xs text-foreground-subtle line-through">
                  {oldPrice} ₺
                </Text>
              )}
            </View>
            <Pressable
              ref={addBtnRef as any}
              onPress={handleAdd}
              className="h-9 w-9 items-center justify-center rounded-full bg-primary-500"
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
