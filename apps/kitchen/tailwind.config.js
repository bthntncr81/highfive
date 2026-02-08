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
          500: '#C41E3A',
        },
        accent: {
          400: '#F4A300',
        },
      },
    },
  },
  plugins: [],
};

