/** @type {import('tailwindcss').Config} */
// ============================================================================
// Tenant-parametrik palet — build-time env'den rampa üretimi (Kurumsal paket).
// ============================================================================
// OTORDER_PRIMARY_COLOR / OTORDER_ACCENT_COLOR / OTORDER_BG_COLOR env'leri
// verilirse tek marka renginden 50..900 rampası JS'te üretilir
// (apps/landing/src/lib/theme.ts buildRamp mantığının kopyası).
// Env YOKSA aşağıdaki hardcoded HighFive paleti birebir kullanılır → regresyon sıfır.

const hexToRgb = (input) => {
  const hex = String(input).trim().replace("#", "");
  if (/^[0-9a-fA-F]{6}$/.test(hex))
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  if (/^[0-9a-fA-F]{3}$/.test(hex))
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  return null;
};

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
const mix = ([r, g, b], [r2, g2, b2], t) =>
  [clamp(r + (r2 - r) * t), clamp(g + (g2 - g) * t), clamp(b + (b2 - b) * t)];
const toHex = ([r, g, b]) =>
  "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");

// Tek marka renginden 50..900 rampası (açık uçları beyaza, koyu uçları siyaha karışım)
// — apps/landing/src/lib/theme.ts buildRamp ile aynı oranlar.
function buildRamp(baseHex) {
  const base = hexToRgb(baseHex);
  const white = [255, 255, 255];
  const black = [0, 0, 0];
  return {
    DEFAULT: toHex(base),
    light: toHex(mix(base, white, 0.18)),
    dark: toHex(mix(base, black, 0.25)),
    50: toHex(mix(base, white, 0.94)),
    100: toHex(mix(base, white, 0.86)),
    200: toHex(mix(base, white, 0.72)),
    300: toHex(mix(base, white, 0.52)),
    400: toHex(mix(base, white, 0.28)),
    500: toHex(base),
    600: toHex(mix(base, black, 0.14)),
    700: toHex(mix(base, black, 0.26)),
    800: toHex(mix(base, black, 0.4)),
    900: toHex(mix(base, black, 0.52)),
  };
}

// HighFive Marka Paleti — landing ile aynı (highfivepps.com).
// Env yokken BİREBİR bu değerler kullanılır (üretilmiş rampa değil).
const HIGHFIVE_PRIMARY = {
  DEFAULT: "#bb1e10",
  dark: "#8a1610",
  light: "#d4382a",
  50: "#fef2f1",
  100: "#fde3e1",
  200: "#fcccc8",
  300: "#f9a8a2",
  400: "#f3726a",
  500: "#bb1e10",
  600: "#a01a0e",
  700: "#8a1610",
  800: "#6e120d",
  900: "#5a0f0b",
};
const HIGHFIVE_ACCENT = {
  DEFAULT: "#005387",
  dark: "#003d63",
  light: "#0070b8",
  50: "#eef7ff",
  100: "#d9edff",
  200: "#bce0ff",
  300: "#8eccff",
  400: "#59b0ff",
  500: "#005387",
  600: "#004570",
  700: "#003d63",
  800: "#003352",
  900: "#002844",
};

const envColor = (key) => {
  const v = process.env[key];
  return typeof v === "string" && hexToRgb(v) ? v : null;
};

const primaryEnv = envColor("OTORDER_PRIMARY_COLOR");
const accentEnv = envColor("OTORDER_ACCENT_COLOR");
const bgEnv = envColor("OTORDER_BG_COLOR");

const primary = primaryEnv ? buildRamp(primaryEnv) : HIGHFIVE_PRIMARY;
const accent = accentEnv ? buildRamp(accentEnv) : HIGHFIVE_ACCENT;
const background = bgEnv ?? "#ecece7";

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary,
        accent,
        background,
        surface: {
          DEFAULT: "#f5f5f2",
          elevated: "#ffffff",
        },
        foreground: {
          DEFAULT: "#1a1a1a",
          muted: "#6b6b6b",
          subtle: "#9a9a9a",
        },
        border: {
          DEFAULT: "#d4d4cf",
          light: "#e5e5e0",
        },
        status: {
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
