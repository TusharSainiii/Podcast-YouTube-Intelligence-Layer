/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: {
            primary: "#0F0F0F",
            secondary: "#161616",
            tertiary: "#1E1E1E",
          },
          border: {
            muted: "#222222",
            active: "#2E2E2E",
          },
          accent: {
            purple: "#6C63FF",
            purpleGlow: "rgba(108, 99, 255, 0.15)",
          },
          text: {
            primary: "#F5F5F5",
            secondary: "#888888",
            disabled: "#555555",
          },
          success: "#22C55E",
          error: "#EF4444",
          warning: "#F59E0B",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 15px rgba(108, 99, 255, 0.25)",
        "glow-strong": "0 0 25px rgba(108, 99, 255, 0.4)",
      }
    },
  },
  plugins: [],
}
