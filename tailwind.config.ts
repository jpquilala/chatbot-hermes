import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: {
          black: "#070707",
          charcoal: "#111214",
          panel: "#18191c",
          line: "#2b2414",
          gold: "#f5b82e",
          deepGold: "#9f7118",
          red: "#d83b31",
          green: "#2e9d65",
          blue: "#3478f6"
        }
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(245,184,46,.18), 0 18px 60px rgba(0,0,0,.35)"
      }
    }
  },
  plugins: []
};

export default config;
