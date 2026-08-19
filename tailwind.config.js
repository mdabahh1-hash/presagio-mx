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
      // Colores: NO definir aquí. La paleta vive como tokens CSS en
      // src/index.css (:root oscuro + html[data-theme='light']) — usar
      // siempre var(--token). Una copia aquí solo conocería un tema.
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
