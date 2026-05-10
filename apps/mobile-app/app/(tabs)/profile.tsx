import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href?: string;
  action?: () => void;
};

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const refreshMe = useAuth((s) => s.refreshMe);

  useEffect(() => {
    if (user) refreshMe().catch(() => {});
  }, []);

  const rows: Row[] = [
    { icon: "person-outline", label: "Hesap bilgilerim", href: "/profile/edit" },
    { icon: "location-outline", label: "Adreslerim", href: "/addresses" },
    { icon: "heart-outline", label: "Favorilerim", href: "/favorites" },
    { icon: "star-outline", label: "Sadakat puanları", href: "/loyalty" },
    {
      icon: "notifications-outline",
      label: "Bildirim tercihleri",
      href: "/settings/notifications",
    },
    {
      icon: "help-circle-outline",
      label: "Yardım",
      action: () =>
        Alert.alert("Yardım", "Bizi 0 555 243 81 81 numarasından arayabilirsiniz."),
    },
    {
      icon: "document-text-outline",
      label: "Sözleşmeler & KVKK",
      href: "/legal",
    },
  ];

  const handleLogout = () => {
    Alert.alert("Çıkış yap", "Hesabından çıkış yapılsın mı?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış yap", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="px-5 pt-2 pb-3">
        <Text className="text-2xl font-extrabold text-foreground">Profil</Text>
      </View>

      <ScrollView className="flex-1">
        {user ? (
          <Pressable onPress={() => router.push("/loyalty")}>
            <View className="mx-5 mb-4 rounded-3xl bg-primary-500 p-5">
              <View className="flex-row items-center">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-white/20">
                  <Ionicons name="person" size={28} color="#fff" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold text-white">
                    {user.name || "İsim ekle"}
                  </Text>
                  <Text className="text-xs text-white/80">+90 {user.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </View>
              <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-white/15 p-3">
                <View className="flex-row items-center">
                  <Ionicons name="star" size={18} color="#F59E0B" />
                  <Text className="ml-1.5 text-sm font-bold text-white">
                    {user.totalPoints ?? 0} puan
                  </Text>
                </View>
                <Text className="text-[11px] text-white/80">
                  Detaylar →
                </Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <View className="mx-5 mb-4 rounded-3xl bg-primary-50 p-4">
            <View className="flex-row items-center">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-500">
                <Ionicons name="person" size={28} color="#fff" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-foreground">
                  Hoş geldin!
                </Text>
                <Text className="text-xs text-foreground-muted">
                  Üye ol, puan kazan ve kampanyaları kaçırma
                </Text>
              </View>
            </View>
            <View className="mt-3 flex-row gap-2">
              <Link href="/auth/signup" asChild>
                <Pressable className="flex-1 items-center rounded-full bg-primary-500 py-2.5">
                  <Text className="text-xs font-bold text-white">🆕 Üye ol</Text>
                </Pressable>
              </Link>
              <Link href="/auth/login" asChild>
                <Pressable className="flex-1 items-center rounded-full border border-primary-500 bg-white py-2.5">
                  <Text className="text-xs font-bold text-primary-600">
                    Giriş yap
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        )}

        <View className="mx-5 overflow-hidden rounded-2xl border border-border-light bg-white">
          {rows.map((r, i) => {
            const content = (
              <View
                className={`flex-row items-center px-4 py-4 ${
                  i !== rows.length - 1 ? "border-b border-border-light" : ""
                }`}
              >
                <Ionicons name={r.icon} size={20} color="#1a1a1a" />
                <Text className="ml-3 flex-1 text-sm font-medium text-foreground">
                  {r.label}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9a9a9a" />
              </View>
            );
            if (r.href) {
              return (
                <Pressable key={r.label} onPress={() => router.push(r.href as any)}>
                  {content}
                </Pressable>
              );
            }
            return (
              <Pressable key={r.label} onPress={r.action}>
                {content}
              </Pressable>
            );
          })}
        </View>

        {user && (
          <Pressable
            onPress={handleLogout}
            className="mx-5 mt-4 items-center rounded-2xl border border-border-light py-4"
          >
            <Text className="text-sm font-semibold text-primary-600">
              Çıkış yap
            </Text>
          </Pressable>
        )}

        <View className="items-center px-5 py-8">
          <Logo height={20} />
          <Text className="mt-2 text-center text-xs text-foreground-subtle">
            v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
