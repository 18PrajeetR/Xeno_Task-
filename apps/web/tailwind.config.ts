import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)", "Inter", "sans-serif"],
      },
      colors: {
        ink: "#111318",
        paper: "#f5f5f2",
        violet: "#6956e8",
        mint: "#b9f6d0",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(22, 23, 29, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;

