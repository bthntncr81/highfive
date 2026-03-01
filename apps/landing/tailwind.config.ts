import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // HighFive Modern Palette
        primary: {
          DEFAULT: '#bb1e10',
          dark: '#8a1610',
          light: '#d4382a',
          50: '#fef2f1',
          100: '#fde3e1',
          200: '#fcccc8',
          300: '#f9a8a2',
          400: '#f3726a',
          500: '#bb1e10',
          600: '#a01a0e',
          700: '#8a1610',
          800: '#6e120d',
          900: '#5a0f0b',
        },
        accent: {
          DEFAULT: '#005387',
          dark: '#003d63',
          light: '#0070b8',
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8eccff',
          400: '#59b0ff',
          500: '#005387',
          600: '#004570',
          700: '#003d63',
          800: '#003352',
          900: '#002844',
        },
        background: '#ecece7',
        surface: {
          DEFAULT: '#f5f5f2',
          elevated: '#ffffff',
        },
        foreground: {
          DEFAULT: '#1a1a1a',
          muted: '#6b6b6b',
          subtle: '#9a9a9a',
        },
        border: {
          DEFAULT: '#d4d4cf',
          light: '#e5e5e0',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'md': '0 4px 6px rgba(0,0,0,0.07)',
        'lg': '0 10px 15px rgba(0,0,0,0.1)',
        'xl': '0 20px 25px rgba(0,0,0,0.1)',
        '2xl': '0 25px 50px rgba(0,0,0,0.15)',
        'inner': 'inset 0 2px 4px rgba(0,0,0,0.06)',
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 20px rgba(0,0,0,0.1), 0 3px 6px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
