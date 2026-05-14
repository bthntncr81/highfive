import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, Link } from "expo-router";
import * as Haptics from "expo-haptics";

import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useAutoCartOffer, useCartOffer } from "@/lib/cart-offers";
import {
  endpoints,
  ApiAddress,
  ApiError,
  OrderType,
  setToken,
} from "@/lib/api";
import { getCurrentLocation } from "@/lib/location";

const TIP_PRESETS = [0, 10, 20, 50];
const DELIVERY_FEE = 29;

export default function Checkout() {
  const items = useCart((s) => s.items);
  const cartTotal = useCart((s) => s.total());
  const clearCart = useCart((s) => s.clear);

  // Otomatik en avantajlı sadakat (sepetteki banner ile aynı kaynaktan)
  // Backend siparişte couponCode + points kullanılmazsa otomatik apply eder.
  useAutoCartOffer(items);
  const bestOffer = useCartOffer((s) => s.bestOffer);
  const offerDismissed = useCartOffer((s) => s.dismissed);
  const clearOfferStore = useCartOffer((s) => s.reset);

  const user = useAuth((s) => s.user);
  const refreshMe = useAuth((s) => s.refreshMe);
  const setSession = useAuth((s) => s.setSession);

  // Misafir mode
  const isGuest = !user;
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [orderType, setOrderType] = useState<OrderType>("DELIVERY");
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [manualLat, setManualLat] = useState<number | null>(null);
  const [manualLng, setManualLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const [tip, setTip] = useState(0);
  const [tipCustom, setTipCustom] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(100);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">(
    "ONLINE",
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Login user için adresleri yükle
  useEffect(() => {
    if (!user) return;
    refreshMe().catch(() => {});
    endpoints
      .addresses()
      .then((res) => {
        setAddresses(res.addresses);
        const def = res.addresses.find((a) => a.isDefault);
        if (def) setAddressId(def.id);
      })
      .catch(() => {});
  }, [user]);

  // Puan indirimi
  useEffect(() => {
    if (!user || !usePoints) {
      setPointsDiscount(0);
      return;
    }
    if (pointsToRedeem < 100) return;
    endpoints
      .calcRedeem(pointsToRedeem)
      .then((res) => setPointsDiscount(res.discountAmount))
      .catch((e: any) => {
        Alert.alert("Puan", e?.message ?? "Puan kullanılamıyor");
        setUsePoints(false);
      });
  }, [usePoints, pointsToRedeem, user]);

  const handleManualLocation = async () => {
    setLocating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await getCurrentLocation();
      if (res.ok) {
        setManualLat(res.point.latitude);
        setManualLng(res.point.longitude);
        if (res.addressGuess && !manualAddress.trim()) {
          setManualAddress(res.addressGuess);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Konum", res.error);
      }
    } finally {
      setLocating(false);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    try {
      const res = await endpoints.validateCoupon(couponCode.trim(), cartTotal);
      if (res.valid) {
        setCouponDiscount(res.discount ?? 0);
      } else {
        setCouponDiscount(0);
        setCouponError(res.error ?? "Kupon geçersiz");
      }
    } catch (e: any) {
      setCouponDiscount(0);
      setCouponError(e?.message ?? "Kupon doğrulanamadı");
    }
  };

  const tipNumber =
    tipCustom.trim() && !isNaN(Number(tipCustom))
      ? Math.max(0, Number(tipCustom))
      : tip;
  const deliveryFee = orderType === "DELIVERY" ? DELIVERY_FEE : 0;
  // Auto offer sadece kupon + puan kullanılmamışsa devreye girer (backend ile aynı kural)
  const autoOfferActive =
    !!bestOffer &&
    !offerDismissed &&
    !couponDiscount &&
    !pointsDiscount;
  const autoOfferDiscount = autoOfferActive
    ? Number(bestOffer!.calculatedDiscount)
    : 0;
  const totalDiscount = pointsDiscount + couponDiscount + autoOfferDiscount;
  const subtotal = cartTotal;
  const finalTotal = Math.max(
    0,
    subtotal + deliveryFee + tipNumber - totalDiscount,
  );

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    if (submitting) return false;
    if (isGuest) {
      if (!guestName.trim() || guestPhone.replace(/\D/g, "").length < 10)
        return false;
    }
    if (orderType === "DELIVERY") {
      if (!addressId && !manualAddress.trim()) return false;
    }
    return true;
  }, [
    items.length,
    submitting,
    isGuest,
    guestName,
    guestPhone,
    orderType,
    addressId,
    manualAddress,
  ]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Cart items'ı menu item, bundle ve builder olarak ayır
      // Bundle ID formatı: "bundle:<bundleId>" veya "bundle:<bundleId>#<sel>"
      // Builder ID formatı: "builder:<type>:<baseId>:<ingredientIds.sorted>"
      // CartItemSelectedOption.groupId bundle için "<assignmentId>:<slotIndex>"
      const menuItemPayload: { menuItemId: string; quantity: number }[] = [];
      const bundlePayload: {
        bundleId: string;
        quantity: number;
        selections?: { assignmentId: string; slotIndex: number; optionGroupItemIds: string[] }[];
      }[] = [];
      const builderPayload: { cartId: string; price: number; quantity: number }[] = [];
      for (const it of items) {
        if (it.id.startsWith("builder:")) {
          // Builder cart item — backend builder-expansion.ts re-validate eder
          builderPayload.push({
            cartId: it.id,
            price: Number(it.price),
            quantity: it.qty,
          });
        } else if (it.id.startsWith("bundle:")) {
          const bundleId = it.id.replace(/^bundle:/, "").split("#")[0];
          // selectedOptions'tan slot key'e göre grupla (assignmentId:slotIndex)
          const bySlot = new Map<string, string[]>();
          for (const o of it.selectedOptions ?? []) {
            const arr = bySlot.get(o.groupId) ?? [];
            arr.push(o.itemId);
            bySlot.set(o.groupId, arr);
          }
          bundlePayload.push({
            bundleId,
            quantity: it.qty,
            selections: Array.from(bySlot.entries()).map(([slotKey, ids]) => {
              const [assignmentId, slotIndex] = slotKey.split(":");
              return {
                assignmentId,
                slotIndex: Number(slotIndex) || 0,
                optionGroupItemIds: ids,
              };
            }),
          });
        } else {
          menuItemPayload.push({ menuItemId: it.id, quantity: it.qty });
        }
      }

      let createdOrder: { id: string; total: string | number };
      if (isGuest) {
        // Guest endpoint
        const res = await endpoints.createGuestOrder({
          type: orderType,
          customerName: guestName.trim(),
          customerPhone: guestPhone.trim(),
          customerAddress:
            orderType === "DELIVERY" ? manualAddress.trim() : undefined,
          customerLatitude: manualLat ?? undefined,
          customerLongitude: manualLng ?? undefined,
          items: menuItemPayload,
          bundles: bundlePayload.length > 0 ? bundlePayload : undefined,
          builders: builderPayload.length > 0 ? builderPayload : undefined,
          notes: notes.trim() || undefined,
          tip: tipNumber || undefined,
          paymentMethod,
        });
        // Misafir token'ını sakla — sipariş takibi için
        await setToken(res.token);
        await setSession(res.token, {
          id: res.customer.id,
          phone: res.customer.phone,
          name: res.customer.name ?? undefined,
          isVerified: res.customer.isVerified,
        });
        createdOrder = res.order;
      } else {
        const res = await endpoints.createOrder({
          type: orderType,
          items: menuItemPayload,
          bundles: bundlePayload.length > 0 ? bundlePayload : undefined,
          builders: builderPayload.length > 0 ? builderPayload : undefined,
          ...(orderType === "DELIVERY"
            ? addressId
              ? { addressId }
              : {
                  customerAddress: manualAddress.trim(),
                  customerLatitude: manualLat ?? undefined,
                  customerLongitude: manualLng ?? undefined,
                }
            : {}),
          notes: notes.trim() || undefined,
          tip: tipNumber || undefined,
          pointsToRedeem:
            usePoints && pointsToRedeem >= 100 ? pointsToRedeem : undefined,
          couponCode: couponCode.trim() || undefined,
          paymentMethod,
        });
        createdOrder = res.order;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (paymentMethod === "ONLINE") {
        router.replace({
          pathname: "/checkout/payment",
          params: {
            orderId: createdOrder.id,
            amount: String(createdOrder.total),
            tipAmount: String(tipNumber),
          },
        });
      } else {
        clearCart();
        clearOfferStore();
        router.replace(`/orders/${createdOrder.id}`);
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg =
        e instanceof ApiError ? e.message : e?.message ?? "Sipariş oluşturulamadı";
      Alert.alert("Hata", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
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
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-base text-foreground-muted">Sepetin boş.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center px-5 pt-2 pb-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </Pressable>
          <Text className="ml-3 text-2xl font-extrabold text-foreground">
            Siparişi tamamla
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Misafir bilgileri */}
          {isGuest && (
            <View className="mb-5 rounded-2xl border-2 border-primary-100 bg-primary-50 p-4">
              <View className="flex-row items-center">
                <Ionicons name="information-circle" size={20} color="#bb1e10" />
                <Text className="ml-2 flex-1 text-sm font-bold text-primary-700">
                  Misafir olarak sipariş veriyorsun
                </Text>
              </View>
              <Text className="mt-1 text-xs text-foreground-muted">
                Üye ol, puan kazan ve siparişlerini her zaman takip et.
              </Text>
              <Link href="/auth/signup" asChild>
                <Pressable className="mt-2 self-start rounded-full bg-primary-500 px-3 py-1.5">
                  <Text className="text-xs font-bold text-white">
                    🆕 Üye ol
                  </Text>
                </Pressable>
              </Link>

              <View className="mt-3">
                <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
                  Ad Soyad
                </Text>
                <TextInput
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="Ahmet Yılmaz"
                  placeholderTextColor="#9a9a9a"
                  autoCapitalize="words"
                  className="rounded-xl border border-border-light bg-white px-3 py-2.5 text-sm text-foreground"
                />
              </View>

              <View className="mt-2">
                <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
                  Telefon
                </Text>
                <View className="flex-row items-center rounded-xl border border-border-light bg-white px-3">
                  <Text className="mr-1 text-sm font-semibold text-foreground">
                    +90
                  </Text>
                  <TextInput
                    value={guestPhone}
                    onChangeText={setGuestPhone}
                    keyboardType="phone-pad"
                    placeholder="555 555 55 55"
                    placeholderTextColor="#9a9a9a"
                    className="flex-1 py-2.5 text-sm text-foreground"
                    maxLength={11}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Order type */}
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground-muted">
            Sipariş tipi
          </Text>
          <View className="flex-row gap-2">
            {(["DELIVERY", "TAKEAWAY"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setOrderType(t)}
                className={`flex-1 rounded-2xl border-2 p-3 ${
                  orderType === t
                    ? "border-primary-500 bg-primary-50"
                    : "border-border-light bg-white"
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={t === "DELIVERY" ? "bicycle" : "bag-handle"}
                    size={20}
                    color={orderType === t ? "#bb1e10" : "#6b6b6b"}
                  />
                  <Text
                    className={`ml-2 text-sm font-bold ${
                      orderType === t ? "text-primary-600" : "text-foreground"
                    }`}
                  >
                    {t === "DELIVERY" ? "Eve Servis" : "Gel Al"}
                  </Text>
                </View>
                {t === "DELIVERY" && (
                  <Text className="mt-1 text-xs text-foreground-muted">
                    +{DELIVERY_FEE}₺ kurye ücreti
                  </Text>
                )}
              </Pressable>
            ))}
          </View>

          {/* Adres (DELIVERY) */}
          {orderType === "DELIVERY" && (
            <View className="mt-5">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
                  Teslimat adresi
                </Text>
                {!isGuest && (
                  <Link href="/addresses/new" asChild>
                    <Pressable>
                      <Text className="text-xs font-semibold text-primary-500">
                        + Yeni adres
                      </Text>
                    </Pressable>
                  </Link>
                )}
              </View>

              {!isGuest && addresses.length > 0 ? (
                <View className="gap-2">
                  {addresses.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => {
                        setAddressId(a.id);
                        setManualAddress("");
                      }}
                      className={`flex-row items-start rounded-2xl border-2 p-3 ${
                        addressId === a.id
                          ? "border-primary-500 bg-primary-50"
                          : "border-border-light bg-white"
                      }`}
                    >
                      <Ionicons
                        name="location"
                        size={18}
                        color={addressId === a.id ? "#bb1e10" : "#6b6b6b"}
                      />
                      <View className="ml-2 flex-1">
                        <View className="flex-row items-center">
                          <Text className="text-sm font-bold text-foreground">
                            {a.label}
                          </Text>
                          {a.isDefault && (
                            <View className="ml-2 rounded-full bg-accent-50 px-2">
                              <Text className="text-[10px] font-semibold text-accent-700">
                                Varsayılan
                              </Text>
                            </View>
                          )}
                          {a.latitude && (
                            <View className="ml-1 rounded-full bg-green-50 px-2">
                              <Text className="text-[10px] font-semibold text-green-700">
                                📍 GPS
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="mt-0.5 text-xs text-foreground-muted">
                          {a.fullAddress}
                          {a.district ? `, ${a.district}` : ""}
                          {a.city ? `, ${a.city}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  ))}

                  <Pressable
                    onPress={() => {
                      setAddressId(null);
                    }}
                    className={`flex-row items-center rounded-2xl border-2 border-dashed p-3 ${
                      !addressId
                        ? "border-primary-500 bg-primary-50"
                        : "border-border-light"
                    }`}
                  >
                    <Ionicons name="pencil" size={16} color="#6b6b6b" />
                    <Text className="ml-2 text-sm font-semibold text-foreground-muted">
                      Manuel adres gir
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Manual address (guest veya kayıtsız) */}
              {(isGuest || !addressId) && (
                <View className="mt-2 rounded-2xl border border-border-light p-3">
                  <Pressable
                    onPress={handleManualLocation}
                    disabled={locating}
                    className={`mb-2 flex-row items-center justify-center rounded-xl border-2 ${
                      manualLat
                        ? "border-green-300 bg-green-50"
                        : "border-primary-300 bg-primary-50"
                    } py-2.5`}
                  >
                    {locating ? (
                      <ActivityIndicator color="#bb1e10" />
                    ) : (
                      <>
                        <Ionicons
                          name={manualLat ? "checkmark-circle" : "navigate"}
                          size={18}
                          color={manualLat ? "#10b981" : "#bb1e10"}
                        />
                        <Text
                          className={`ml-2 text-sm font-bold ${
                            manualLat ? "text-green-700" : "text-primary-700"
                          }`}
                        >
                          {manualLat
                            ? "📍 Konum alındı"
                            : "📍 Şu anki konumumu kullan"}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <TextInput
                    value={manualAddress}
                    onChangeText={(t) => {
                      setManualAddress(t);
                      setAddressId(null);
                    }}
                    placeholder="Mahalle, sokak, bina no, daire..."
                    placeholderTextColor="#9a9a9a"
                    multiline
                    className="min-h-[60px] rounded-xl bg-surface px-3 py-2 text-sm text-foreground"
                  />
                </View>
              )}
            </View>
          )}

          {/* Bahşiş */}
          <View className="mt-5">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground-muted">
              Bahşiş
            </Text>
            <View className="flex-row gap-2">
              {TIP_PRESETS.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setTip(t);
                    setTipCustom("");
                  }}
                  className={`flex-1 items-center rounded-2xl border-2 py-3 ${
                    tip === t && !tipCustom
                      ? "border-primary-500 bg-primary-50"
                      : "border-border-light"
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      tip === t && !tipCustom
                        ? "text-primary-600"
                        : "text-foreground"
                    }`}
                  >
                    {t === 0 ? "Yok" : `${t}₺`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={tipCustom}
              onChangeText={setTipCustom}
              placeholder="Manuel tutar (₺)"
              placeholderTextColor="#9a9a9a"
              keyboardType="number-pad"
              className="mt-2 rounded-xl bg-surface px-4 py-2.5 text-sm text-foreground"
            />
          </View>

          {/* Puan kullan (sadece login user) */}
          {!isGuest && user && (user.totalPoints ?? 0) >= 100 && (
            <View className="mt-5 rounded-2xl border border-border-light p-3">
              <Pressable
                onPress={() => {
                  setUsePoints((v) => !v);
                  setPointsToRedeem(100);
                }}
                className="flex-row items-center"
              >
                <Ionicons
                  name={usePoints ? "checkbox" : "square-outline"}
                  size={22}
                  color={usePoints ? "#bb1e10" : "#9a9a9a"}
                />
                <View className="ml-2 flex-1">
                  <Text className="text-sm font-bold text-foreground">
                    Puanımı kullan
                  </Text>
                  <Text className="text-xs text-foreground-muted">
                    {user.totalPoints} puan • 100 puan = 10₺ indirim
                  </Text>
                </View>
              </Pressable>

              {usePoints && (
                <View className="mt-3">
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() =>
                        setPointsToRedeem((p) => Math.max(100, p - 100))
                      }
                      className="h-9 w-9 items-center justify-center rounded-full bg-surface"
                    >
                      <Ionicons name="remove" size={18} color="#1a1a1a" />
                    </Pressable>
                    <Text className="mx-3 flex-1 text-center text-base font-bold text-foreground">
                      {pointsToRedeem} puan
                    </Text>
                    <Pressable
                      onPress={() =>
                        setPointsToRedeem((p) =>
                          Math.min(
                            Math.floor((user.totalPoints ?? 0) / 100) * 100,
                            p + 100,
                          ),
                        )
                      }
                      className="h-9 w-9 items-center justify-center rounded-full bg-surface"
                    >
                      <Ionicons name="add" size={18} color="#1a1a1a" />
                    </Pressable>
                  </View>
                  <Text className="mt-2 text-center text-xs font-semibold text-primary-600">
                    {pointsDiscount.toFixed(2)}₺ indirim uygulanacak
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Kupon (sadece login user) */}
          {!isGuest && (
            <View className="mt-5">
              <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground-muted">
                Kupon kodu
              </Text>
              <View className="flex-row items-center rounded-2xl bg-surface px-3">
                <Ionicons name="pricetag-outline" size={18} color="#6b6b6b" />
                <TextInput
                  value={couponCode}
                  onChangeText={(t) => {
                    setCouponCode(t);
                    setCouponError(null);
                    setCouponDiscount(0);
                  }}
                  placeholder="Örn. YENI2026"
                  placeholderTextColor="#9a9a9a"
                  autoCapitalize="characters"
                  className="ml-2 flex-1 py-3 text-sm text-foreground"
                />
                <Pressable onPress={validateCoupon}>
                  <Text className="text-sm font-semibold text-primary-500">
                    Uygula
                  </Text>
                </Pressable>
              </View>
              {couponDiscount > 0 && (
                <Text className="mt-1 text-xs font-semibold text-green-600">
                  ✓ {couponDiscount.toFixed(2)}₺ indirim uygulandı
                </Text>
              )}
              {couponError && (
                <Text className="mt-1 text-xs text-red-600">{couponError}</Text>
              )}
            </View>
          )}

          {/* Notes */}
          <View className="mt-5">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground-muted">
              Sipariş notu (opsiyonel)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Kapı kodu, soğuk olmasın, vb."
              placeholderTextColor="#9a9a9a"
              multiline
              className="min-h-[60px] rounded-xl bg-surface px-3 py-2 text-sm text-foreground"
            />
          </View>

          {/* Payment method */}
          <View className="mt-5">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground-muted">
              Ödeme yöntemi
            </Text>
            <View className="gap-2">
              {(
                [
                  {
                    v: "ONLINE",
                    icon: "card",
                    label: "Online ödeme (3DS güvenli)",
                    desc: "Anında onay",
                  },
                  {
                    v: "CASH",
                    icon: "cash",
                    label: "Kapıda ödeme",
                    desc: "Nakit veya kart",
                  },
                ] as const
              ).map((p) => (
                <Pressable
                  key={p.v}
                  onPress={() => setPaymentMethod(p.v)}
                  className={`flex-row items-center rounded-2xl border-2 p-3 ${
                    paymentMethod === p.v
                      ? "border-primary-500 bg-primary-50"
                      : "border-border-light"
                  }`}
                >
                  <Ionicons
                    name={p.icon as any}
                    size={20}
                    color={paymentMethod === p.v ? "#bb1e10" : "#6b6b6b"}
                  />
                  <View className="ml-2 flex-1">
                    <Text
                      className={`text-sm font-bold ${
                        paymentMethod === p.v
                          ? "text-primary-600"
                          : "text-foreground"
                      }`}
                    >
                      {p.label}
                    </Text>
                    <Text className="text-xs text-foreground-muted">
                      {p.desc}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Özet */}
          <View className="mt-6 rounded-2xl bg-surface p-4">
            <Row label="Ara toplam" value={`${subtotal.toFixed(2)}₺`} />
            {orderType === "DELIVERY" && (
              <Row label="Kurye ücreti" value={`${DELIVERY_FEE.toFixed(2)}₺`} />
            )}
            {tipNumber > 0 && (
              <Row label="Bahşiş" value={`${tipNumber.toFixed(2)}₺`} />
            )}
            {pointsDiscount > 0 && (
              <Row
                label="Puan indirimi"
                value={`-${pointsDiscount.toFixed(2)}₺`}
                positive
              />
            )}
            {couponDiscount > 0 && (
              <Row
                label="Kupon indirimi"
                value={`-${couponDiscount.toFixed(2)}₺`}
                positive
              />
            )}
            {autoOfferActive && (
              <Row
                label={`🎁 ${bestOffer?.name ?? "Otomatik indirim"}`}
                value={`-${autoOfferDiscount.toFixed(2)}₺`}
                positive
              />
            )}
            <View className="mt-2 border-t border-border-light pt-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-foreground">
                  Toplam
                </Text>
                <Text className="text-2xl font-extrabold text-primary-600">
                  {finalTotal.toFixed(2)}₺
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Submit */}
        <View className="border-t border-border-light px-5 pb-2 pt-3">
          <Pressable
            disabled={!canSubmit}
            onPress={handleSubmit}
            className={`items-center rounded-full py-4 ${
              canSubmit ? "bg-primary-500" : "bg-border"
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">
                {paymentMethod === "ONLINE"
                  ? `Ödemeye geç • ${finalTotal.toFixed(2)}₺`
                  : `Siparişi onayla • ${finalTotal.toFixed(2)}₺`}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <View className="mb-1 flex-row items-center justify-between">
      <Text className="text-sm text-foreground-muted">{label}</Text>
      <Text
        className={`text-sm font-semibold ${
          positive ? "text-green-600" : "text-foreground"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
