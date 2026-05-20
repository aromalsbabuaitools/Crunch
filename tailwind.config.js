/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "neon-pink": "#FF6B9D",
        "neon-cyan": "#00D4FF",
        "neon-purple": "#B06EFF",
        "neon-green": "#39FF14",
        "dark-bg": "#0D0D1A",
        "dark-surface": "#13131F",
        "dark-card": "#1A1A2E",
        "dark-border": "#2A2A4A",
        "dark-text": "#E8E8FF",
        "dark-muted": "#8888AA",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 212, 255, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(0, 212, 255, 0.6), 0 0 80px rgba(176, 110, 255, 0.3)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      backgroundImage: {
        "gradient-anime": "linear-gradient(135deg, #0D0D1A 0%, #13131F 50%, #0D0D1A 100%)",
        "gradient-neon": "linear-gradient(90deg, #FF6B9D, #B06EFF, #00D4FF)",
      },
    },
  },
  plugins: [],
}
