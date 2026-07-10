// OtOrder Admin — ops panel palette. Light paper background (#FBFAF8), white
// cards with hairline borders, red #D92B1C reserved for accents/CTAs only.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBFAF8',
        brand: {
          DEFAULT: '#D92B1C',
          50: '#FDF2F0',
          100: '#FBE3E0',
          200: '#F7C8C2',
          300: '#F0A099',
          400: '#E5665A',
          500: '#D92B1C',
          600: '#C22415',
          700: '#9E1D11',
          800: '#7C170E',
          900: '#63130C',
        },
        ink: {
          DEFAULT: '#15171C',
          soft: '#454A53',
          muted: '#787D87',
        },
        line: '#ECEAE5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
