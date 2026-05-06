import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";

import {
  attachNotificationListeners,
  detachNotificationListeners,
  initPushNotifications,
} from "@/lib/push";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";

export default function RootLayout() {
  const user = useAuth((s) => s.user);
  const loadFavorites = useFavorites((s) => s.load);

  useEffect(() => {
    initPushNotifications().catch((e) =>
      console.log("[push] init failed", e),
    );
    attachNotificationListeners();
    return () => detachNotificationListeners();
  }, []);

  useEffect(() => {
    if (user) loadFavorites();
  }, [user]);

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
          {/* Tablar otomatik yükleniyor; sadece presentation/animation ezmek istediklerimizi
              burada listeliyoruz. Diğer tüm ekranlar dosya keşfi ile çalışır. */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
          <Stack.Screen
            name="product/[id]"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="addresses/new"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="checkout/payment"
            options={{ gestureEnabled: false }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
