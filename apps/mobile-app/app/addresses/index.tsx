import { BRAND_PRIMARY } from "@/lib/brand";
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";

import { endpoints, ApiAddress } from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";

export default function AddressesScreen() {
  const [items, setItems] = useState<ApiAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await endpoints.addresses();
      setItems(res.addresses);
    } catch (e: any) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, []),
  );

  const handleDelete = (a: ApiAddress) => {
    Alert.alert("Adresi sil", `"${a.label}" silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await endpoints.deleteAddress(a.id);
            refresh();
          } catch (e: any) {
            Alert.alert("Hata", e?.message ?? "Silinemedi");
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (a: ApiAddress) => {
    try {
      await endpoints.setDefaultAddress(a.id);
      refresh();
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Ayarlanamadı");
    }
  };

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
          Adreslerim
        </Text>
        <Link href="/addresses/new" asChild>
          <Pressable className="rounded-full bg-primary-500 px-3 py-2">
            <Text className="text-xs font-bold text-white">+ Yeni</Text>
          </Pressable>
        </Link>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BRAND_PRIMARY} />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-50">
            <Ionicons name="location-outline" size={48} color={BRAND_PRIMARY} />
          </View>
          <Text className="mt-4 text-lg font-bold text-foreground">
            Kayıtlı adres yok
          </Text>
          <Text className="mt-1 text-center text-sm text-foreground-muted">
            Hızlı sipariş için adreslerini buraya kaydet.
          </Text>
          <Link href="/addresses/new" asChild>
            <Pressable className="mt-6 rounded-full bg-primary-500 px-6 py-3">
              <Text className="text-sm font-bold text-white">Adres ekle</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {items.map((a) => (
            <View
              key={a.id}
              className="mb-3 rounded-2xl border border-border-light bg-white p-4"
            >
              <View className="flex-row items-start">
                <Ionicons
                  name="location"
                  size={20}
                  color={a.isDefault ? BRAND_PRIMARY : "#6b6b6b"}
                />
                <View className="ml-2 flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-base font-bold text-foreground">
                      {a.label}
                    </Text>
                    {a.isDefault && (
                      <View className="ml-2 rounded-full bg-primary-50 px-2 py-0.5">
                        <Text className="text-[10px] font-semibold text-primary-600">
                          Varsayılan
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-1 text-xs text-foreground-muted">
                    {a.fullAddress}
                    {a.district ? `, ${a.district}` : ""}
                    {a.city ? `, ${a.city}` : ""}
                  </Text>
                  {a.notes && (
                    <Text className="mt-1 text-[11px] italic text-foreground-muted">
                      Not: {a.notes}
                    </Text>
                  )}
                </View>
              </View>

              <View className="mt-3 flex-row gap-2">
                {!a.isDefault && (
                  <Pressable
                    onPress={() => handleSetDefault(a)}
                    className="flex-1 items-center rounded-full bg-surface py-2"
                  >
                    <Text className="text-xs font-semibold text-foreground-muted">
                      Varsayılan yap
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => router.push(`/addresses/${a.id}`)}
                  className="flex-1 items-center rounded-full bg-surface py-2"
                >
                  <Text className="text-xs font-semibold text-foreground-muted">
                    Düzenle
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(a)}
                  className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
