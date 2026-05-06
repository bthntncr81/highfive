import { useState } from "react";
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
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { endpoints } from "@/lib/api";
import { getCurrentLocation } from "@/lib/location";

const PRESET_LABELS = ["Ev", "İş", "Yazlık", "Diğer"];

export default function NewAddress() {
  const [label, setLabel] = useState("Ev");
  const [fullAddress, setFullAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const handleUseLocation = async () => {
    setLocating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await getCurrentLocation();
      if (res.ok) {
        setLatitude(res.point.latitude);
        setLongitude(res.point.longitude);
        if (res.addressGuess) {
          if (!fullAddress.trim()) setFullAddress(res.addressGuess);
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
      await endpoints.createAddress({
        label: label.trim() || "Ev",
        fullAddress: fullAddress.trim(),
        district: district.trim() || undefined,
        city: city.trim() || undefined,
        notes: notes.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        isDefault,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Eklenemedi");
    } finally {
      setSubmitting(false);
    }
  };

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
            <Ionicons name="close" size={22} color="#1a1a1a" />
          </Pressable>
          <Text className="ml-3 text-2xl font-extrabold text-foreground">
            Yeni adres
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Etiket">
            <View className="flex-row flex-wrap gap-2">
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
              placeholder="Veya manuel etiket"
              placeholderTextColor="#9a9a9a"
              className="mt-2 rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
            />
          </Field>

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
                    ? `📍 Konum alındı (${latitude.toFixed(5)}, ${longitude?.toFixed(5)})`
                    : "📍 Şu anki konumumu kullan"}
                </Text>
              </>
            )}
          </Pressable>
          {latitude && (
            <Pressable
              onPress={() => {
                setLatitude(null);
                setLongitude(null);
              }}
              className="-mt-2 mb-3 self-end"
            >
              <Text className="text-xs font-semibold text-foreground-muted">
                Konumu temizle
              </Text>
            </Pressable>
          )}

          <Field label="Açık adres">
            <TextInput
              value={fullAddress}
              onChangeText={setFullAddress}
              placeholder="Mahalle, sokak, bina no, daire..."
              placeholderTextColor="#9a9a9a"
              multiline
              className="min-h-[80px] rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
            />
          </Field>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="İlçe">
                <TextInput
                  value={district}
                  onChangeText={setDistrict}
                  placeholder="Örn. Akçakoca"
                  placeholderTextColor="#9a9a9a"
                  className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="İl">
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Örn. Düzce"
                  placeholderTextColor="#9a9a9a"
                  className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
                />
              </Field>
            </View>
          </View>

          <Field label="Tarif / Not (opsiyonel)">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Kapı kodu, kat, kapıcıya ver vs."
              placeholderTextColor="#9a9a9a"
              className="rounded-2xl border border-border-light px-4 py-3 text-base text-foreground"
            />
          </Field>

          <Pressable
            onPress={() => setIsDefault((v) => !v)}
            className="mt-2 flex-row items-center"
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
              {submitting ? "Kaydediliyor..." : "Adresi kaydet"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold text-foreground-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}
