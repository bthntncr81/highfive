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
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
