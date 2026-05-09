// Ortak API error handler
// 401 için welcome ekranına yönlendir, diğerleri için Alert
import { Alert } from "react-native";
import { router } from "expo-router";
import { ApiError } from "./api";

export function handleApiError(e: unknown, opts?: { silent401?: boolean }) {
  if (e instanceof ApiError) {
    // AUTH_REQUIRED — sessizce yut. UI zaten user state'ine göre 'üye ol' UI render eder.
    // Auto-redirect welcome'a yapılmıyor çünkü hydration race condition sırasında yanlış
    // tetikleniyordu (üye giriş yapmış ama hydration tamamlanmadan fetch fired → 401 →
    // welcome'a atılıyordu). Calling code istiyorsa kendi explicit yönlendirir.
    if (e.code === "AUTH_REQUIRED") {
      console.log("[handleApiError] AUTH_REQUIRED — silent");
      return;
    }
    // Token süresi dolmuş — kullanıcıya bildir, login'e yönlendir
    if (e.code === "TOKEN_EXPIRED") {
      Alert.alert(
        "Oturum süresi doldu",
        "Tekrar giriş yapman gerek.",
        [
          {
            text: "Giriş yap",
            onPress: () => router.replace("/auth/login"),
          },
        ],
      );
      return;
    }
  }

  // Diğer hatalar
  const msg =
    e instanceof Error ? e.message : "Bir hata oluştu, tekrar dene.";
  Alert.alert("Hata", msg);
}
