// DailySpinWheelTrigger — kullanıcı home'a girdiğinde, günde 1 kez Spin Wheel
// modal'ını otomatik açar. AsyncStorage'da son gösterilen tarih tutulur.
// Modal'ın sağ üstündeki X ile kapatılır.

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SpinWheel } from "./SpinWheel";

const STORAGE_KEY = "hf_spin_auto_seen_date";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function DailySpinWheelTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        const today = todayKey();
        if (seen === today) return;
        // Bugün ilk kez açıyor — modal aç + kaydet
        if (!cancelled) {
          // Küçük gecikme — home ekranı render olsun, sonra modal açılsın
          setTimeout(() => {
            if (!cancelled) setOpen(true);
          }, 1200);
          await AsyncStorage.setItem(STORAGE_KEY, today);
        }
      } catch {
        // sessiz
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <SpinWheel visible={open} onClose={() => setOpen(false)} />;
}
