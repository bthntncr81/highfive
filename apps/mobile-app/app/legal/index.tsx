import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const DOCS = [
  {
    icon: "document-text-outline" as const,
    title: "Üyelik Sözleşmesi",
    subtitle: "HighFive üyeliği şartları, hak ve yükümlülükler",
    route: "/legal/terms",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Gizlilik & KVKK Aydınlatma Metni",
    subtitle: "Kişisel verilerinizin nasıl işlendiğini öğrenin",
    route: "/legal/privacy",
  },
  {
    icon: "receipt-outline" as const,
    title: "Mesafeli Satış Sözleşmesi",
    subtitle: "Online sipariş satış koşulları",
    route: "/legal/distance-sales",
  },
  {
    icon: "bicycle-outline" as const,
    title: "Teslimat ve İade Şartları",
    subtitle: "Sipariş teslimat, iptal ve iade koşulları",
    route: "/legal/delivery-terms",
  },
];

export default function LegalIndexScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="ml-3 flex-1 text-2xl font-extrabold text-foreground">
          Sözleşmeler
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="mb-4 text-sm text-foreground-muted">
          Yasal dokümanlarımızın tamamına buradan ulaşabilirsin. KVKK kapsamındaki haklarını kullanmak için 0555 243 81 81 numarasından bize ulaşabilirsin.
        </Text>

        <View className="overflow-hidden rounded-2xl border border-border-light bg-white">
          {DOCS.map((doc, i) => (
            <Pressable
              key={doc.route}
              onPress={() => router.push(doc.route as any)}
              className={`flex-row items-center p-4 ${
                i < DOCS.length - 1 ? "border-b border-border-light" : ""
              }`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                <Ionicons name={doc.icon} size={20} color="#bb1e10" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-foreground">{doc.title}</Text>
                <Text className="mt-0.5 text-xs text-foreground-muted">{doc.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9a9a9a" />
            </Pressable>
          ))}
        </View>

        <View className="mt-6 rounded-2xl bg-surface p-4">
          <Text className="text-xs text-foreground-muted">
            💡 Sözleşmelerin tam metnine{" "}
            <Text className="font-semibold text-primary-500">highfivepps.com</Text>{" "}
            adresinden de ulaşabilirsin.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
