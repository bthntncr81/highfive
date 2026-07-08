// ============================================================================
// Marka rengi — tenant-parametrik build'lerde tek doğruluk kaynağı.
// ============================================================================
// app.config.ts extra.primaryColor'ı OTORDER_PRIMARY_COLOR env'inden doldurur
// (yoksa HighFive kırmızısı). Inline stil/ikon renklerinde hex literal yerine
// BRAND_PRIMARY(/_DARK/_LIGHT) kullanılır; NativeWind className'leri
// (bg-primary-500 vb.) tailwind.config.js üzerinden aynı env ile çözülür.

import Constants from "expo-constants";

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

function mixHex(hex: string, target: [number, number, number], t: number): string {
  const h = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  const rgb = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return (
    "#" +
    rgb
      .map((c, i) => clamp(c + (target[i] - c) * t).toString(16).padStart(2, "0"))
      .join("")
  );
}

export const BRAND_PRIMARY: string =
  (Constants.expoConfig?.extra as any)?.primaryColor ?? "#bb1e10";

// HighFive baz renginde el ayarı tonlar korunur (regresyon sıfır);
// tenant renginde basit karışımla üretilir (%25 siyah / %18 beyaz).
export const BRAND_PRIMARY_DARK: string =
  BRAND_PRIMARY === "#bb1e10" ? "#8a1610" : mixHex(BRAND_PRIMARY, [0, 0, 0], 0.25);

export const BRAND_PRIMARY_LIGHT: string =
  BRAND_PRIMARY === "#bb1e10" ? "#d4382a" : mixHex(BRAND_PRIMARY, [255, 255, 255], 0.18);
