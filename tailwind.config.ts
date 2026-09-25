import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        xs: "420px",
      },
      spacing: {
        "13": "3.25rem",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "accent-soft": "hsl(var(--accent-soft))",
        /* Brandteal til Testfase-modal og hero-cyan til glødeflader. */
        "beta-accent": "hsl(var(--beta-accent))",
        "hero-cyan": "hsl(var(--hero-cyan))",
        "feature-cool": "hsl(var(--feature-cool))",
        "feature-cool-foreground": "hsl(var(--feature-cool-foreground))",
        "feature-warm": "hsl(var(--feature-warm))",
        "feature-warm-foreground": "hsl(var(--feature-warm-foreground))",
        "feature-lilac": "hsl(var(--feature-lilac))",
        "feature-lilac-foreground": "hsl(var(--feature-lilac-foreground))",
        /* Sektions-baggrunde til de offentlige sider — giver siderne
           rytme uden at bryde med det eksisterende tema. */
        surface: "hsl(var(--surface))",
        "surface-strong": "hsl(var(--surface-strong))",
        sand: "hsl(var(--sand))",
        "sand-foreground": "hsl(var(--sand-foreground))",
        ocean: "hsl(var(--ocean))",
        "ocean-foreground": "hsl(var(--ocean-foreground))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Konsekvent pulse — overrider Tailwinds default (2s, 0.5↔1)
        // så skeletons føles ens på tværs af alle paneler. Lidt kortere
        // periode + højere min-opacity giver et roligere, mere "premium"
        // loading-look uden at blinke for meget.
        "pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-soft": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up-fade": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down-fade": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pop-in": {
          "0%":   { opacity: "0", transform: "scale(0.85)" },
          "60%":  { opacity: "1", transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "shine": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "blob": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%":      { transform: "translate(40px, -30px) scale(1.08)" },
          "66%":      { transform: "translate(-30px, 25px) scale(0.95)" },
        },
        "float-y": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-14px)" },
        },
        "drift": {
          "0%, 100%": { transform: "translate(0,0) rotate(0deg)" },
          "50%":      { transform: "translate(8px,-12px) rotate(2deg)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        "twinkle": {
          "0%, 100%": { opacity: "0.2", transform: "scale(0.9)" },
          "50%":      { opacity: "1",   transform: "scale(1.15)" },
        },
        "ken-burns": {
          "0%":   { transform: "scale(1.1) translate3d(0,0,0)" },
          "50%":  { transform: "scale(1.16) translate3d(-1.5%, -1%, 0)" },
          "100%": { transform: "scale(1.1) translate3d(0,0,0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Override af Tailwinds default `animate-pulse` så ALLE skeletons
        // (Skeleton-base + ad-hoc pulse-divs) bruger nøjagtig samme rytme.
        "pulse": "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.6s ease-out both",
        "fade-in-soft": "fade-in-soft 0.2s ease-out both",
        "slide-up-fade":   "slide-up-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-down-fade": "slide-down-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in":        "scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pop-in":          "pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "marquee": "marquee 40s linear infinite",
        "marquee-slow": "marquee 60s linear infinite",
        "shine": "shine 3s linear infinite",
        "blob": "blob 14s ease-in-out infinite",
        "blob-slow": "blob 22s ease-in-out infinite",
        "float-y": "float-y 6s ease-in-out infinite",
        "drift": "drift 8s ease-in-out infinite",
        "gradient-pan": "gradient-pan 8s ease-in-out infinite",
        "twinkle": "twinkle 3s ease-in-out infinite",
        "ken-burns": "ken-burns 24s ease-in-out infinite",
      },
      boxShadow: {
        panel: "0 18px 40px -22px hsl(var(--foreground) / 0.18)",
        insetSoft: "inset 0 1px 0 hsl(var(--background) / 0.7)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
