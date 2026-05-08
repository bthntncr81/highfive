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

type Gender = "MALE" | "FEMALE" | "OTHER";

export default function Signup() {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
  const [referralCode, setReferralCode] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const { requestEmailOtp, verifyEmailOtp } = useAuth();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleRequest = async () => {
    if (!name.trim() || name.trim().length < 3) {
      Alert.alert("Hata", "Ad Soyad gerekli (en az 3 karakter)");
      return;
    }
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      Alert.alert("Hata", "Geçerli e-posta adresi gerekli");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      Alert.alert("Hata", "Geçerli telefon numarası gir veya boş bırak");
      return;
    }
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      Alert.alert("Hata", "Doğum tarihi YYYY-AA-GG (örn 1990-05-15) formatında olmalı");
      return;
    }
    setLoading(true);
    try {
      await requestEmailOtp(email.trim().toLowerCase(), {
        name: name.trim(),
        phone: phoneDigits || undefined,
        gender: gender ?? undefined,
        birthDate: birthDate || undefined,
      });
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

      // Verify token persist olsun + zustand güncellensin diye 250ms bekle
      // (AsyncStorage write race condition önleme)
      await new Promise((r) => setTimeout(r, 250));

      // Davet kodu girildiyse uygula (yeni hesap → ilk siparişten önce)
      if (referralCode.trim()) {
        try {
          await endpoints.applyReferralCode(referralCode.trim().toUpperCase());
        } catch (e: any) {
          // Referral fail olsa bile signup'ı bozma
          Alert.alert(
            "Davet kodu uygulanamadı",
            e?.message ?? "Kod geçersiz olabilir, profilden tekrar dene.",
          );
        }
      }

      // Direkt anasayfaya yönlendir — auto-login tamam
      router.replace("/(tabs)");

      // Anasayfaya geçtikten kısa süre sonra adres ekle prompt'u
      // (modal yerine küçük bir nudge — geri tuşuyla home'a döner)
      setTimeout(() => {
        Alert.alert(
          "🎉 Hoş geldin!",
          "Şimdi ilk teslimat adresini ekleyelim — sipariş vermek 30 saniyede biter.",
          [
            { text: "Sonra", style: "cancel" },
            { text: "Adres ekle", onPress: () => router.push("/addresses/new") },
          ],
        );
      }, 600);
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
          <View className="mb-6 items-center">
            <Logo height={56} />
          </View>

          {step === "info" ? (
            <>
              <Text className="text-3xl font-extrabold text-foreground">
                Üye ol
              </Text>
              <Text className="mt-2 text-sm text-foreground-muted">
                Birkaç saniyede hesabını aç, puan kazanmaya başla.
              </Text>

              <Field label="Ad Soyad *">
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

              <Field label="E-posta *">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ornek@mail.com"
                  placeholderTextColor="#9a9a9a"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="rounded-2xl border border-border px-4 py-3 text-base text-foreground"
                  editable={!loading}
                />
              </Field>

              <Field label="Telefon (kurye için, opsiyonel)">
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

              <Field label="Cinsiyet (opsiyonel — sana özel kampanyalar için)">
                <View className="flex-row gap-2">
                  {[
                    { v: "MALE" as const, label: "👨 Erkek" },
                    { v: "FEMALE" as const, label: "👩 Kadın" },
                    { v: "OTHER" as const, label: "Diğer" },
                  ].map((opt) => (
                    <Pressable
                      key={opt.v}
                      onPress={() => setGender(gender === opt.v ? null : opt.v)}
                      disabled={loading}
                      className={`flex-1 items-center rounded-2xl border px-3 py-3 ${
                        gender === opt.v
                          ? "border-primary-500 bg-primary-50"
                          : "border-border bg-white"
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          gender === opt.v ? "text-primary-600" : "text-foreground-muted"
                        }`}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>

              <Field label="Doğum tarihi (opsiyonel — sürpriz hediyen için 🎂)">
                <TextInput
                  value={birthDate}
                  onChangeText={(t) => {
                    // YYYY-MM-DD otomatik tire ekle
                    const digits = t.replace(/\D/g, "").slice(0, 8);
                    let formatted = digits;
                    if (digits.length > 4) formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
                    if (digits.length > 6) formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
                    setBirthDate(formatted);
                  }}
                  keyboardType="number-pad"
                  placeholder="1990-05-15"
                  placeholderTextColor="#9a9a9a"
                  className="rounded-2xl border border-border px-4 py-3 text-base text-foreground"
                  maxLength={10}
                  editable={!loading}
                />
              </Field>

              {/* Davet kodu — toggle ile açılır */}
              {!showReferral ? (
                <Pressable
                  onPress={() => setShowReferral(true)}
                  className="mt-5 flex-row items-center justify-center"
                >
                  <Text className="text-sm font-semibold text-primary-500">
                    🎁 Davet kodum var
                  </Text>
                </Pressable>
              ) : (
                <Field label="Davet kodu (opsiyonel — ikiniz de puan kazanırsınız)">
                  <View className="flex-row items-center rounded-2xl border-2 border-primary-300 bg-primary-50/50 px-4">
                    <Text style={{ fontSize: 16, marginRight: 6 }}>🎁</Text>
                    <TextInput
                      value={referralCode}
                      onChangeText={(t) => setReferralCode(t.toUpperCase().replace(/\s/g, ""))}
                      placeholder="6 haneli kod"
                      placeholderTextColor="#9a9a9a"
                      autoCapitalize="characters"
                      className="flex-1 py-3 text-base font-bold text-primary-600 tracking-widest"
                      maxLength={8}
                      editable={!loading}
                    />
                    {referralCode.length > 0 && (
                      <Pressable onPress={() => setReferralCode("")} hitSlop={8}>
                        <Text className="text-foreground-muted">✕</Text>
                      </Pressable>
                    )}
                  </View>
                </Field>
              )}

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
                  {loading ? "Gönderiliyor…" : "📧 E-postama doğrulama kodu gönder"}
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
