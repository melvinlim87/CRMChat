import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#2563eb",
        brand2: "#1d4ed8",
        accent: "#0ea5e9",
        ok: "#16a34a",
        warn: "#d97706",
        bad: "#dc2626",
      },
    },
  },
  plugins: [],
};
export default config;
