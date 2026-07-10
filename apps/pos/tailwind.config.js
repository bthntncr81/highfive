/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Beyaz-etiket: --brand-* CSS değişkenlerinden okunur (styles.css :root
        // varsayılanı = HighFive kırmızısı). theme.ts tenant rengiyle override eder.
        primary: {
          DEFAULT: 'rgb(var(--brand-DEFAULT) / <alpha-value>)',
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
        },
        accent: {
          50: 'rgb(var(--brand-accent-50) / <alpha-value>)',
          100: 'rgb(var(--brand-accent-100) / <alpha-value>)',
          200: 'rgb(var(--brand-accent-200) / <alpha-value>)',
          300: 'rgb(var(--brand-accent-300) / <alpha-value>)',
          400: 'rgb(var(--brand-accent-400) / <alpha-value>)',
          500: 'rgb(var(--brand-accent-500) / <alpha-value>)',
          600: 'rgb(var(--brand-accent-600) / <alpha-value>)',
          700: 'rgb(var(--brand-accent-700) / <alpha-value>)',
          800: 'rgb(var(--brand-accent-800) / <alpha-value>)',
          900: 'rgb(var(--brand-accent-900) / <alpha-value>)',
        },
        surface: {
          DEFAULT: '#ecece7',
          light: '#f5f5f2',
          elevated: '#ffffff',
        },
        foreground: {
          DEFAULT: '#1a1a1a',
          muted: '#6b6b6b',
        },
        border: {
          DEFAULT: '#d4d4cf',
          light: '#e5e5e0',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
