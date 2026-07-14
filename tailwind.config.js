/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "oklch(30% 0.1 250)",
        "primary-light": "oklch(60% 0.1 250)",
        bg: {
          light: "oklch(98% 0.01 80)",
          dark: "oklch(20% 0.05 250)",
        },
        text: {
          light: "oklch(20% 0.05 80)",
          dark: "oklch(95% 0.01 80)",
        },
        surface: {
          light: "oklch(100% 0 0)",
          dark: "oklch(25% 0.03 250)",
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  darkMode: "class",
  plugins: [],
}