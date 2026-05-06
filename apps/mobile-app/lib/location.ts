// Konum helper'ı — expo-location wrapper
import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";

export type GeoPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type GeoResult =
  | { ok: true; point: GeoPoint; addressGuess?: string }
  | { ok: false; error: string };

export async function getCurrentLocation(): Promise<GeoResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Konum izni gerekli",
      "Konumunuzu kullanmak için ayarlardan izin vermeniz gerekiyor.",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Ayarları aç", onPress: () => Linking.openSettings() },
      ],
    );
    return { ok: false, error: "Konum izni reddedildi" };
  }

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    let addressGuess: string | undefined;
    try {
      const reverse = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const a = reverse?.[0];
      if (a) {
        const parts = [
          a.street,
          a.streetNumber,
          a.district || a.subregion,
          a.city || a.region,
        ].filter(Boolean);
        addressGuess = parts.join(", ");
      }
    } catch {
      // Reverse geocoding bazen platforma göre çalışmıyor — sessizce geç
    }

    return {
      ok: true,
      point: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      },
      addressGuess,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Konum alınamadı" };
  }
}
