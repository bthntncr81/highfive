/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // HighFive Marka Paleti — landing ile aynı (highfivepps.com)
        primary: {
          DEFAULT: "#bb1e10",
          dark: "#8a1610",
          light: "#d4382a",
          50: "#fef2f1",
          100: "#fde3e1",
          200: "#fcccc8",
          300: "#f9a8a2",
          400: "#f3726a",
          500: "#bb1e10",
          600: "#a01a0e",
          700: "#8a1610",
          800: "#6e120d",
          900: "#5a0f0b",
        },
        accent: {
          DEFAULT: "#005387",
          dark: "#003d63",
          light: "#0070b8",
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bce0ff",
          300: "#8eccff",
          400: "#59b0ff",
          500: "#005387",
          600: "#004570",
          700: "#003d63",
          800: "#003352",
          900: "#002844",
        },
        background: "#ecece7",
        surface: {
          DEFAULT: "#f5f5f2",
          elevated: "#ffffff",
        },
        foreground: {
          DEFAULT: "#1a1a1a",
          muted: "#6b6b6b",
          subtle: "#9a9a9a",
        },
        border: {
          DEFAULT: "#d4d4cf",
          light: "#e5e5e0",
        },
        status: {
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
