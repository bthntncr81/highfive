import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/lib/auth";
import { endpoints } from "@/lib/api";
import { Logo } from "@/components/ui/Logo";

type Step = "info" | "otp";

export default function Signup() {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const { requestOtp, verifyOtp } = useAuth();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleRequest = async () => {
    if (!name.trim()) {
      Alert.alert("Hata", "Ad Soyad gerekli");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      Alert.alert("Hata", "Geçerli telefon numarası gir");
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(phone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDevCode(res.devCode ?? null);
      setStep("otp");
      setResendIn(60);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Hata", e?.message ?? "Kod gönderilemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) return;
    setLoading(true);
    try {
      await verifyOtp(phone, code);
      // Adı backend'e yaz (Customer.name)
      try {
        await endpoints.updateMe({ name: name.trim() });
      } catch {}
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Welcome'a yönlendir veya direkt anasayfa
      router.replace("/(tabs)");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Hata", e?.message ?? "Kod doğrulanamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row items-center px-5 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="close" size={22} color="#1a1a1a" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6 items-start">
            <Logo height={32} />
          </View>

          {step === "info" ? (
            <>
              <Text className="text-3xl font-extrabold text-foreground">
                Üye ol
              </Text>
              <Text className="mt-2 text-sm text-foreground-muted">
                Birkaç saniyede hesabını aç, puan kazanmaya başla.
              </Text>

              <Field label="Ad Soyad">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ahmet Yılmaz"
                  placeholderTextColor="#9a9a9a"
                  autoCapitalize="words"
                  className="rounded-2xl border border-border px-4 py-3 text-base text-foreground"
                  editable={!loading}
                />
              </Field>

              <Field label="Telefon numaran">
                <View className="flex-row items-center rounded-2xl border border-border px-4">
                  <Text className="mr-2 text-base font-semibold text-foreground">
                    +90
                  </Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="555 555 55 55"
                    placeholderTextColor="#9a9a9a"
                    className="flex-1 py-3 text-base text-foreground"
                    maxLength={11}
                    editable={!loading}
                  />
                </View>
              </Field>

              <Pressable
                disabled={loading}
                onPress={handleRequest}
                className={`mt-6 flex-row items-center justify-center rounded-2xl py-4 ${
                  loading ? "bg-border" : "bg-primary-500"
                }`}
              >
                {loading && (
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text className="text-base font-bold text-white">
                  {loading ? "Gönderiliyor…" : "Doğrulama kodu gönder"}
                </Text>
              </Pressable>

              <Text className="mt-4 text-center text-[11px] leading-4 text-foreground-muted">
                Devam ederek HighFive Kullanım Şartlarını ve Gizlilik
                Politikasını kabul etmiş olursun.
              </Text>

              <Pressable
                onPress={() => router.replace("/auth/login")}
                className="mt-4 items-center"
              >
                <Text className="text-sm font-semibold text-primary-500">
                  Hesabım var, giriş yap →
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-3xl font-extrabold text-foreground">
                Kodu gir
              </Text>
              <Text className="mt-2 text-sm text-foreground-muted">
                +90 {phone} numarasına gönderilen 6 haneli kodu gir.
              </Text>

              {devCode && (
                <View className="mt-3 rounded-xl bg-accent-50 p-3">
                  <Text className="text-xs font-semibold text-accent-700">
                    🛠 Geliştirici modu — kod: {devCode}
                  </Text>
                </View>
              )}

              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor="#9a9a9a"
                className="mt-8 rounded-2xl border border-border px-4 py-4 text-center text-2xl font-bold tracking-[12px] text-foreground"
                autoFocus
                editable={!loading}
              />

              <Pressable
                disabled={code.length < 6 || loading}
                onPress={handleVerify}
                className={`mt-6 flex-row items-center justify-center rounded-2xl py-4 ${
                  code.length < 6 || loading ? "bg-border" : "bg-primary-500"
                }`}
              >
                {loading && (
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text className="text-base font-bold text-white">
                  {loading ? "Doğrulanıyor…" : "Hesabımı oluştur"}
                </Text>
              </Pressable>

              <View className="mt-4 flex-row items-center justify-center">
                {resendIn > 0 ? (
                  <Text className="text-sm text-foreground-muted">
                    {resendIn} sn sonra tekrar gönderebilirsin
                  </Text>
                ) : (
                  <Pressable onPress={handleRequest} disabled={loading}>
                    <Text className="text-sm font-semibold text-primary-500">
                      Kodu tekrar gönder
                    </Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                onPress={() => {
                  setStep("info");
                  setCode("");
                  setDevCode(null);
                }}
                className="mt-3 items-center"
                disabled={loading}
              >
                <Text className="text-sm text-foreground-muted">
                  Bilgileri değiştir
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-5">
      <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}
