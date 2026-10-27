import type { CapacitorConfig } from "@capacitor/cli";

// Native wrapper for the employee panel. During development the app hot-reloads
// from the Lovable sandbox; remove `server` before building a release so the
// bundled `dist` (opened at /medarbejder) is used instead.
const config: CapacitorConfig = {
  appId: "app.lovable.p3396f095cb5d439d8707af0033c7fb66",
  appName: "serviceydere",
  webDir: "dist",
  server: {
    url: "https://3396f095-cb5d-439d-8707-af0033c7fb66.lovableproject.com/medarbejder?forceHideBadge=true",
    cleartext: true,
  },
  backgroundColor: "#ffffff",
};

export default config;
