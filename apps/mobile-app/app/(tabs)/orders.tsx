import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";

import { endpoints, ApiOrder, OrderStatus, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/error-handler";

const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING: { label: "Alındı", color: "#92400E", bg: "#FEF3C7", icon: "time-outline" },
  CONFIRMED: { label: "Onaylandı", color: "#1D4ED8", bg: "#DBEAFE", icon: "checkmark-circle-outline" },
  PREPARING: { label: "Hazırlanıyor", color: "#9A3412", bg: "#FED7AA", icon: "flame-outline" },
  READY: { label: "Hazır", color: "#065F46", bg: "#D1FAE5", icon: "restaurant-outline" },
  OUT_FOR_DELIVERY: { label: "Yolda", color: "#7C2D12", bg: "#FECACA", icon: "bicycle-outline" },
  DELIVERED: { label: "Teslim edildi", color: "#065F46", bg: "#D1FAE5", icon: "checkmark-done-outline" },
  SERVED: { label: "Servis edildi", color: "#065F46", bg: "#D1FAE5", icon: "checkmark-done-outline" },
  COMPLETED: { label: "Tamamlandı", color: "#1F2937", bg: "#E5E7EB", icon: "archive-outline" },
  CANCELLED: { label: "İptal edildi", color: "#991B1B", bg: "#FEE2E2", icon: "close-circle-outline" },
};

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Masada",
  TAKEAWAY: "Gel Al",
  DELIVERY: "Eve Servis",
};

const TABS = [
  { id: "active", label: "Aktif" },
  { id: "all", label: "Hepsi" },
] as const;

const ACTIVE_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "SERVED",
];

export default function OrdersScreen() {
  const user = useAuth((s) => s.user);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "all">("active");

  const refresh = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await endpoints.myOrders({ limit: 50 });
      setOrders(res.orders);
    } catch (e: any) {
      // 401 ise sessiz handle (auth hatası), diğerleri sayfada error olarak göster
      if (e instanceof ApiError && (e.code === "AUTH_REQUIRED" || e.code === "TOKEN_EXPIRED")) {
        handleApiError(e);
      } else {
        setError(e?.message ?? "Yüklenemedi");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Tab focus'ta refresh + 10sn'de bir auto-refresh
  useFocusEffect(
    useCallback(() => {
      refresh();
      const id = setInterval(() => {
        refresh();
      }, 10_000);
      return () => clearInterval(id);
    }, [refresh]),
  );

  const filtered =
    tab === "active"
      ? orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
      : orders;

  if (!user) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="px-5 pt-2 pb-3">
          <Text className="text-2xl font-extrabold text-foreground">
            Siparişlerim
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-50">
            <Ionicons name="receipt-outline" size={48} color="#bb1e10" />
          </View>
          <Text className="mt-4 text-lg font-bold text-foreground">
            Önce giriş yap
          </Text>
          <Text className="mt-1 text-center text-sm text-foreground-muted">
            Siparişlerini görmek için hesabına giriş yapman gerek.
          </Text>
          <Link href="/auth/login" asChild>
            <Pressable className="mt-6 rounded-full bg-primary-500 px-6 py-3">
              <Text className="font-bold text-white">Giriş yap</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="px-5 pt-2 pb-2">
        <Text className="text-2xl font-extrabold text-foreground">
          Siparişlerim
        </Text>
      </View>

      {/* Tabs */}
      <View className="mb-2 flex-row gap-2 px-5">
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 ${
              tab === t.id ? "bg-primary-500" : "bg-surface"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                tab === t.id ? "text-white" : "text-foreground-muted"
              }`}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: 6 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#bb1e10"
          />
        }
      >
        {loading && orders.length === 0 ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#bb1e10" />
          </View>
        ) : error ? (
          <View className="items-center rounded-3xl bg-surface px-6 py-10">
            <Text className="text-3xl">⚠️</Text>
            <Text className="mt-2 text-sm font-semibold text-foreground">
              {error}
            </Text>
            <Pressable
              onPress={refresh}
              className="mt-3 rounded-full bg-primary-500 px-4 py-2"
            >
              <Text className="text-xs font-bold text-white">Tekrar dene</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center rounded-3xl bg-surface px-6 py-12">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
              <Ionicons name="receipt-outline" size={40} color="#bb1e10" />
            </View>
            <Text className="mt-3 text-base font-bold text-foreground">
              {tab === "active"
                ? "Aktif siparişin yok"
                : "Henüz siparişin yok"}
            </Text>
            <Text className="mt-1 text-center text-xs text-foreground-muted">
              Menüden lezzetli yemekler seçip sipariş verebilirsin.
            </Text>
            <Link href="/(tabs)/menu" asChild>
              <Pressable className="mt-4 rounded-full bg-primary-500 px-5 py-2.5">
                <Text className="text-sm font-bold text-white">Menüye git</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          filtered.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => router.push(`/orders/${o.id}`)}
              className="mb-3 rounded-2xl border border-border-light bg-white p-4"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
                  #{o.orderNumber} • {TYPE_LABEL[o.type] ?? o.type}
                </Text>
                <StatusBadge status={o.status} />
              </View>

              <Text className="mt-1.5 text-sm text-foreground" numberOfLines={1}>
                {o.items
                  .map((i) => `${i.quantity}× ${i.menuItem?.name ?? "Ürün"}`)
                  .join(", ")}
              </Text>

              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs text-foreground-muted">
                  {new Date(o.createdAt).toLocaleString("tr-TR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text className="text-base font-extrabold text-primary-600">
                  {Number(o.total).toFixed(2)} ₺
                </Text>
              </View>

              {o.courier && (
                <View className="mt-2 flex-row items-center rounded-xl bg-accent-50 px-3 py-1.5">
                  <Ionicons name="bicycle" size={14} color="#005387" />
                  <Text className="ml-2 text-xs font-semibold text-accent-700">
                    Kurye: {o.courier.name}
                  </Text>
                </View>
              )}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <View
      style={{ backgroundColor: meta.bg }}
      className="flex-row items-center rounded-full px-2.5 py-1"
    >
      <Ionicons name={meta.icon} size={12} color={meta.color} />
      <Text style={{ color: meta.color }} className="ml-1 text-[10px] font-bold">
        {meta.label}
      </Text>
    </View>
  );
}
