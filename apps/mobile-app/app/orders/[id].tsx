import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { endpoints, ApiOrder, OrderStatus, imageUrl } from "@/lib/api";
import { useOrderSocket } from "@/lib/ws";

type Step = {
  status: OrderStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const DELIVERY_STEPS: Step[] = [
  { status: "PENDING", label: "Sipariş alındı", icon: "receipt-outline" },
  { status: "CONFIRMED", label: "Onaylandı", icon: "checkmark-circle-outline" },
  { status: "PREPARING", label: "Hazırlanıyor", icon: "flame-outline" },
  { status: "READY", label: "Hazır", icon: "restaurant-outline" },
  { status: "OUT_FOR_DELIVERY", label: "Kurye yolda", icon: "bicycle-outline" },
  { status: "DELIVERED", label: "Teslim edildi", icon: "checkmark-done-outline" },
];

const TAKEAWAY_STEPS: Step[] = [
  { status: "PENDING", label: "Sipariş alındı", icon: "receipt-outline" },
  { status: "CONFIRMED", label: "Onaylandı", icon: "checkmark-circle-outline" },
  { status: "PREPARING", label: "Hazırlanıyor", icon: "flame-outline" },
  { status: "READY", label: "Almaya gel", icon: "bag-handle-outline" },
  { status: "COMPLETED", label: "Teslim alındı", icon: "checkmark-done-outline" },
];

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const res = await endpoints.orderDetail(String(id));
      setOrder(res.order);
    } catch (e: any) {
      setError(e?.message ?? "Sipariş yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 8sn'de bir backup polling (WS bağlantısı kopsa bile güncel kal)
  useEffect(() => {
    const id = setInterval(() => {
      refresh();
    }, 8_000);
    return () => clearInterval(id);
  }, [refresh]);

  // WebSocket: status değiştiğinde anlık güncelle
  useOrderSocket(order?.id ?? null, (msg) => {
    if (msg.type === "ORDER_UPDATED" || msg.type === "ORDER_READY") {
      refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const handleCancel = () => {
    if (!order) return;
    Alert.alert(
      "Siparişi iptal et",
      "Siparişini iptal etmek istediğinden emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "İptal et",
          style: "destructive",
          onPress: async () => {
            try {
              await endpoints.cancelOrder(order.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              refresh();
            } catch (e: any) {
              Alert.alert("Hata", e?.message ?? "İptal edilemedi");
            }
          },
        },
      ],
    );
  };

  if (loading && !order) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#bb1e10" size="large" />
      </SafeAreaView>
    );
  }

  if (error || !order) {
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
          <Text className="text-3xl">⚠️</Text>
          <Text className="mt-2 text-base font-bold text-foreground">
            {error ?? "Sipariş bulunamadı"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const steps = order.type === "DELIVERY" ? DELIVERY_STEPS : TAKEAWAY_STEPS;
  const currentIdx = steps.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text className="text-lg font-bold text-foreground">
            Sipariş #{order.orderNumber}
          </Text>
          <Text className="text-xs text-foreground-muted">
            {new Date(order.createdAt).toLocaleString("tr-TR")}
          </Text>
        </View>
        <Pressable onPress={refresh} className="p-2">
          <Ionicons name="refresh" size={20} color="#6b6b6b" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#bb1e10"
          />
        }
      >
        {/* Status Timeline */}
        {isCancelled ? (
          <View className="rounded-3xl bg-red-50 p-5">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Ionicons name="close-circle" size={28} color="#dc2626" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-red-800">
                  Sipariş iptal edildi
                </Text>
                <Text className="text-xs text-red-700">
                  Bu sipariş iptal edilmiş.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="rounded-3xl bg-surface p-5">
            <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground-muted">
              Sipariş takibi
            </Text>
            {steps.map((step, idx) => {
              const isDone = idx <= currentIdx;
              const isActive = idx === currentIdx;
              return (
                <View key={step.status} className="flex-row">
                  {/* Indicator */}
                  <View className="items-center">
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-full ${
                        isDone ? "bg-primary-500" : "bg-border-light"
                      }`}
                    >
                      <Ionicons
                        name={step.icon}
                        size={18}
                        color={isDone ? "#fff" : "#9CA3AF"}
                      />
                    </View>
                    {idx < steps.length - 1 && (
                      <View
                        className={`my-1 w-0.5 flex-1 ${
                          idx < currentIdx ? "bg-primary-500" : "bg-border-light"
                        }`}
                        style={{ minHeight: 24 }}
                      />
                    )}
                  </View>
                  <View className="ml-3 flex-1 pb-4">
                    <Text
                      className={`text-sm font-bold ${
                        isActive
                          ? "text-primary-600"
                          : isDone
                          ? "text-foreground"
                          : "text-foreground-muted"
                      }`}
                    >
                      {step.label}
                    </Text>
                    {isActive && (
                      <Text className="mt-0.5 text-xs text-primary-600">
                        Şu an bu adımdayız
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Kurye kartı */}
        {order.courier && (order.status === "OUT_FOR_DELIVERY" || order.status === "DELIVERED") && (
          <View className="mt-5 rounded-3xl bg-accent-50 p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-accent-700">
              Kurye
            </Text>
            <View className="mt-2 flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-accent-500">
                <Ionicons name="bicycle" size={22} color="#fff" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-foreground">
                  {order.courier.name}
                </Text>
                {order.pickedUpAt && (
                  <Text className="text-xs text-foreground-muted">
                    {new Date(order.pickedUpAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}'da yola çıktı
                  </Text>
                )}
              </View>
              {order.courier.phone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${order.courier!.phone}`)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-accent-500"
                >
                  <Ionicons name="call" size={20} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Adres */}
        {order.customerAddress && (
          <View className="mt-5 rounded-2xl border border-border-light p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
              Teslimat adresi
            </Text>
            <View className="mt-2 flex-row items-start">
              <Ionicons name="location" size={16} color="#bb1e10" />
              <Text className="ml-2 flex-1 text-sm text-foreground">
                {order.customerAddress}
              </Text>
            </View>
          </View>
        )}

        {/* Items */}
        <View className="mt-5">
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground-muted">
            Ürünler ({order.items.length})
          </Text>
          {order.items.map((it) => {
            const img = it.menuItem?.image ? imageUrl(it.menuItem.image) : null;
            return (
              <View
                key={it.id}
                className="mb-2 flex-row items-center rounded-2xl border border-border-light bg-white p-3"
              >
                {img ? (
                  <Image
                    source={{ uri: img }}
                    style={{ width: 50, height: 50, borderRadius: 10 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                    <Text className="text-2xl">🍽️</Text>
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-foreground">
                    {it.menuItem?.name ?? it.menuItemName ?? "Ürün"}
                  </Text>
                  <Text className="text-xs text-foreground-muted">
                    {it.quantity}× {Number(it.unitPrice).toFixed(2)}₺
                  </Text>
                  {it.notes && (
                    <Text className="mt-0.5 text-[11px] italic text-foreground-muted">
                      Not: {it.notes}
                    </Text>
                  )}
                </View>
                <Text className="text-sm font-bold text-foreground">
                  {Number(it.total).toFixed(2)}₺
                </Text>
              </View>
            );
          })}
        </View>

        {/* Toplam */}
        <View className="mt-5 rounded-2xl bg-surface p-4">
          <SummaryRow label="Ara toplam" value={`${Number(order.subtotal).toFixed(2)}₺`} />
          {Number(order.tax) > 0 && (
            <SummaryRow label="Vergi" value={`${Number(order.tax).toFixed(2)}₺`} />
          )}
          {Number(order.deliveryFee) > 0 && (
            <SummaryRow label="Kurye ücreti" value={`${Number(order.deliveryFee).toFixed(2)}₺`} />
          )}
          {Number(order.tip) > 0 && (
            <SummaryRow label="Bahşiş" value={`${Number(order.tip).toFixed(2)}₺`} />
          )}
          {Number(order.discount) > 0 && (
            <SummaryRow
              label="İndirim"
              value={`-${Number(order.discount).toFixed(2)}₺`}
              positive
            />
          )}
          <View className="mt-2 flex-row items-center justify-between border-t border-border-light pt-2">
            <Text className="text-base font-extrabold text-foreground">
              Toplam
            </Text>
            <Text className="text-2xl font-extrabold text-primary-600">
              {Number(order.total).toFixed(2)}₺
            </Text>
          </View>
        </View>

        {/* Puan kazanım/harcama bilgisi */}
        {((order.pointsEarned ?? 0) > 0 || (order.pointsSpent ?? 0) > 0) && (
          <View className="mt-3 rounded-2xl border border-primary-100 bg-primary-50 p-4">
            <View className="flex-row items-center">
              <Ionicons name="star" size={18} color="#bb1e10" />
              <Text className="ml-2 flex-1 text-sm font-bold text-primary-700">
                Puanlar
              </Text>
            </View>
            {(order.pointsEarned ?? 0) > 0 && (
              <Text className="mt-1 text-xs text-foreground-muted">
                ✨ Bu siparişten {order.pointsEarned} puan kazanırsın
              </Text>
            )}
            {(order.pointsSpent ?? 0) > 0 && (
              <Text className="mt-1 text-xs text-foreground-muted">
                💸 {order.pointsSpent} puan kullanıldı
              </Text>
            )}
          </View>
        )}

        {/* Notlar */}
        {order.notes && (
          <View className="mt-3 rounded-2xl border border-border-light p-4">
            <Text className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
              Sipariş notu
            </Text>
            <Text className="mt-1 text-sm text-foreground">{order.notes}</Text>
          </View>
        )}

        {/* İptal et */}
        {order.status === "PENDING" && (
          <Pressable
            onPress={handleCancel}
            className="mt-5 items-center rounded-2xl border border-red-300 py-4"
          >
            <Text className="text-sm font-bold text-red-600">
              Siparişi iptal et
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({
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
