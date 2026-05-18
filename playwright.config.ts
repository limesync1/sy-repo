import { defineConfig, devices } from "@playwright/test";

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
    { name: "desktop-chrome",  use: { ...devices["Desktop Chrome"] } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "desktop-webkit",  use: { ...devices["Desktop Safari"] } },
    { name: "tablet-ipad",     use: { ...devices["iPad Pro 11"] } },
    { name: "mobile-iphone",   use: { ...devices["iPhone 13"] } },
    { name: "mobile-pixel",    use: { ...devices["Pixel 7"] } },
  ],
});