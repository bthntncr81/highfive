// Pizza & Sandwich Builder — 5-step wizard.
// Backend /api/builder/config?type=PIZZA|SANDWICH ile config çekilir.
// Steps: BASE → BASE_SAUCE → CHEESE → CONTENT → TOP_SAUCE
// Live 2D preview: base'in üstüne her seçilen ingredient'in layerImage'ı stack.

import { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { endpoints, imageUrl } from "@/lib/api";
import { SmartImage } from "@/components/SmartImage";
import { useCart } from "@/lib/cart";
import { useFlyCart } from "@/lib/fly-cart";

type Base = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  baseImage: string;
};

type Ingredient = {
  id: string;
  category: string; // BASE_SAUCE / CHEESE / MEAT / VEGETABLE / TOP_SAUCE
  name: string;
  description: string | null;
  extraPrice: number;
  layerImage: string;
  layerOrder: number;
  calories: number | null;
};

type WizardStep = {
  key: string; // BASE / BASE_SAUCE / CHEESE / CONTENT / TOP_SAUCE
  title: string;
  helper: string;
  type: "BASE" | "INGREDIENT";
  categories?: string[];
  multi: boolean;
  required: boolean;
  max?: number;
};

type Config = {
  type: "PIZZA" | "SANDWICH";
  steps: WizardStep[];
  bases: Base[];
  ingredients: Ingredient[];
};

const PREVIEW_SIZE = 220;

function LayerImage({
  uri,
  zIndex,
  borderRadius,
}: {
  uri: string;
  zIndex: number;
  borderRadius: number;
}) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex,
        },
      ]}
    >
      <SmartImage
        uri={uri}
        style={{ width: "100%", height: "100%", borderRadius }}
        contentFit="cover"
        transition={120}
      />
    </Animated.View>
  );
}

export default function BuilderWizard() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const builderType = (type === "sandwich" ? "SANDWICH" : "PIZZA") as
    | "PIZZA"
    | "SANDWICH";
  const isPizza = builderType === "PIZZA";

  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [baseId, setBaseId] = useState<string | null>(null);
  // selections[stepKey] = ingredientId[]
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  // CONTENT step için et/sebze sub-tab
  const [contentSubTab, setContentSubTab] = useState<"MEAT" | "VEGETABLE">("MEAT");

  const add = useCart((s) => s.add);
  const fly = useFlyCart((s) => s.fly);
  const previewRef = useRef<View>(null);

  useEffect(() => {
    setLoading(true);
    endpoints
      .builderConfig(builderType)
      .then((r) => {
        setConfig(r as Config);
        if (r.bases.length > 0) setBaseId(r.bases[0].id);
      })
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [builderType]);

  const currentStep = config?.steps?.[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = config && stepIndex === config.steps.length - 1;

  const selectedBase = useMemo(
    () => config?.bases.find((b) => b.id === baseId) ?? null,
    [config, baseId],
  );

  // Tüm seçilen ingredient'lar (preview için)
  const selectedIngredients = useMemo(() => {
    if (!config) return [] as Ingredient[];
    const allSelectedIds = new Set<string>();
    for (const ids of Object.values(selections)) {
      ids.forEach((id) => allSelectedIds.add(id));
    }
    return config.ingredients
      .filter((i) => allSelectedIds.has(i.id))
      .sort((a, b) => a.layerOrder - b.layerOrder);
  }, [config, selections]);

  // Toplam fiyat
  const totalPrice = useMemo(() => {
    let total = selectedBase?.basePrice ?? 0;
    for (const ing of selectedIngredients) total += ing.extraPrice;
    return total;
  }, [selectedBase, selectedIngredients]);

  // Step validation
  const canAdvance = useMemo(() => {
    if (!currentStep) return false;
    if (currentStep.type === "BASE") return !!baseId;
    if (currentStep.required) {
      return (selections[currentStep.key]?.length ?? 0) > 0;
    }
    return true;
  }, [currentStep, baseId, selections]);

  const handleSelectBase = (id: string) => {
    Haptics.selectionAsync();
    setBaseId(id);
  };

  const handleToggleIngredient = (ing: Ingredient) => {
    if (!currentStep) return;
    const cur = selections[currentStep.key] ?? [];
    const isSelected = cur.includes(ing.id);

    if (isSelected) {
      Haptics.selectionAsync();
      setSelections({ ...selections, [currentStep.key]: cur.filter((x) => x !== ing.id) });
      return;
    }

    // Single select?
    if (!currentStep.multi) {
      Haptics.selectionAsync();
      setSelections({ ...selections, [currentStep.key]: [ing.id] });
      return;
    }

    // Multi select — max kontrolü
    if (currentStep.max && cur.length >= currentStep.max) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Limit dolu",
        `Bu adımda en fazla ${currentStep.max} seçim yapabilirsin.`,
      );
      return;
    }
    Haptics.selectionAsync();
    setSelections({ ...selections, [currentStep.key]: [...cur, ing.id] });
  };

  const handleNext = () => {
    if (!canAdvance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isLastStep) {
      handleAddToCart();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (isFirstStep) return;
    Haptics.selectionAsync();
    setStepIndex((i) => i - 1);
  };

  const handleSkip = () => {
    if (!currentStep || currentStep.required) return;
    Haptics.selectionAsync();
    if (isLastStep) {
      handleAddToCart();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleAddToCart = () => {
    if (!selectedBase || !config) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const ingIds = selectedIngredients.map((i) => i.id).sort();
    const cartId = `builder:${builderType.toLowerCase()}:${selectedBase.id}:${ingIds.join(",")}`;
    const productName = isPizza ? "🍕 Özel Pizza" : "🥪 Özel Sandviç";

    // Fly animation
    previewRef.current?.measureInWindow((x, y, w, h) => {
      fly({
        imageUrl: imageUrl(selectedBase.baseImage),
        emoji: isPizza ? "🍕" : "🥪",
        startX: x + w / 2,
        startY: y + h / 2,
      });
    });

    add({
      id: cartId,
      name: productName,
      price: totalPrice,
      imageUrl: imageUrl(selectedBase.baseImage) ?? undefined,
      selectedOptions: [
        {
          groupId: "BASE",
          groupName: isPizza ? "Hamur" : "Ekmek",
          itemId: selectedBase.id,
          menuItemId: selectedBase.id,
          menuItemName: selectedBase.name,
          extraPrice: 0,
        },
        ...selectedIngredients.map((i) => ({
          groupId: i.category,
          groupName: i.category,
          itemId: i.id,
          menuItemId: i.id,
          menuItemName: i.name,
          extraPrice: i.extraPrice,
        })),
      ],
      extrasTotal: totalPrice - selectedBase.basePrice,
    });

    setTimeout(() => router.back(), 250);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#bb1e10" size="large" />
      </SafeAreaView>
    );
  }

  if (!config || config.bases.length === 0) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="p-5">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </Pressable>
          <View className="mt-12 items-center">
            <Text style={{ fontSize: 56 }}>{isPizza ? "🍕" : "🥪"}</Text>
            <Text className="mt-3 text-base font-bold text-foreground">
              Bu özellik henüz aktif değil
            </Text>
            <Text className="mt-1 text-center text-xs text-foreground-muted">
              Yöneticiler {isPizza ? "pizza" : "sandviç"} tabanlarını ve
              malzemeleri eklediğinde burası açılır.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const totalSteps = config.steps.length;

  // Mevcut step için ingredient listesi
  const stepIngredients =
    currentStep?.type === "INGREDIENT"
      ? config.ingredients.filter((i) =>
          currentStep.categories?.includes(i.category),
        )
      : [];

  // CONTENT step'inde sub-tab filter
  const visibleIngredients =
    currentStep?.key === "CONTENT"
      ? stepIngredients.filter((i) => i.category === contentSubTab)
      : stepIngredients;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-extrabold text-foreground">
          {isPizza ? "🍕 Pizzanı Tasarla" : "🥪 Sandviçini Tasarla"}
        </Text>
        <View className="rounded-full bg-primary-50 px-3 py-1">
          <Text className="text-xs font-extrabold text-primary-600">
            {stepIndex + 1}/{totalSteps}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="flex-row gap-1 px-4">
        {config.steps.map((s, i) => (
          <View
            key={s.key}
            className={`h-1.5 flex-1 rounded-full ${
              i <= stepIndex ? "bg-primary-500" : "bg-border-light"
            }`}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Live preview */}
        <View
          ref={previewRef}
          style={{
            width: PREVIEW_SIZE,
            height: PREVIEW_SIZE,
            alignSelf: "center",
            marginVertical: 14,
            position: "relative",
          }}
        >
          {selectedBase && (
            <SmartImage
              uri={imageUrl(selectedBase.baseImage) ?? undefined}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: isPizza ? PREVIEW_SIZE / 2 : 16,
              }}
              contentFit="cover"
              transition={200}
            />
          )}
          {selectedIngredients.map((ing) => {
            const url = imageUrl(ing.layerImage);
            if (!url) return null;
            return (
              <LayerImage
                key={ing.id}
                uri={url}
                zIndex={ing.layerOrder}
                borderRadius={isPizza ? PREVIEW_SIZE / 2 : 16}
              />
            );
          })}
        </View>

        {/* Step header */}
        {currentStep && (
          <View className="px-4 mb-3">
            <Text className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
              Adım {stepIndex + 1}
            </Text>
            <Text className="mt-1 text-xl font-extrabold text-foreground">
              {currentStep.title}
            </Text>
            <Text className="mt-0.5 text-xs text-foreground-muted">
              {currentStep.helper}
              {currentStep.multi && currentStep.max
                ? ` (${(selections[currentStep.key]?.length ?? 0)}/${currentStep.max})`
                : ""}
            </Text>
          </View>
        )}

        {/* CONTENT step için sub-tab */}
        {currentStep?.key === "CONTENT" && (
          <View className="mx-4 mb-3 flex-row rounded-2xl bg-surface p-1">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setContentSubTab("MEAT");
              }}
              className={`flex-1 items-center rounded-xl py-2 ${
                contentSubTab === "MEAT" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  contentSubTab === "MEAT" ? "text-foreground" : "text-foreground-muted"
                }`}
              >
                🥩 Et
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setContentSubTab("VEGETABLE");
              }}
              className={`flex-1 items-center rounded-xl py-2 ${
                contentSubTab === "VEGETABLE" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  contentSubTab === "VEGETABLE"
                    ? "text-foreground"
                    : "text-foreground-muted"
                }`}
              >
                🥗 Sebze / Mantar
              </Text>
            </Pressable>
          </View>
        )}

        {/* Step content */}
        <View className="px-4">
          {currentStep?.type === "BASE" ? (
            // BASE step — 2 sütun grid
            <View className="flex-row flex-wrap justify-between">
              {config.bases.map((b) => {
                const checked = b.id === baseId;
                const url = imageUrl(b.baseImage);
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => handleSelectBase(b.id)}
                    className={`mb-3 w-[48%] rounded-2xl border-2 p-3 ${
                      checked
                        ? "border-primary-500 bg-primary-50"
                        : "border-border-light bg-white"
                    }`}
                  >
                    <View
                      className="rounded-xl bg-surface items-center justify-center"
                      style={{ aspectRatio: 1 }}
                    >
                      {url ? (
                        <SmartImage
                          uri={url}
                          style={{
                            width: "85%",
                            height: "85%",
                            borderRadius: isPizza ? 999 : 12,
                          }}
                          contentFit="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 48 }}>{isPizza ? "🍕" : "🥪"}</Text>
                      )}
                    </View>
                    <Text className="mt-2 text-sm font-bold text-foreground" numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text className="text-xs text-primary-600 font-bold">
                      {b.basePrice.toFixed(2)} ₺
                    </Text>
                    {checked && (
                      <View className="absolute right-2 top-2 h-6 w-6 rounded-full bg-primary-500 items-center justify-center">
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : visibleIngredients.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-3xl">🤷</Text>
              <Text className="mt-2 text-sm text-foreground-muted">
                Bu kategoride malzeme yok
              </Text>
              {!currentStep?.required && (
                <Pressable
                  onPress={handleSkip}
                  className="mt-3 rounded-full bg-primary-500 px-5 py-2"
                >
                  <Text className="text-sm font-bold text-white">Geç →</Text>
                </Pressable>
              )}
            </View>
          ) : (
            // INGREDIENT step — 3 sütun grid
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {visibleIngredients.map((ing) => {
                const checked = (selections[currentStep!.key] ?? []).includes(ing.id);
                const thumb = imageUrl(ing.layerImage);
                return (
                  <Pressable
                    key={ing.id}
                    onPress={() => handleToggleIngredient(ing)}
                    className={`rounded-2xl border-2 p-2 ${
                      checked
                        ? "border-primary-500 bg-primary-50"
                        : "border-border-light bg-white"
                    }`}
                    style={{ width: "31.5%" }}
                  >
                    <View
                      className="rounded-xl bg-surface items-center justify-center"
                      style={{ aspectRatio: 1 }}
                    >
                      {thumb ? (
                        <SmartImage
                          uri={thumb}
                          style={{ width: "75%", height: "75%" }}
                          contentFit="contain"
                        />
                      ) : (
                        <Text style={{ fontSize: 28 }}>🍽️</Text>
                      )}
                    </View>
                    <Text
                      className="mt-1 text-[11px] font-bold text-foreground text-center"
                      numberOfLines={1}
                    >
                      {ing.name}
                    </Text>
                    {ing.extraPrice > 0 ? (
                      <Text className="text-[10px] text-primary-600 font-bold text-center">
                        +{ing.extraPrice.toFixed(0)} ₺
                      </Text>
                    ) : (
                      <Text className="text-[10px] text-foreground-subtle text-center">
                        ücretsiz
                      </Text>
                    )}
                    {checked && (
                      <View className="absolute right-1.5 top-1.5 h-5 w-5 rounded-full bg-primary-500 items-center justify-center">
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Opsiyonel step için "Atla" linki (CONTENT ve TOP_SAUCE) */}
          {currentStep && !currentStep.required && visibleIngredients.length > 0 && (
            <Pressable onPress={handleSkip} className="mt-4 self-center">
              <Text className="text-sm font-semibold text-foreground-muted underline">
                Bu adımı atla →
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border-light bg-white px-4 pb-6 pt-3"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View className="flex-row items-center justify-between">
          {/* Geri */}
          <Pressable
            onPress={handleBack}
            disabled={isFirstStep}
            className={`h-12 w-12 items-center justify-center rounded-full ${
              isFirstStep ? "bg-surface" : "bg-foreground/10"
            }`}
          >
            <Ionicons name="chevron-back" size={20} color={isFirstStep ? "#9CA3AF" : "#1a1a1a"} />
          </Pressable>

          {/* Fiyat */}
          <View className="items-center">
            <Text className="text-[10px] uppercase tracking-widest text-foreground-muted">
              Toplam
            </Text>
            <Text className="text-2xl font-extrabold text-primary-600">
              {totalPrice.toFixed(2)} ₺
            </Text>
          </View>

          {/* İleri / Sepete Ekle */}
          <Pressable
            onPress={handleNext}
            disabled={!canAdvance}
            className={`flex-row items-center rounded-full px-5 py-3 ${
              canAdvance ? "bg-primary-500" : "bg-gray-300"
            }`}
          >
            {isLastStep ? (
              <>
                <Ionicons name="cart" size={18} color="#fff" />
                <Text className="ml-2 text-sm font-extrabold text-white">Sepete Ekle</Text>
              </>
            ) : (
              <>
                <Text className="text-sm font-extrabold text-white mr-1">İleri</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
