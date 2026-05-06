import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { endpoints } from "@/lib/api";
import { getCurrentLocation } from "@/lib/location";

const PRESET_LABELS = ["Ev", "İş", "Yazlık", "Diğer"];

export default function EditAddress() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const [label, setLabel] = useState("Ev");
  const [fullAddress, setFullAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await endpoints.addresses();
        const addr = res.addresses.find((a) => a.id === id);
        if (!addr) {
          Alert.alert("Hata", "Adres bulunamadı", [
            { text: "Tamam", onPress: () => router.back() },
          ]);
          return;
        }
        setLabel(addr.label);
        setFullAddress(addr.fullAddress);
        setDistrict(addr.district ?? "");
        setCity(addr.city ?? "");
        setNotes(addr.notes ?? "");
        setIsDefault(addr.isDefault);
        setLatitude(addr.latitude);
        setLongitude(addr.longitude);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleUseLocation = async () => {
    setLocating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await getCurrentLocation();
      if (res.ok) {
        setLatitude(res.point.latitude);
        setLongitude(res.point.longitude);
        if (res.addressGuess && !fullAddress.trim()) {
          setFullAddress(res.addressGuess);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Konum", res.error);
      }
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!fullAddress.trim()) {
      Alert.alert("Hata", "Adres bilgisi gerekli");
      return;
    }
    setSubmitting(true);
    try {
      await endpoints.updateAddress(String(id), {
        label: label.trim() || "Ev",
        fullAddress: fullAddress.trim(),
        district: district.trim() || null,
        city: city.trim() || null,
        notes: notes.trim() || null,
        latitude,
        longitude,
        isDefault,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Güncellenemedi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#bb1e10" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center px-5 pt-2 pb-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </Pressable>
          <Text className="ml-3 text-2xl font-extrabold text-foreground">
            Adresi düzenle
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
            Etiket
          </Text>
          <View className="mb-2 flex-row flex-wrap gap-2">
            {PRESET_LABELS.map((l) => (
              <Pressable
                key={l}
                onPress={() => setLabel(l)}
                className={`rounded-full px-4 py-2 ${
                  label === l ? "bg-primary-500" : "bg-surface"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    label === l ? "text-white" : "text-foreground-muted"
                  }`}
                >
                  {l}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Etiket"
            placeholderTextColor="#9a9a9a"
            className="mb-4 rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
          />

          {/* Konumumu kullan */}
          <Pressable
            onPress={handleUseLocation}
            disabled={locating}
            className={`mb-4 flex-row items-center justify-center rounded-2xl border-2 ${
              latitude
                ? "border-green-300 bg-green-50"
                : "border-primary-300 bg-primary-50"
            } py-3.5`}
          >
            {locating ? (
              <ActivityIndicator color="#bb1e10" />
            ) : (
              <>
                <Ionicons
                  name={latitude ? "checkmark-circle" : "navigate"}
                  size={20}
                  color={latitude ? "#10b981" : "#bb1e10"}
                />
                <Text
                  className={`ml-2 text-sm font-bold ${
                    latitude ? "text-green-700" : "text-primary-700"
                  }`}
                >
                  {latitude
                    ? `📍 GPS: ${latitude.toFixed(5)}, ${longitude?.toFixed(5)}`
                    : "📍 Şu anki konumumu kullan"}
                </Text>
              </>
            )}
          </Pressable>

          <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
            Açık adres
          </Text>
          <TextInput
            value={fullAddress}
            onChangeText={setFullAddress}
            multiline
            className="mb-4 min-h-[80px] rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
                İlçe
              </Text>
              <TextInput
                value={district}
                onChangeText={setDistrict}
                className="mb-4 rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
                İl
              </Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                className="mb-4 rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
              />
            </View>
          </View>

          <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
            Tarif / Not
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            className="mb-4 rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
          />

          <Pressable
            onPress={() => setIsDefault((v) => !v)}
            className="flex-row items-center"
          >
            <Ionicons
              name={isDefault ? "checkbox" : "square-outline"}
              size={22}
              color={isDefault ? "#bb1e10" : "#9a9a9a"}
            />
            <Text className="ml-2 text-sm text-foreground">
              Varsayılan adres yap
            </Text>
          </Pressable>
        </ScrollView>

        <View className="border-t border-border-light px-5 pb-2 pt-3">
          <Pressable
            onPress={handleSave}
            disabled={submitting}
            className={`flex-row items-center justify-center rounded-full py-4 ${
              submitting ? "bg-border" : "bg-primary-500"
            }`}
          >
            {submitting && <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />}
            <Text className="text-base font-bold text-white">
              {submitting ? "Kaydediliyor..." : "Değişiklikleri kaydet"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
