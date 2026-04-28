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
        base: '#07070e',
        surface: '#0d0d18',
        card: '#111120',
        elevated: '#181830',
        'border-subtle': '#1e1e38',
        'border-default': '#282845',
        'text-primary': '#eeeef8',
        'text-secondary': '#8888b0',
        'text-tertiary': '#555580',
        green: '#00d084',
        'green-dim': 'rgba(0, 208, 132, 0.12)',
        red: '#ff4560',
        'red-dim': 'rgba(255, 69, 96, 0.12)',
        gold: '#f0c040',
        brand: '#c94828',
        'brand-dim': 'rgba(201, 72, 40, 0.15)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        ticker: 'ticker 30s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
