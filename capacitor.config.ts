import type { CapacitorConfig } from "@capacitor/cli";

// Native wrapper for the employee panel. Local development hot-reloads from the
// Lovable sandbox; release builds (CAP_RELEASE=1, used by CI) bundle `dist`.
const isRelease = process.env.CAP_RELEASE === "1";

const config: CapacitorConfig = {
  appId: "app.lovable.p3396f095cb5d439d8707af0033c7fb66",
  appName: "Serviceydere",
  webDir: "dist",
  backgroundColor: "#012941",
  ...(isRelease
    ? {}
    : {
        server: {
          url: "https://3396f095-cb5d-439d-8707-af0033c7fb66.lovableproject.com/medarbejder?forceHideBadge=true",
          cleartext: true,
        },
      }),
};

export default config;
