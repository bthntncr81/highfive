import type { Config } from 'tailwindcss';

// HighFive marka paleti — highfivepps.com ile birebir aynı kırmızı ailesi
// (apps/landing tailwind'inden). 600 = ana marka rengi #bb1e10.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#bb1e10',
          50: '#fef2f1',
          100: '#fde3e1',
          200: '#fcccc8',
          300: '#f9a8a2',
          400: '#f3726a',
          500: '#d4382a',
          600: '#bb1e10',
          700: '#8a1610',
          800: '#6e120d',
          900: '#5a0f0b',
        },
        ink: {
          DEFAULT: 'oklch(0.185 0.008 29)',
          soft: 'oklch(0.32 0.012 29)',
          muted: 'oklch(0.45 0.014 29)',
        },
        lichen: '#f3726a',
        line: 'oklch(0.905 0.008 29)',
        wash: 'oklch(0.972 0.006 29)',
        kds: {
          DEFAULT: 'oklch(0.21 0.01 29)',
          panel: 'oklch(0.26 0.012 29)',
          line: 'oklch(0.34 0.014 29)',
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
