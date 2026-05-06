import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
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
    if (phone.replace(/\D/g, "").length < 10) return;
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
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
        <View className="px-5 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="close" size={22} color="#1a1a1a" />
          </Pressable>
        </View>

        <View className="flex-1 px-6 pt-8">
          <View className="mb-6 items-start">
            <Logo height={32} />
          </View>
          {step === "phone" ? (
            <>
              <Text className="text-3xl font-extrabold text-foreground">
                Telefon numaran
              </Text>
              <Text className="mt-2 text-sm text-foreground-muted">
                SMS ile gelen 6 haneli kodu girerek hızlıca giriş yap.
              </Text>

              <View className="mt-8 flex-row items-center rounded-2xl border border-border px-4 py-1">
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

              <Pressable
                disabled={phone.replace(/\D/g, "").length < 10 || loading}
                onPress={handleRequest}
                className={`mt-6 flex-row items-center justify-center rounded-2xl py-4 ${
                  phone.replace(/\D/g, "").length < 10 || loading
                    ? "bg-border"
                    : "bg-primary-500"
                }`}
              >
                {loading && (
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text className="text-base font-bold text-white">
                  {loading ? "Gönderiliyor…" : "Kod gönder"}
                </Text>
              </Pressable>

              <Text className="mt-4 text-center text-[11px] leading-4 text-foreground-muted">
                Devam ederek HighFive Kullanım Şartlarını ve Gizlilik Politikasını
                kabul etmiş olursun.
              </Text>
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
                  {loading ? "Doğrulanıyor…" : "Doğrula ve giriş yap"}
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
                  setStep("phone");
                  setCode("");
                  setDevCode(null);
                }}
                className="mt-3 items-center"
                disabled={loading}
              >
                <Text className="text-sm text-foreground-muted">
                  Numarayı değiştir
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
