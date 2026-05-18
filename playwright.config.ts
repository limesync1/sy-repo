import { defineConfig, devices } from "@playwright/test";

// Tillad override af chromium-binær (sandbox-/nix-miljøer hvor Playwright
// ikke selv kan installere browsere). Pegges via PLAYWRIGHT_CHROMIUM_PATH.
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const launchOpts = chromiumPath ? { executablePath: chromiumPath } : {};

/**
 * Playwright config — E2E for DragOverlay containing-block behavior.
 *
 * Vi tester på tværs af desktop, tablet og mobil emulering for at bekræfte
 * at "position: fixed" overlays (som dnd-kit's DragOverlay) følger viewporten
 * korrekt når de er portal'et til <body>, selv når en forfader bruger
 * `transform` (hvilket ellers ville gøre den fixed-positioned barn relativ
 * til forfaderen iht. W3C containing-block reglen).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bunx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/e2e/drag-overlay.html",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop-chrome",  use: { ...devices["Desktop Chrome"],  launchOptions: launchOpts } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"], launchOptions: launchOpts } },
    { name: "desktop-webkit",  use: { ...devices["Desktop Safari"],  launchOptions: launchOpts } },
    { name: "tablet-ipad",     use: { ...devices["iPad Pro 11"],     launchOptions: launchOpts, defaultBrowserType: "chromium" } },
    { name: "mobile-iphone",   use: { ...devices["iPhone 13"],       launchOptions: launchOpts, defaultBrowserType: "chromium" } },
    { name: "mobile-pixel",    use: { ...devices["Pixel 7"],         launchOptions: launchOpts } },
  ],
});