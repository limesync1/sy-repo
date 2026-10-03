import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { seoPrerenderHead } from "./scripts/seo-prerender-head";
// @ts-expect-error JavaScript-hjælperen har ikke sin egen TypeScript-erklæring.
import { buildPlannerGuide } from "./scripts/build-planner-guide.mjs";

/**
 * Holder PDF-brugerguiden i sync med funktionskataloget: så snart
 * src/data/routePlannerFeatures.ts gemmes i dev, genereres PDF'en igen.
 */
const plannerGuidePlugin = () => ({
  name: "planner-guide-pdf",
  apply: "serve" as const,
  handleHotUpdate({ file }: { file: string }) {
    if (file.endsWith("src/data/routePlannerFeatures.ts")) {
      setTimeout(() => buildPlannerGuide({ silent: false }), 0);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // CDN pointers are served by hosting; local Vite needs the same asset path.
      "/__l5e/assets-v1/": {
        target: "https://serviceydere.dk",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [react(), plannerGuidePlugin(), seoPrerenderHead(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
