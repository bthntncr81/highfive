import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Five Guys inspired warm palette
        diner: {
          red: '#C41E3A',        // Classic diner red
          'red-dark': '#8B0000', // Deep red
          'red-light': '#E63946',
          cream: '#FFF8F0',      // Warm cream background
          'cream-dark': '#F5E6D3',
          paper: '#FFFBF5',      // Paper white
          kraft: '#D4A574',      // Kraft paper brown
          mustard: '#F4A300',    // Mustard yellow accent
          'mustard-light': '#FFD166',
          ketchup: '#CF1D00',    // Ketchup red (original)
          chocolate: '#3D2314',  // Dark chocolate brown
          'chocolate-light': '#5D4037',
          charcoal: '#2C2C2C',   // Near black
          checkers: '#E8D5C4',   // Checkered pattern color
        },
        // Semantic aliases
        primary: '#C41E3A',
        secondary: '#F4A300',
        background: '#FFF8F0',
        surface: '#FFFBF5',
        'surface-elevated': '#FFFFFF',
        foreground: '#2C2C2C',
        'foreground-muted': '#5D4037',
      },
      fontFamily: {
        // Retro diner fonts
        display: ['"Fredoka One"', 'cursive'],
        heading: ['"Titan One"', 'cursive'],
        body: ['"Nunito"', 'sans-serif'],
        chalk: ['"Permanent Marker"', 'cursive'],
        hand: ['"Patrick Hand"', 'cursive'],
      },
      boxShadow: {
        'diner': '4px 4px 0 0 rgba(61, 35, 20, 0.2)',
        'diner-lg': '6px 6px 0 0 rgba(61, 35, 20, 0.25)',
        'diner-xl': '8px 8px 0 0 rgba(61, 35, 20, 0.3)',
        'stamp': '2px 2px 0 0 rgba(196, 30, 58, 0.3)',
        'paper': '0 2px 8px rgba(61, 35, 20, 0.1)',
        'paper-hover': '0 4px 16px rgba(61, 35, 20, 0.15)',
      },
      borderRadius: {
        'diner': '1rem',
        'diner-lg': '1.5rem',
        'stamp': '0.25rem',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'pulse-warm': 'pulseWarm 2s ease-in-out infinite',
        'stamp': 'stampIn 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'sizzle': 'sizzle 0.3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseWarm: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        stampIn: {
          '0%': { transform: 'scale(1.5) rotate(-10deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(-3deg)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        sizzle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
      },
      backgroundImage: {
        'checkered': `repeating-conic-gradient(#E8D5C4 0% 25%, transparent 0% 50%) 50% / 20px 20px`,
        'checkered-sm': `repeating-conic-gradient(#E8D5C4 0% 25%, transparent 0% 50%) 50% / 12px 12px`,
        'paper-texture': `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        'grain': `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
} satisfies Config
