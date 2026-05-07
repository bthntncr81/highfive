// Anasayfa'da aktif (henüz tamamlanmamış) müşteri siparişi kartı
// Yoksa null döner. WS yok ama 10sn polling ile güncellenir.
import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { endpoints, ApiOrder, OrderStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const ACTIVE_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "SERVED",
];

const STATUS_META: Record<
  string,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    progress: number;
  }
> = {
  PENDING: {
    label: "Sipariş alındı",
    icon: "receipt-outline",
    color: "#92400E",
    bg: "#FEF3C7",
    progress: 15,
  },
  CONFIRMED: {
    label: "Onaylandı",
    icon: "checkmark-circle-outline",
    color: "#1D4ED8",
    bg: "#DBEAFE",
    progress: 30,
  },
  PREPARING: {
    label: "Hazırlanıyor",
    icon: "flame-outline",
    color: "#9A3412",
    bg: "#FED7AA",
    progress: 55,
  },
  READY: {
    label: "Hazır",
    icon: "restaurant-outline",
    color: "#065F46",
    bg: "#D1FAE5",
    progress: 80,
  },
  OUT_FOR_DELIVERY: {
    label: "Kurye yolda",
    icon: "bicycle",
    color: "#7C2D12",
    bg: "#FECACA",
    progress: 90,
  },
  SERVED: {
    label: "Servis edildi",
    icon: "checkmark-done-outline",
    color: "#065F46",
    bg: "#D1FAE5",
    progress: 100,
  },
};

export function ActiveOrderCard() {
  const user = useAuth((s) => s.user);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchActive = useCallback(async () => {
    if (!user) {
      setOrder(null);
      return;
    }
    try {
      const res = await endpoints.myOrders({ limit: 5 });
      const active = res.orders.find((o) =>
        ACTIVE_STATUSES.includes(o.status as OrderStatus),
      );
      setOrder(active ?? null);
    } catch {
      // sessiz
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchActive();
  }, [fetchActive]);

  // Sayfa focus'ta + 10sn polling
  useFocusEffect(
    useCallback(() => {
      fetchActive();
      const id = setInterval(fetchActive, 10_000);
      return () => clearInterval(id);
    }, [fetchActive]),
  );

  // Kullanıcı yok veya aktif sipariş yok → kart gizli
  if (!user) return null;
  if (!order) {
    if (loading) {
      return (
        <View className="mx-5 mt-3 rounded-3xl bg-surface p-4">
          <ActivityIndicator color="#bb1e10" />
        </View>
      );
    }
    return null;
  }

  const meta = STATUS_META[order.status] ?? STATUS_META.PENDING;
  const itemCount = order.items.reduce((n, it) => n + it.quantity, 0);
  const firstItem = order.items[0];

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/orders/${order.id}`);
      }}
      className="mx-5 mt-3 overflow-hidden rounded-3xl border-2 border-primary-200 bg-primary-50"
    >
      {/* Top row: status badge + sipariş no */}
      <View className="flex-row items-center justify-between px-4 pt-3">
        <View
          style={{ backgroundColor: meta.bg }}
          className="flex-row items-center rounded-full px-2.5 py-1"
        >
          <Ionicons name={meta.icon} size={14} color={meta.color} />
          <Text
            style={{ color: meta.color }}
            className="ml-1.5 text-xs font-extrabold"
          >
            {meta.label}
          </Text>
        </View>
        <Text className="text-[11px] font-bold text-foreground-muted">
          #{order.orderNumber}
        </Text>
      </View>

      {/* Item summary */}
      <View className="px-4 pt-3">
        <Text className="text-base font-extrabold text-foreground">
          {firstItem?.menuItem?.name ?? firstItem?.menuItemName ?? "Sipariş"}
          {itemCount > 1 && (
            <Text className="text-sm font-semibold text-foreground-muted">
              {" "}
              + {itemCount - 1} ürün
            </Text>
          )}
        </Text>
        <Text className="mt-0.5 text-xs text-foreground-muted">
          Toplam: {Number(order.total).toFixed(2)}₺
          {order.type === "DELIVERY" && " • Eve Servis"}
          {order.type === "TAKEAWAY" && " • Gel Al"}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="px-4 pt-3">
        <View className="h-1.5 overflow-hidden rounded-full bg-white">
          <View
            style={{
              width: `${meta.progress}%`,
              backgroundColor: "#bb1e10",
            }}
            className="h-full rounded-full"
          />
        </View>
      </View>

      {/* CTA */}
      <View className="mt-3 flex-row items-center justify-between border-t border-primary-100 bg-white/60 px-4 py-2.5">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={14} color="#bb1e10" />
          <Text className="ml-1.5 text-[11px] font-semibold text-primary-700">
            Canlı takip
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-xs font-bold text-primary-600">
            Detayı gör
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color="#bb1e10"
            style={{ marginLeft: 2 }}
          />
        </View>
      </View>

      {/* Kurye bilgisi varsa alta */}
      {order.courier && order.status === "OUT_FOR_DELIVERY" && (
        <View className="bg-accent-500 px-4 py-2">
          <View className="flex-row items-center">
            <Ionicons name="bicycle" size={14} color="#fff" />
            <Text className="ml-2 text-[11px] font-bold text-white">
              Kurye: {order.courier.name}
              {order.courier.phone && ` • ${order.courier.phone}`}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
