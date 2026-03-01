/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f0',
          100: '#fee0db',
          200: '#fec5bb',
          300: '#fc9a8a',
          400: '#f87161',
          500: '#CF1D00',
          600: '#b91900',
          700: '#A01600',
          800: '#851200',
          900: '#6b0f00',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#F4A300',
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
          red: '#CF1D00',
          gold: '#F4A300',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'Permanent Marker', 'cursive'],
        body: ['Poppins', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

