import type { Config } from 'tailwindcss';

// "Beyaz önlük" sistemi — saf beyaz zemin, derin yosun yeşili imza (seed 150°),
// liken sarısı mikro-vurgu. `brand` anahtarı yeşile işaret eder (Signup/Login
// sayfalarındaki mevcut sınıflar otomatik yeni kimliğe geçer).
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'oklch(0.42 0.11 150)',
          50: 'oklch(0.972 0.012 150)',
          100: 'oklch(0.945 0.025 150)',
          200: 'oklch(0.885 0.05 150)',
          300: 'oklch(0.78 0.085 150)',
          400: 'oklch(0.60 0.105 150)',
          500: 'oklch(0.48 0.11 150)',
          600: 'oklch(0.42 0.11 150)',
          700: 'oklch(0.36 0.10 150)',
          800: 'oklch(0.30 0.085 150)',
          900: 'oklch(0.24 0.06 150)',
        },
        ink: {
          DEFAULT: 'oklch(0.18 0.012 150)',
          soft: 'oklch(0.32 0.015 150)',
          muted: 'oklch(0.45 0.02 150)',
        },
        lichen: 'oklch(0.82 0.15 105)',
        line: 'oklch(0.905 0.01 150)',
        wash: 'oklch(0.972 0.008 150)',
        kds: {
          DEFAULT: 'oklch(0.21 0.015 155)',
          panel: 'oklch(0.26 0.018 155)',
          line: 'oklch(0.34 0.02 155)',
        },
      },
      fontFamily: {
        sans: ['"Schibsted Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"Spline Sans Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        measure: '68ch',
      },
    },
  },
  plugins: [],
} satisfies Config;
