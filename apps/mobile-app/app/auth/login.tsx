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
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const { requestEmailOtp, verifyEmailOtp } = useAuth();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const isValidEmail = email.includes("@") && email.includes(".") && email.length > 5;

  const handleRequest = async () => {
    if (!isValidEmail) return;
    setLoading(true);
    try {
      await requestEmailOtp(email.trim().toLowerCase());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      await verifyEmailOtp(email.trim().toLowerCase(), code);
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
          {step === "email" ? (
            <>
              <Text className="text-3xl font-extrabold text-foreground">
                E-posta adresin
              </Text>
              <Text className="mt-2 text-sm text-foreground-muted">
                E-posta ile gelen 6 haneli kodu girerek hızlıca giriş yap.
              </Text>

              <View className="mt-8 flex-row items-center rounded-2xl border border-border px-4">
                <Ionicons name="mail-outline" size={20} color="#9a9a9a" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="ornek@mail.com"
                  placeholderTextColor="#9a9a9a"
                  className="ml-2 flex-1 py-3 text-base text-foreground"
                  editable={!loading}
                  autoFocus
                />
              </View>

              <Pressable
                disabled={!isValidEmail || loading}
                onPress={handleRequest}
                className={`mt-6 flex-row items-center justify-center rounded-2xl py-4 ${
                  !isValidEmail || loading ? "bg-border" : "bg-primary-500"
                }`}
              >
                {loading && (
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text className="text-base font-bold text-white">
                  {loading ? "Gönderiliyor…" : "📧 E-postama kod gönder"}
                </Text>
              </Pressable>

              <Text className="mt-4 text-center text-[11px] leading-4 text-foreground-muted">
                Devam ederek HighFive Kullanım Şartlarını ve Gizlilik Politikasını
                kabul etmiş olursun.
              </Text>

              <Pressable
                onPress={() => router.replace("/auth/signup")}
                className="mt-4 items-center"
              >
                <Text className="text-sm font-semibold text-primary-500">
                  Hesabın yok mu? Üye ol →
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-3xl font-extrabold text-foreground">
                Kodu gir
              </Text>
              <Text className="mt-2 text-sm text-foreground-muted">
                <Text className="font-semibold text-foreground">{email}</Text>{" "}
                adresine gönderilen 6 haneli kodu gir.
              </Text>

              <View className="mt-3 rounded-xl bg-blue-50 p-3 border border-blue-200">
                <Text className="text-xs text-blue-900">
                  💡 E-postanı görmüyorsan spam/junk klasörünü kontrol et.
                </Text>
              </View>

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
                  setStep("email");
                  setCode("");
                }}
                className="mt-3 items-center"
                disabled={loading}
              >
                <Text className="text-sm text-foreground-muted">
                  E-posta adresini değiştir
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
