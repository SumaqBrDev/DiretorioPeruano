/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'Consolas', 'monospace'],
      },
      colors: {
        'aji-rojo': '#C0392B',
        'oro-inca': '#F39C12',
        'creme-andino': '#FAF3E0',
        'verde-brasil': '#27AE60',
        'noche-lima': '#1A1A2E',
      },
    },
  },
  darkMode: "class",
  plugins: [],
};
