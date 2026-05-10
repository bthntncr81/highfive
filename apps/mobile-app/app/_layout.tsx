import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import {
  attachNotificationListeners,
  detachNotificationListeners,
  initPushNotifications,
} from "@/lib/push";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { FlyToCartOverlay } from "@/components/ui/FlyToCartOverlay";

// Native splash screen'i kontrollü gizle
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const loadFavorites = useFavorites((s) => s.load);
  const [appReady, setAppReady] = useState(false);

  // Boot — auth hydrate + push setup tamamlanınca native splash'ı gizle
  useEffect(() => {
    initPushNotifications().catch((e) =>
      console.log("[push] init failed", e),
    );
    attachNotificationListeners();
    return () => detachNotificationListeners();
  }, []);

  // Hydration TAMAMLANDIKTAN SONRA splash'ı gizle (single splash, no flash)
  // Native iOS LaunchScreen.storyboard render olur, biz JS hazır olunca dismiss ederiz
  useEffect(() => {
    if (!hydrated) return;
    // Çok kısa flash önlemek için 400ms minimum bekle
    const t = setTimeout(() => {
      setAppReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [hydrated]);

  useEffect(() => {
    if (user) loadFavorites();
  }, [user]);

  // appReady false iken: native splash (storyboard) görünür, hiçbir React render yok
  // Bu sayede TEK splash katmanı: kırmızı zemin + beyaz logo (storyboard)
  // → JS hazır olduğunda Stack render olur, SplashScreen.hideAsync() ile native splash kapanır
  if (!appReady || !hydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#FFFFFF" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* AUTH */}
          <Stack.Screen
            name="auth/welcome"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="auth/login"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="auth/signup"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />

          {/* MODALS */}
          <Stack.Screen
            name="product/[id]"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="campaign/[id]"
            options={{ animation: "slide_from_right" }}
          />

          {/* CHECKOUT */}
          <Stack.Screen
            name="checkout/index"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="checkout/payment"
            options={{ animation: "slide_from_right", gestureEnabled: false }}
          />

          {/* ORDERS */}
          <Stack.Screen
            name="orders/[id]"
            options={{ animation: "slide_from_right" }}
          />

          {/* LOYALTY */}
          <Stack.Screen
            name="loyalty/index"
            options={{ animation: "slide_from_right" }}
          />

          {/* ADDRESSES */}
          <Stack.Screen
            name="addresses/index"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="addresses/new"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="addresses/[id]"
            options={{ animation: "slide_from_right" }}
          />

          {/* FAVORITES */}
          <Stack.Screen
            name="favorites/index"
            options={{ animation: "slide_from_right" }}
          />

          {/* SETTINGS */}
          <Stack.Screen
            name="settings/notifications"
            options={{ animation: "slide_from_right" }}
          />

          {/* PROFILE */}
          <Stack.Screen
            name="profile/edit"
            options={{ animation: "slide_from_right" }}
          />

          {/* LEGAL (KVKK, Sözleşmeler, Gizlilik) */}
          <Stack.Screen
            name="legal/index"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="legal/privacy"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="legal/kvkk"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="legal/terms"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="legal/distance-sales"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="legal/delivery-terms"
            options={{ animation: "slide_from_right" }}
          />
        </Stack>
        {/* Sepete uçan ürün animasyonu (her ekranın üzerinde) */}
        <FlyToCartOverlay />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
