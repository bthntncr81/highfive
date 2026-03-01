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
          500: '#CF1D00',
        },
        accent: {
          400: '#F4A300',
        },
      },
    },
  },
  plugins: [],
};

