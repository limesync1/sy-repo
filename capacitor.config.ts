import type { CapacitorConfig } from "@capacitor/cli";

// Native wrapper for owners and employees (role choice at /app). The app loads the live site so images
// (CDN asset paths), data and fixes are always current without a new APK.
// Local development (CAP_RELEASE unset) hot-reloads from the Lovable sandbox.
const isRelease = process.env.CAP_RELEASE === "1";

const config: CapacitorConfig = {
  appId: "app.lovable.p3396f095cb5d439d8707af0033c7fb66",
  appName: "Serviceydere",
  webDir: "dist",
  backgroundColor: "#ffffff",
  server: isRelease
    ? { url: "https://serviceydere.dk/app", androidScheme: "https" }
    : {
        url: "https://3396f095-cb5d-439d-8707-af0033c7fb66.lovableproject.com/app?forceHideBadge=true",
        cleartext: true,
      },
  // iPhone/iPad: keep the web view inside the safe area (notch, Dynamic Island,
  // home indicator) so no button sits under the phone's own navigation.
  ios: { contentInset: "always", scheme: "Serviceydere" },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#ffffff",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: { style: "LIGHT", backgroundColor: "#ffffff", overlaysWebView: false },
    // Native insets + viewport-fit=contain (set in main.tsx for native) keep the
    // web view between the status bar and the phone's navigation buttons.
    SystemBars: { insetsHandling: "native", initialViewportFitValueHint: "contain" },
  },
};

export default config;
