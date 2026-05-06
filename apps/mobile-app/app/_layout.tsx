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
    // Push notifications: boot zamanı izin iste + token register
    initPushNotifications().catch((e) =>
      console.log("[push] init failed", e),
    );
    attachNotificationListeners();
    return () => detachNotificationListeners();
  }, []);

  // User login olunca favorileri çek
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
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="product/[id]"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="campaign/[id]"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="auth/login"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="checkout/index"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="checkout/payment"
            options={{
              presentation: "card",
              animation: "slide_from_right",
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="orders/[id]"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="loyalty/index"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="addresses/index"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="addresses/new"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="addresses/[id]"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="favorites/index"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="settings/notifications"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="profile/edit"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
