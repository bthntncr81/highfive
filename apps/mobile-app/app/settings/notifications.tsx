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
import { handleApiError } from "@/lib/error-handler";

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
        handleApiError(e);
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

        {/* E-posta + SMS pazarlama izinleri (KVKK ayrı) */}
        <View className="mt-6 mb-2">
          <Text className="text-xs uppercase tracking-widest text-foreground-muted">
            E-posta ve SMS Pazarlama
          </Text>
          <Text className="mt-1 text-[11px] text-foreground-muted">
            Açık rıza ile iletilen kampanya, indirim ve duyuru bildirimleri.
            Dilediğin zaman geri çekebilirsin.
          </Text>
        </View>
        <View className="overflow-hidden rounded-2xl bg-white border border-border-light">
          <MarketingPrefRow
            icon="mail-open"
            label="E-posta"
            description="Kampanya ve indirimler e-posta ile gelsin"
          />
          <MarketingPrefRow
            icon="chatbubble-ellipses"
            label="SMS"
            description="Önemli kampanyalar SMS ile gelsin"
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

function MarketingPrefRow({
  icon,
  label,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}) {
  const [me, setMe] = useState<{ emailConsent: boolean; smsConsent: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    endpoints
      .me()
      .then((res: any) =>
        setMe({
          emailConsent: !!res.user.emailConsent,
          smsConsent: !!res.user.smsConsent,
        }),
      )
      .catch(() => {});
  }, []);

  if (!me) {
    return (
      <View className="flex-row items-center p-4">
        <Ionicons name={icon} size={20} color="#9a9a9a" />
        <Text className="ml-3 flex-1 text-sm text-foreground-muted">
          Yükleniyor...
        </Text>
      </View>
    );
  }

  const field = label === "E-posta" ? "emailConsent" : "smsConsent";
  const value = me[field as "emailConsent" | "smsConsent"];

  const onToggle = async (v: boolean) => {
    setBusy(true);
    try {
      await endpoints.updateMe({ [field]: v } as any);
      setMe({ ...me, [field]: v });
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-row items-center p-4 border-b border-border-light last:border-0">
      <Ionicons name={icon} size={20} color="#bb1e10" />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-foreground">{label}</Text>
        <Text className="mt-0.5 text-xs text-foreground-muted">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={busy}
        trackColor={{ false: "#e5e7eb", true: "#bb1e10" }}
        thumbColor="#fff"
      />
    </View>
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
