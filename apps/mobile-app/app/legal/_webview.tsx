// Ortak WebView wrapper — landing app'teki HTML sayfalarını mobilde gösterir
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { WebView } from "react-native-webview";
import { useState } from "react";

const BASE_URL = "https://highfivepps.com";

export function LegalWebView({ path, title }: { path: string; title: string }) {
  const [loading, setLoading] = useState(true);
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="flex-row items-center px-5 pt-2 pb-3 border-b border-border-light">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="ml-3 flex-1 text-lg font-extrabold text-foreground">
          {title}
        </Text>
      </View>
      <View className="flex-1">
        <WebView
          source={{ uri: `${BASE_URL}${path}` }}
          startInLoadingState
          onLoadEnd={() => setLoading(false)}
          renderLoading={() => (
            <View className="absolute inset-0 items-center justify-center bg-white">
              <ActivityIndicator color="#bb1e10" />
            </View>
          )}
        />
        {loading && (
          <View className="absolute inset-0 items-center justify-center bg-white/80 pointer-events-none">
            <ActivityIndicator color="#bb1e10" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
