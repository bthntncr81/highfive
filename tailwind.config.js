/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/*/index.html',
    './apps/*/src/**/*.{js,ts,jsx,tsx}',
    './packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#C41E3A', // High Five Red
          600: '#b91c35',
          700: '#9f1a2f',
          800: '#851829',
          900: '#6b1522',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#F4A300', // High Five Gold
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        diner: {
          cream: '#FDF6E3',
          kraft: '#D4A574',
          brown: '#5D4037',
          red: '#C41E3A',
          gold: '#F4A300',
        },
      },
      fontFamily: {
        display: ['Permanent Marker', 'cursive'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
