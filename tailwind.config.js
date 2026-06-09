/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      colors: {
        base:     '#07071A',
        surface:  '#0c0c22',
        card:     '#0f0f28',
        elevated: '#141430',
        noche:    '#07071A',
        oro:      '#FFD700',
        si:       '#00FF88',
        no:       '#FF2D55',
        cream:    '#F5F0E8',
        'border-subtle':  'rgba(255, 215, 0, 0.10)',
        'border-default': 'rgba(255, 215, 0, 0.18)',
        'text-primary':   '#F5F0E8',
        'text-secondary': 'rgba(245, 240, 232, 0.60)',
        'text-tertiary':  'rgba(245, 240, 232, 0.35)',
        green:      '#00FF88',
        'green-dim': 'rgba(0, 255, 136, 0.12)',
        red:        '#FF2D55',
        'red-dim':  'rgba(255, 45, 85, 0.12)',
        gold:       '#FFD700',
        'gold-dim': 'rgba(255, 215, 0, 0.08)',
        brand:      '#FFD700',
        'brand-dim': 'rgba(255, 215, 0, 0.08)',
        blue:       '#FFD700',
        'blue-dim': 'rgba(255, 215, 0, 0.10)',
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
