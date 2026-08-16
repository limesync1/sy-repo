import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
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
  },
  plugins: [react(), plannerGuidePlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
