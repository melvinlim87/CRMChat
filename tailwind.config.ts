import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Violet/indigo "AI" accent
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        // Dark surface palette
        surface: {
          DEFAULT: "#0a0e1a",
          panel: "#0e1322",
          raised: "#141a2c",
          border: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,92,246,0.25), 0 8px 30px -8px rgba(139,92,246,0.45)",
      },
      backgroundImage: {
        "ai-gradient": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 45%, #d946ef 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
