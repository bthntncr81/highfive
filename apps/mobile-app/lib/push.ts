// Mobile push notification receiver
// Token alır, backend'e register eder, foreground/background bildirim handler'ları kurar.
// Yönetim (gönderim) YOK — bu sadece alıcı.

import { BRAND_PRIMARY } from "./brand";
import { Platform, Alert, Linking } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { api } from "./api";

const STORED_TOKEN_KEY = "hf_push_token";

// Foreground'da bildirim banner'ı göster (varsayılan iOS'ta gizleniyor)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Eski API uyumluluğu
    shouldShowAlert: true,
  }),
});

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "HighFive",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: BRAND_PRIMARY,
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync("campaigns", {
    name: "Kampanyalar",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: BRAND_PRIMARY,
    sound: "default",
  });
}

const PROMPT_KEY = "hf_push_prompt_seen";

async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  // Bir kez kullanıcıya neden istediğimizi açıkla, sonra OS dialog'u
  // (Android 13+ runtime permission, iOS native dialog)
  if (existing === "undetermined") {
    const seen = await AsyncStorage.getItem(PROMPT_KEY);
    if (!seen) {
      await new Promise<void>((resolve) => {
        Alert.alert(
          "🔔 Bildirim izni",
          "Sipariş durumu, kampanya ve özel teklifler için bildirim izni vermen gerek. Diler misin?",
          [
            { text: "Hayır", style: "cancel", onPress: () => resolve() },
            { text: "İzin ver", onPress: () => resolve() },
          ],
          { cancelable: false },
        );
      });
      await AsyncStorage.setItem(PROMPT_KEY, "1");
    }

    const { status: req } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return req === "granted";
  }

  // Daha önce reddedilmiş — ayar aç
  Alert.alert(
    "Bildirim izni kapalı",
    "Sipariş ve kampanya bildirimleri için izin gerek. Ayarlardan açabilirsin.",
    [
      { text: "Vazgeç", style: "cancel" },
      { text: "Ayarları aç", onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}

// Public wrapper: Profile/Bildirim Tercihleri ekranından çağrılabilsin
export async function ensurePushPermission(): Promise<boolean> {
  return requestPermissions();
}

async function getProjectId(): Promise<string | undefined> {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as any)?.projectId
  );
}

// Push token al — Expo Go'da değil, dev-client/standalone'da çalışır.
async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[push] simulator/emulator — gerçek push token alınmaz");
    return null;
  }
  try {
    const projectId = await getProjectId();
    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenRes.data;
  } catch (e) {
    console.log("[push] token alınamadı:", e);
    return null;
  }
}

// Backend'e cihazı kaydet
async function registerDevice(token: string) {
  try {
    await api.post("/api/mobile/devices/register", {
      token,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
      locale: "tr-TR",
    });
    await AsyncStorage.setItem(STORED_TOKEN_KEY, token);
    console.log("[push] device registered");
  } catch (e) {
    console.log("[push] register failed:", e);
  }
}

// Bildirime tıklanınca yönlendirme
function handleNotificationTap(data: any) {
  if (!data) return;
  const route =
    typeof data.route === "string"
      ? data.route
      : typeof data.url === "string"
      ? data.url
      : null;

  if (!route) return;

  // Internal route (e.g. "/menu", "/campaign/c1", "/product/p1")
  try {
    if (route.startsWith("/")) {
      router.push(route as any);
    } else if (route.startsWith("highfive://")) {
      const path = route.replace("highfive://", "/");
      router.push(path as any);
    }
  } catch (e) {
    console.log("[push] navigate failed:", e);
  }
}

let listenersAttached = false;
let receivedSub: Notifications.Subscription | null = null;
let responseSub: Notifications.Subscription | null = null;

export function attachNotificationListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  receivedSub = Notifications.addNotificationReceivedListener(() => {
    // Foreground'da geldi — handler zaten banner gösteriyor
  });

  responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    },
  );

  // Cold-start: app kapalıyken bildirime tıklanıp açılırsa
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleNotificationTap(response.notification.request.content.data);
  });
}

export function detachNotificationListeners() {
  receivedSub?.remove();
  responseSub?.remove();
  receivedSub = null;
  responseSub = null;
  listenersAttached = false;
}

// Boot zamanı çağrılır — kanal oluştur, izin iste, token al, kayıt ol
export async function initPushNotifications() {
  await ensureAndroidChannel();

  const granted = await requestPermissions();
  if (granted) {
    const token = await getExpoPushToken();
    if (token) {
      // Push token alındı → register
      await registerDevice(token);
      return;
    }
  }

  // Push olmasa bile cihaz kaydı yap (POS'ta "aktif cihaz" listesi için)
  // Personal Team iOS build veya simulator gibi push'suz durumlarda da müşteri görünür
  await registerDeviceWithoutPush();
}

// Push token olmadan cihaz kaydı (analytics için)
async function registerDeviceWithoutPush() {
  try {
    // Cihaz unique ID — her install için stabil, AsyncStorage'da sakla
    let deviceId = await AsyncStorage.getItem("hf_device_id");
    if (!deviceId) {
      deviceId = `nopush-${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await AsyncStorage.setItem("hf_device_id", deviceId);
    }
    await api.post("/api/mobile/devices/register", {
      token: deviceId, // unique placeholder
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
      locale: "tr-TR",
      noPush: true,
    });
    console.log("[push] device registered without push token");
  } catch (e) {
    console.log("[push] no-push register failed:", e);
  }
}
