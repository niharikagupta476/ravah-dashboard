import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          light: "#F6F7F9",
          dark: "#0F172A"
        },
        panel: {
          light: "#FFFFFF",
          dark: "#111827"
        },
        border: {
          light: "#E5E7EB",
          dark: "#1F2937"
        },
        accent: {
          DEFAULT: "#4F46E5",
          muted: "#6366F1"
        }
      }
    }
  },
  plugins: []
};

export default config;
