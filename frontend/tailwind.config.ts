import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0E1A",
        primary: "#00D4FF",
        danger: "#FF3B3B",
        safe: "#00E676",
        warning: "#FFB300",
        surface: "#111827",
        "surface-2": "#1a2235",
        "text-primary": "#E2E8F0",
        "text-muted": "#64748B",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-red": "pulse-red 1.5s ease-in-out infinite",
        "pulse-green": "pulse-green 2s ease-in-out infinite",
        "scan-line": "scan-line 2s linear infinite",
        "risk-fill": "risk-fill 8s ease-out forwards",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        "typing": "typing 0.1s steps(1) forwards",
        "glow-cyan": "glow-cyan 2s ease-in-out infinite",
        "shake": "shake 0.5s ease-in-out",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 59, 59, 0.7)" },
          "50%": { boxShadow: "0 0 0 20px rgba(255, 59, 59, 0)" },
        },
        "pulse-green": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 230, 118, 0.7)" },
          "50%": { boxShadow: "0 0 0 15px rgba(0, 230, 118, 0)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "glow-cyan": {
          "0%, 100%": { textShadow: "0 0 10px rgba(0, 212, 255, 0.5)" },
          "50%": { textShadow: "0 0 30px rgba(0, 212, 255, 1), 0 0 60px rgba(0, 212, 255, 0.5)" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
export default config;
