/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['Inter', 'system-ui', 'sans-serif'],
      },
      // Colores: NO definir aquí. La paleta vive como tokens CSS en
      // src/index.css (:root oscuro + html[data-theme='light']) — usar
      // siempre var(--token). Una copia aquí solo conocería un tema.
      animation: {
        'fade-up': 'fadeUp 0.22s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
