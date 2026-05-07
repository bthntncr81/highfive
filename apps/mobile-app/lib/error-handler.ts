// Ortak API error handler
// 401 için welcome ekranına yönlendir, diğerleri için Alert
import { Alert } from "react-native";
import { router } from "expo-router";
import { ApiError } from "./api";

export function handleApiError(e: unknown, opts?: { silent401?: boolean }) {
  if (e instanceof ApiError) {
    // Auth gereken endpoint'te login değilsen welcome'a yönlendir, Alert açma
    if (e.code === "AUTH_REQUIRED") {
      if (!opts?.silent401) {
        router.replace("/auth/welcome");
      }
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
