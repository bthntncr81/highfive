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
          500: '#bb1e10',
          600: '#a01a0d',
          700: '#8a1610',
          800: '#6b0f00',
          900: '#520c00',
        },
        accent: {
          50: '#eef6fb',
          100: '#d4e8f5',
          200: '#a8d1eb',
          300: '#6db3dc',
          400: '#3393c8',
          500: '#005387',
          600: '#004570',
          700: '#003d63',
          800: '#002e4a',
          900: '#001f32',
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

