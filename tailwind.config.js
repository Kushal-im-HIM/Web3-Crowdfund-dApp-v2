// tailwind.config.js
// UI/UX UPGRADE — Slate Emerald Harmony
//   - Added 'display' font family: Space Grotesk (Web3 standard display font)
//   - Updated gradient-slate-emerald to use cool slate tones (not cream)
//     so the hero gradient matches the new Slate Emerald Harmony light mode.
//   - All dark mode colours, spacing, and other config: UNCHANGED.

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0",
          300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b",
          600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a",
        },
        secondary: {
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0",
          300: "#6ee7b7", 400: "#34d399", 500: "#10b981",
          600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b",
        },
        accent: {
          50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a",
          300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b",
          600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f",
        },
        tertiary: {
          50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc",
          300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4",
          600: "#0891b2", 700: "#0e7490", 800: "#155e75", 900: "#164e63",
        },
        success: {
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0",
          300: "#6ee7b7", 400: "#34d399", 500: "#10b981",
          600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b",
        },
        warning: {
          50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a",
          300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b",
          600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f",
        },
        error: {
          50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca",
          300: "#fca5a5", 400: "#f87171", 500: "#ef4444",
          600: "#dc2626", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d",
        },
        gray: {
          50: "#fafafa", 100: "#f5f5f5", 200: "#e5e5e5",
          300: "#d4d4d4", 400: "#a3a3a3", 500: "#737373",
          600: "#525252", 700: "#404040", 800: "#262626", 900: "#171717",
        },
      },

      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        // NEW: Space Grotesk — the standard Web3 display font
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["Fira Code", "ui-monospace", "monospace"],
      },

      spacing: {
        18: "4.5rem", 88: "22rem", 128: "32rem",
      },

      borderRadius: {
        "4xl": "2rem", "5xl": "2.5rem",
      },

      boxShadow: {
        soft: "0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)",
        medium: "0 4px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
        large: "0 10px 50px -12px rgba(0,0,0,0.25)",
        "inner-lg": "inset 0 2px 4px 0 rgba(0,0,0,0.06)",
        "emerald-glow": "0 8px 24px rgba(16,185,129,0.18)",
        "slate-soft": "0 2px 8px rgba(0,0,0,0.04)",
        "amber-glow": "0 4px 14px rgba(245,158,11,0.2)",
      },

      backgroundImage: {
        // UPDATED: cool slate tones for light mode hero gradient
        "gradient-slate-emerald":
          "linear-gradient(135deg, #f1f5f9 0%, #ecfdf5 50%, #e2e8f0 100%)",
        "gradient-slate-emerald-dark":
          "linear-gradient(135deg, #0f172a 0%, #064e3b 100%)",
        "gradient-emerald":
          "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        "gradient-amber":
          "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      },

      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "fade-out": "fadeOut 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "slide-left": "slideLeft 0.3s ease-out",
        "slide-right": "slideRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "scale-out": "scaleOut 0.2s ease-in",
        "bounce-slow": "bounce 2s infinite",
        "pulse-slow": "pulse 3s infinite",
        "spin-slow": "spin 3s linear infinite",
        wiggle: "wiggle 1s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "emerald-pulse": "emeraldPulse 2s ease-in-out infinite",
      },

      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeOut: { "0%": { opacity: "1" }, "100%": { opacity: "0" } },
        slideUp: { "0%": { transform: "translateY(100%)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        slideDown: { "0%": { transform: "translateY(-100%)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        slideLeft: { "0%": { transform: "translateX(100%)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        slideRight: { "0%": { transform: "translateX(-100%)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        scaleIn: { "0%": { transform: "scale(0)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        scaleOut: { "0%": { transform: "scale(1)", opacity: "1" }, "100%": { transform: "scale(0)", opacity: "0" } },
        wiggle: { "0%, 100%": { transform: "rotate(-3deg)" }, "50%": { transform: "rotate(3deg)" } },
        float: { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-10px)" } },
        glow: { "0%": { boxShadow: "0 0 5px rgba(16,185,129,0.3)" }, "100%": { boxShadow: "0 0 20px rgba(16,185,129,0.7)" } },
        emeraldPulse: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(16,185,129,0.4)" },
          "50%": { boxShadow: "0 0 24px rgba(16,185,129,0.8)" },
        },
      },

      backdropBlur: { xs: "2px" },

      zIndex: { 60: "60", 70: "70", 80: "80", 90: "90", 100: "100" },

      screens: { xs: "475px", "3xl": "1600px" },

      maxWidth: { "8xl": "88rem", "9xl": "96rem" },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    function ({ addUtilities }) {
      addUtilities({
        ".text-shadow": { textShadow: "0 2px 4px rgba(0,0,0,0.10)" },
        ".text-shadow-md": { textShadow: "0 4px 8px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)" },
        ".text-shadow-lg": { textShadow: "0 15px 35px rgba(0,0,0,0.12), 0 5px 15px rgba(0,0,0,0.07)" },
        ".text-shadow-none": { textShadow: "none" },
        ".filter-none": { filter: "none" },
        ".filter-grayscale": { filter: "grayscale(100%)" },
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": { display: "none" },
        },
      });
    },
  ],
};
