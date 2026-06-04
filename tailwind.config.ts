import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Champagne / gold accent (Algo Venture style)
        brand: {
          50: "#fbf6e9",
          100: "#f6ebc8",
          200: "#eed79a",
          300: "#e7c97a",
          400: "#d9b15e",
          500: "#cda14a",
          600: "#b2862f",
          700: "#8a6622",
        },
        // Near-black luxury surfaces
        surface: {
          DEFAULT: "#050507",
          panel: "#0c0d11",
          raised: "#14151b",
          border: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "ui-serif", "serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(205,161,74,0.25), 0 10px 36px -10px rgba(205,161,74,0.45)",
      },
      backgroundImage: {
        "ai-gradient": "linear-gradient(135deg, #f3d989 0%, #d9b15e 50%, #b2862f 100%)",
        gold: "linear-gradient(135deg, #f3d989 0%, #d9b15e 55%, #b2862f 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
