// Tenant beyaz-etiket teması — order-site açılışında /api/settings/public/theme
// çekilir; marka rengi/logo/isim uygulanır. Tema yoksa (veya Akçakoca gibi kendi
// değerleriyle) CSS :root varsayılanları (HighFive) devrede kalır → görsel aynı.
//
// Renk stratejisi: tenant TEK marka rengi verir; ondan 50..900 ton rampasını JS
// üretir ve --brand-* CSS değişkenlerine yazar. tailwind primary.* bu değişkenleri
// rgb(var(--brand-*)) olarak kullanır.

export interface TenantTheme {
  name?: string;
  logoUrl?: string | null;
  fontFamily?: string;
  colors?: Record<string, string>; // "primary": "187 30 16" (rgb kanal) veya "#bb1e10"
  menuTemplate?: number; // 1-20 menü tasarımı
  published?: boolean;   // tanıtım landing'i yayında mı
  customLanding?: string | null; // premium elle kodlanmış landing anahtarı (custom/ registry)
}

let cached: TenantTheme | null = null;
const listeners = new Set<(t: TenantTheme | null) => void>();
export function subscribeTheme(fn: (t: TenantTheme | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() { for (const fn of listeners) fn(cached); }

function toRgbTriplet(input?: string): [number, number, number] | null {
  if (!input) return null;
  const s = input.trim();
  // "187 30 16"
  const m = s.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/);
  if (m) return [+m[1], +m[2], +m[3]];
  // "#bb1e10" | "#b10"
  const hex = s.replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  if (/^[0-9a-fA-F]{3}$/.test(hex)) return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  return null;
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const mix = ([r, g, b]: number[], [r2, g2, b2]: number[], t: number): [number, number, number] =>
  [clamp(r + (r2 - r) * t), clamp(g + (g2 - g) * t), clamp(b + (b2 - b) * t)];

// Tek marka renginden 50..900 rampası (açık uçları beyaza, koyu uçları siyaha karışım)
function buildRamp(base: [number, number, number]): Record<string, [number, number, number]> {
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  return {
    DEFAULT: base,
    light: mix(base, white, 0.18),
    dark: mix(base, black, 0.25),
    50: mix(base, white, 0.94),
    100: mix(base, white, 0.86),
    200: mix(base, white, 0.72),
    300: mix(base, white, 0.52),
    400: mix(base, white, 0.28),
    500: base,
    600: mix(base, black, 0.14),
    700: mix(base, black, 0.26),
    800: mix(base, black, 0.4),
    900: mix(base, black, 0.52),
  };
}

export function applyTheme(theme: TenantTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const primary = toRgbTriplet(theme.colors?.primary);
  if (primary) {
    const ramp = buildRamp(primary);
    for (const [k, [r, g, b]] of Object.entries(ramp)) {
      root.style.setProperty(`--brand-${k}`, `${r} ${g} ${b}`);
    }
    // Eski hex-tabanlı değişkenler de override (var(--color-primary) kullanan CSS için)
    const rgb = ([r, g, b]: number[]) => `rgb(${r} ${g} ${b})`;
    root.style.setProperty('--color-primary', rgb(ramp.DEFAULT));
    root.style.setProperty('--color-primary-dark', rgb(ramp.dark));
    root.style.setProperty('--color-primary-light', rgb(ramp.light));
  }
  // Vurgu (accent) ve ikincil renkler — order-site --color-accent kullanır.
  const rgbStr = ([r, g, b]: number[]) => `rgb(${r} ${g} ${b})`;
  const accent = toRgbTriplet(theme.colors?.accent);
  if (accent) {
    root.style.setProperty('--color-accent', rgbStr(accent));
    root.style.setProperty('--color-accent-dark', rgbStr(mix(accent, [0, 0, 0], 0.2)));
    root.style.setProperty('--color-accent-light', rgbStr(mix(accent, [255, 255, 255], 0.18)));
  }
  const secondary = toRgbTriplet(theme.colors?.secondary);
  if (secondary) root.style.setProperty('--color-secondary', rgbStr(secondary));

  if (theme.fontFamily) {
    root.style.setProperty('--font-brand', theme.fontFamily);
    // body font'unu da tema fontuna bağla (globals.css font-body @apply yerine).
    document.body.style.fontFamily = theme.fontFamily;
  }
  // Özel landing kendi title/SEO'sunu yönetir — ezme.
  if (theme.name && !theme.customLanding) document.title = theme.name;
}

// Açılış bootstrap'ı. Cache anahtarı subdomain → çapraz tenant sızmaz.
export async function bootstrapTheme(apiBase = ''): Promise<TenantTheme | null> {
  if (typeof window === 'undefined') return null;
  const sub = window.location.hostname.split('.')[0];
  const key = `otorder.landing.theme.${sub}`;
  // 1) cache anında uygula (FOUC yok)
  try {
    const c = localStorage.getItem(key);
    if (c) { cached = JSON.parse(c); applyTheme(cached!); emit(); }
  } catch { /* ignore */ }
  // 2) taze çek
  try {
    const res = await fetch(`${apiBase}/api/settings/public/theme`);
    if (!res.ok) return cached;
    const theme = (await res.json()) as TenantTheme;
    cached = theme;
    applyTheme(theme);
    emit();
    try { localStorage.setItem(key, JSON.stringify(theme)); } catch { /* ignore */ }
    return theme;
  } catch {
    return cached;
  }
}

export function getTheme(): TenantTheme | null {
  return cached;
}
