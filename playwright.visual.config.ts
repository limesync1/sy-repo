import { defineConfig, devices } from "@playwright/test";

/**
 * Dedikeret Playwright-config til dark-mode visuelle regressions-tests.
 * Bruges af CI (.github/workflows/visual-regression.yml) og lokalt via:
 *   bun run test:visual
 *   bun run test:visual:update
 *
 * - Kun e2e/dark-mode-planner.spec.ts koeres her.
 * - maxFailures: 1 => fail-fast paa foerste pixel-diff over taerskel.
 * - Strammere taerskel end dev-defaults: max 0.5% pixel-diff pr. snapshot.
 * - Baselines gemmes pr. tema via snapshot-filnavn (...-light.png / ...-dark.png).
 */
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const launchOpts = chromiumPath ? { executablePath: chromiumPath } : {};
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  // Kører både planner- og livechat-suiterne i samme run så CI rapporterer
  // alle dark-mode regressions i én pass.
  testMatch: /dark-mode-(planner|livechat)\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: isCI,
  maxFailures: 1,
  retries: 0,
  reporter: isCI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report/visual" }]]
    : [["list"]],
  outputDir: "test-results/visual",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
      threshold: 0.15,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bunx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/__visual/planner?mode=light",
    reuseExistingServer: !isCI,
    timeout: 90_000,
  },
  projects: [
    {
      name: "chromium-1280",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        launchOptions: launchOpts,
      },
    },
  ],
});
