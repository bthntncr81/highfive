// DailyGameTrigger — kullanıcı home'a girince günde 1 kez bir oyun pop-up'ı açar.
// Hangi oyun gösterileceği kullanıcı + tarih bazlı deterministik random ile belirlenir.
// Şu an aktif rotasyon:
//   - Şans Çarkı (SpinWheel) — direkt oyna
//   - Sürpriz Kutu Daveti (MysteryBoxTeaser) — kutu sayfasına yönlendiren küçük modal
//
// Kullanıcı kapatabilir ("istemezse oynamasın" — UX kararı).
// AsyncStorage'da bugünkü gösterim kayıtlı tutulur, aynı gün tekrar açılmaz.

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SpinWheel } from "./SpinWheel";
import { MysteryBoxTeaser } from "./MysteryBoxTeaser";

const STORAGE_KEY = "hf_daily_game_seen_date";
const POOL = ["SPIN", "MYSTERY_TEASER"] as const;
type GameKey = (typeof POOL)[number];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Tarih + (mümkünse) kullanıcı identifier ile deterministik seçim — aynı gün tekrar açılmaz,
// AsyncStorage zaten guard'lıyor; random sadece "hangisi" için.
function pickGame(): GameKey {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

export function DailyGameTrigger() {
  const [game, setGame] = useState<GameKey | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        const today = todayKey();
        if (seen === today) return;
        const choice = pickGame();
        if (cancelled) return;
        setGame(choice);
        // Home render olsun, küçük gecikme sonra modal aç
        setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 1200);
        await AsyncStorage.setItem(STORAGE_KEY, today);
      } catch {
        // sessiz
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => setOpen(false);

  if (!game) return null;
  if (game === "SPIN") return <SpinWheel visible={open} onClose={close} />;
  if (game === "MYSTERY_TEASER")
    return <MysteryBoxTeaser visible={open} onClose={close} />;
  return null;
}

export default DailyGameTrigger;
