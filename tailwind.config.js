/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        base: '#06061a',
        surface: '#0b0b24',
        card: '#0f0f2e',
        elevated: '#14143a',
        'border-subtle': '#1c1c48',
        'border-default': '#26265e',
        'text-primary': '#f0f0ff',
        'text-secondary': '#8888cc',
        'text-tertiary': '#50507a',
        green: '#00e87d',
        'green-dim': 'rgba(0, 232, 125, 0.12)',
        red: '#ff2d55',
        'red-dim': 'rgba(255, 45, 85, 0.12)',
        gold: '#ffd060',
        brand: '#e0522e',
        'brand-dim': 'rgba(224, 82, 46, 0.15)',
        blue: '#4f8eff',
        'blue-dim': 'rgba(79, 142, 255, 0.12)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pulse-slow': 'livePulse 2s ease-in-out infinite',
        ticker: 'ticker 50s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        livePulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.75)' },
        },
      },
    },
  },
  plugins: [],
}
