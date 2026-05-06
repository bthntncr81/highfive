import { useState } from "react";
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
import { router } from "expo-router";

import { endpoints } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function EditProfile() {
  const user = useAuth((s) => s.user);
  const refreshMe = useAuth((s) => s.refreshMe);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await endpoints.updateMe({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      });
      await refreshMe();
      router.back();
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Güncellenemedi");
    } finally {
      setSubmitting(false);
    }
  };

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
            Hesap bilgileri
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View className="mb-4 flex-row items-center rounded-2xl bg-surface px-4 py-3">
            <Ionicons name="call" size={18} color="#6b6b6b" />
            <View className="ml-2 flex-1">
              <Text className="text-[10px] uppercase tracking-wide text-foreground-muted">
                Telefon
              </Text>
              <Text className="text-sm font-bold text-foreground">
                +90 {user?.phone}
              </Text>
            </View>
            <View className="rounded-full bg-green-50 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-green-700">
                Doğrulandı
              </Text>
            </View>
          </View>

          <Field label="Ad Soyad">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ahmet Yılmaz"
              placeholderTextColor="#9a9a9a"
              className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
            />
          </Field>

          <Field label="E-posta (opsiyonel)">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              placeholderTextColor="#9a9a9a"
              autoCapitalize="none"
              keyboardType="email-address"
              className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
            />
          </Field>
        </ScrollView>

        <View className="border-t border-border-light px-5 pb-2 pt-3">
          <Pressable
            onPress={handleSave}
            disabled={submitting}
            className={`flex-row items-center justify-center rounded-full py-4 ${
              submitting ? "bg-border" : "bg-primary-500"
            }`}
          >
            {submitting && <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />}
            <Text className="text-base font-bold text-white">
              {submitting ? "Kaydediliyor..." : "Kaydet"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}
