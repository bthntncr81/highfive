import { useEffect, useRef, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { API_URL, endpoints, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";

type Phase = "form" | "3ds" | "polling" | "done" | "failed";

export default function PaymentScreen() {
  const { orderId, amount } = useLocalSearchParams<{
    orderId: string;
    amount: string;
  }>();
  const user = useAuth((s) => s.user);
  const clearCart = useCart((s) => s.clear);

  const [phase, setPhase] = useState<Phase>("form");
  const [cardHolder, setCardHolder] = useState(user?.name ?? "");
  const [cardNumber, setCardNumber] = useState("");
  const [expireMonth, setExpireMonth] = useState("");
  const [expireYear, setExpireYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  const webviewRef = useRef<WebView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling: callback geldiyse paymentId ile complete yap
  useEffect(() => {
    if (phase !== "polling" || !conversationId) return;

    let attempts = 0;
    const tick = async () => {
      attempts++;
      try {
        const res = await fetch(
          `${API_URL}/api/payment/mobile-finalize/${conversationId}`,
        );
        const data = await res.json();
        if (data.status === "completed") {
          setPhase("done");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          clearCart();
          if (pollRef.current) clearInterval(pollRef.current);
          // 1.5sn beklet, sonra detayına git
          setTimeout(() => {
            router.replace(`/orders/${data.orderId ?? orderId}`);
          }, 1500);
        } else if (data.status === "failed") {
          setPhase("failed");
          setPollError(data.error || "Ödeme başarısız");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          if (pollRef.current) clearInterval(pollRef.current);
        }
        // pending → tekrar dene
      } catch (e: any) {
        // ağ hatası — devam et
      }
      if (attempts > 60) {
        // 60 * 2sn = 2 dakika
        setPhase("failed");
        setPollError("Ödeme zaman aşımına uğradı");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };

    tick();
    pollRef.current = setInterval(tick, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, conversationId]);

  const formatCardNumber = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 19)
      .replace(/(\d{4})/g, "$1 ")
      .trim();

  const initialize = async () => {
    if (
      !cardHolder.trim() ||
      cardNumber.replace(/\s/g, "").length < 15 ||
      !expireMonth ||
      !expireYear ||
      cvc.length < 3
    ) {
      Alert.alert("Hata", "Tüm kart bilgilerini doldurun");
      return;
    }
    setSubmitting(true);
    try {
      const res = await endpoints.initialize3DS({
        orderId: String(orderId),
        cardHolderName: cardHolder.trim().toUpperCase(),
        cardNumber: cardNumber.replace(/\s/g, ""),
        expireMonth: expireMonth.padStart(2, "0"),
        expireYear: expireYear.length === 2 ? `20${expireYear}` : expireYear,
        cvc,
        email: user?.email ?? "musteri@highfivepps.com",
        name: user?.name ?? cardHolder,
        phone: user?.phone ?? "",
      });
      // htmlContent base64 değil — direkt HTML
      setHtmlContent(res.htmlContent);
      setConversationId(res.conversationId);
      setPhase("3ds");
    } catch (e: any) {
      const msg =
        e instanceof ApiError ? e.message : e?.message ?? "Ödeme başlatılamadı";
      Alert.alert("Hata", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  // WebView navigation: callback URL'e yönlendiğinde polling'e geç
  const handleNavStateChange = (navState: { url: string }) => {
    const url = navState.url || "";
    if (url.includes("/3ds-callback") || url.includes("payment=success") || url.includes("payment=failed")) {
      setPhase("polling");
    }
  };

  // postMessage'tan da dinle (web flow uyumluluğu)
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "3ds_result") {
        setPhase("polling");
      }
    } catch {}
  };

  // ===== UI =====
  if (phase === "3ds" && htmlContent) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-white">
        <View className="flex-row items-center px-5 pt-2 pb-3">
          <Pressable
            onPress={() => {
              Alert.alert("İptal", "Ödemeyi iptal etmek istediğinden emin misin?", [
                { text: "Devam et", style: "cancel" },
                {
                  text: "İptal et",
                  style: "destructive",
                  onPress: () => router.back(),
                },
              ]);
            }}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="close" size={22} color="#1a1a1a" />
          </Pressable>
          <Text className="ml-3 flex-1 text-lg font-bold text-foreground">
            3D Secure Doğrulama
          </Text>
        </View>
        <WebView
          ref={webviewRef}
          source={{ html: htmlContent, baseUrl: API_URL }}
          onNavigationStateChange={handleNavStateChange}
          onMessage={handleMessage}
          startInLoadingState
          renderLoading={() => (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#bb1e10" size="large" />
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  if (phase === "polling") {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-10">
          <ActivityIndicator color="#bb1e10" size="large" />
          <Text className="mt-4 text-base font-bold text-foreground">
            Ödeme tamamlanıyor...
          </Text>
          <Text className="mt-1 text-center text-xs text-foreground-muted">
            Lütfen bekleyin, bankayla iletişim kuruluyor.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "done") {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-green-50">
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <Text className="mt-4 text-2xl font-extrabold text-foreground">
            Ödeme başarılı!
          </Text>
          <Text className="mt-1 text-center text-sm text-foreground-muted">
            Siparişin alındı, mutfağa iletildi.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === "failed") {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-red-50">
            <Ionicons name="close-circle" size={64} color="#ef4444" />
          </View>
          <Text className="mt-4 text-2xl font-extrabold text-foreground">
            Ödeme başarısız
          </Text>
          <Text className="mt-1 text-center text-sm text-foreground-muted">
            {pollError ?? "Ödeme tamamlanamadı."}
          </Text>
          <Pressable
            onPress={() => setPhase("form")}
            className="mt-6 rounded-full bg-primary-500 px-6 py-3"
          >
            <Text className="text-sm font-bold text-white">Tekrar dene</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/(tabs)/cart")}
            className="mt-3"
          >
            <Text className="text-sm font-semibold text-foreground-muted">
              Sepete dön
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Form
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
            Ödeme
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tutar kartı */}
          <View className="mb-6 rounded-3xl bg-primary-500 p-5">
            <Text className="text-xs uppercase tracking-widest text-white/80">
              Ödenecek tutar
            </Text>
            <Text className="mt-1 text-4xl font-extrabold text-white">
              {Number(amount).toFixed(2)} ₺
            </Text>
            <Text className="mt-1 text-xs text-white/80">
              Sipariş #{String(orderId).slice(-6)}
            </Text>
          </View>

          {/* Card form */}
          <Field label="Kart üzerindeki isim">
            <TextInput
              value={cardHolder}
              onChangeText={setCardHolder}
              placeholder="AHMET YILMAZ"
              placeholderTextColor="#9a9a9a"
              autoCapitalize="characters"
              className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
            />
          </Field>

          <Field label="Kart numarası">
            <TextInput
              value={cardNumber}
              onChangeText={(t) => setCardNumber(formatCardNumber(t))}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#9a9a9a"
              keyboardType="number-pad"
              maxLength={19}
              className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
            />
          </Field>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Ay">
                <TextInput
                  value={expireMonth}
                  onChangeText={(t) => setExpireMonth(t.replace(/\D/g, "").slice(0, 2))}
                  placeholder="MM"
                  placeholderTextColor="#9a9a9a"
                  keyboardType="number-pad"
                  maxLength={2}
                  className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Yıl">
                <TextInput
                  value={expireYear}
                  onChangeText={(t) => setExpireYear(t.replace(/\D/g, "").slice(0, 4))}
                  placeholder="YYYY"
                  placeholderTextColor="#9a9a9a"
                  keyboardType="number-pad"
                  maxLength={4}
                  className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="CVC">
                <TextInput
                  value={cvc}
                  onChangeText={(t) => setCvc(t.replace(/\D/g, "").slice(0, 4))}
                  placeholder="123"
                  placeholderTextColor="#9a9a9a"
                  keyboardType="number-pad"
                  maxLength={4}
                  className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
                />
              </Field>
            </View>
          </View>

          {/* Güvenlik info */}
          <View className="mt-4 flex-row items-center rounded-2xl bg-surface p-3">
            <Ionicons name="shield-checkmark" size={18} color="#10b981" />
            <Text className="ml-2 flex-1 text-xs text-foreground-muted">
              Kart bilgileri iyzico üzerinden 3D Secure ile güvenle işlenir.
              Hiçbir kart bilgisi sunucumuzda saklanmaz.
            </Text>
          </View>
        </ScrollView>

        <View className="border-t border-border-light px-5 pb-2 pt-3">
          <Pressable
            disabled={submitting}
            onPress={initialize}
            className={`flex-row items-center justify-center rounded-full py-4 ${
              submitting ? "bg-border" : "bg-primary-500"
            }`}
          >
            {submitting && (
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text className="text-base font-bold text-white">
              {submitting
                ? "Yönlendiriliyor..."
                : `Güvenli ödemeye geç • ${Number(amount).toFixed(2)} ₺`}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}
