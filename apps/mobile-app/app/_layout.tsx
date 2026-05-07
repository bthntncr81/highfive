import "../global.css";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
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
import { Logo } from "@/components/ui/Logo";

// Native splash screen'i kontrollü gizle
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const user = useAuth((s) => s.user);
  const loadFavorites = useFavorites((s) => s.load);
  const [appReady, setAppReady] = useState(false);

  // Boot
  useEffect(() => {
    (async () => {
      try {
        // Push notifications setup (non-blocking)
        initPushNotifications().catch((e) =>
          console.log("[push] init failed", e),
        );
        attachNotificationListeners();

        // Minimum 800ms splash görünsün (kötü UX için kısa flash önle)
        await new Promise((r) => setTimeout(r, 800));
      } finally {
        setAppReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => detachNotificationListeners();
  }, []);

  useEffect(() => {
    if (user) loadFavorites();
  }, [user]);

  // App ready değilken branded splash UI
  if (!appReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#bb1e10",
        }}
      >
        <Logo height={64} variant="white" />
        <Text
          style={{
            marginTop: 18,
            color: "rgba(255,255,255,0.85)",
            fontSize: 14,
            fontWeight: "600",
            letterSpacing: 1,
          }}
        >
          HIGH FIVE RESTAURANT
        </Text>
        <ActivityIndicator
          color="#fff"
          style={{ marginTop: 32 }}
          size="small"
        />
      </View>
    );
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
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
