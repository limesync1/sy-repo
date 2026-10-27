import type { CapacitorConfig } from "@capacitor/cli";

// Native wrapper for the employee panel. The app loads the live site so images
// (CDN asset paths), data and fixes are always current without a new APK.
// Local development (CAP_RELEASE unset) hot-reloads from the Lovable sandbox.
const isRelease = process.env.CAP_RELEASE === "1";

const config: CapacitorConfig = {
  appId: "app.lovable.p3396f095cb5d439d8707af0033c7fb66",
  appName: "Serviceydere",
  webDir: "dist",
  backgroundColor: "#012941",
  server: isRelease
    ? { url: "https://serviceydere.dk/medarbejder", androidScheme: "https" }
    : {
        url: "https://3396f095-cb5d-439d-8707-af0033c7fb66.lovableproject.com/medarbejder?forceHideBadge=true",
        cleartext: true,
      },
  android: {
    // Keep the web view between the status bar and the system navigation bar,
    // so the phone's buttons never cover app buttons.
    adjustMarginsForEdgeToEdge: "force",
  },
  plugins: {
    SystemBars: { insetsHandling: "disable", style: "DARK" },
  },
};

export default config;
