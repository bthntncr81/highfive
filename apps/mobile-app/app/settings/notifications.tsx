import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { endpoints, ApiNotificationPreferences } from "@/lib/api";

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<ApiNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await endpoints.notificationPrefs();
        setPrefs(res.preferences);
      } catch (e: any) {
        Alert.alert("Hata", e?.message ?? "Yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = async (patch: Partial<ApiNotificationPreferences>) => {
    if (!prefs) return;
    const optimistic = { ...prefs, ...patch };
    setPrefs(optimistic);
    setSaving(true);
    try {
      const res = await endpoints.updateNotificationPrefs(patch);
      setPrefs(res.preferences);
    } catch (e: any) {
      // Hata: orijinaline geri al
      setPrefs(prefs);
      Alert.alert("Hata", e?.message ?? "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#bb1e10" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="ml-3 text-2xl font-extrabold text-foreground">
          Bildirim tercihleri
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Master switch */}
        <View className="rounded-3xl bg-primary-500 p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-bold text-white">
                Push bildirimleri
              </Text>
              <Text className="mt-0.5 text-xs text-white/80">
                Tüm bildirimleri açar/kapatır
              </Text>
            </View>
            <Switch
              value={prefs.pushEnabled}
              onValueChange={(v) => update({ pushEnabled: v })}
              trackColor={{ false: "#fecaca", true: "#fbbf24" }}
              thumbColor={prefs.pushEnabled ? "#fff" : "#fff"}
            />
          </View>
        </View>

        {/* Detail toggles */}
        <View className="mt-4 overflow-hidden rounded-2xl border border-border-light bg-white">
          <PrefRow
            icon="receipt"
            label="Sipariş durumu"
            description="Sipariş alındı, hazırlanıyor, teslim edildi"
            value={prefs.orderStatus}
            disabled={!prefs.pushEnabled}
            onChange={(v) => update({ orderStatus: v })}
          />
          <Sep />
          <PrefRow
            icon="megaphone"
            label="Kampanyalar"
            description="Yeni kampanya ve happy hour duyuruları"
            value={prefs.campaigns}
            disabled={!prefs.pushEnabled}
            onChange={(v) => update({ campaigns: v })}
          />
          <Sep />
          <PrefRow
            icon="star"
            label="Sadakat puanları"
            description="Puan kazanım ve seviye atlama bildirimleri"
            value={prefs.loyalty}
            disabled={!prefs.pushEnabled}
            onChange={(v) => update({ loyalty: v })}
          />
          <Sep />
          <PrefRow
            icon="mail"
            label="Pazarlama"
            description="Genel duyurular ve özel teklifler"
            value={prefs.marketing}
            disabled={!prefs.pushEnabled}
            onChange={(v) => update({ marketing: v })}
          />
        </View>

        {saving && (
          <Text className="mt-3 text-center text-xs text-foreground-muted">
            Kaydediliyor...
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PrefRow({
  icon,
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View
      className="flex-row items-center px-4 py-4"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
        <Ionicons name={icon} size={18} color="#bb1e10" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-foreground">{label}</Text>
        <Text className="mt-0.5 text-[11px] text-foreground-muted">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#e5e7eb", true: "#bb1e10" }}
        thumbColor="#fff"
      />
    </View>
  );
}

function Sep() {
  return <View className="h-px bg-border-light" />;
}
