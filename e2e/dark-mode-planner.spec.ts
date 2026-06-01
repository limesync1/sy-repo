import { test, expect } from "@playwright/test";

/**
 * Visual regression for dark mode på ruteplanlæggerens UI-primitiver.
 *
 * Fixturen ligger på /__visual/planner og kræver ingen auth/data.
 * Den mounter knapper (alle varianter), badges, kort, inputs, select,
 * Dialog, AlertDialog og Sheet — så vi rammer både modal-overlays,
 * close-ikoner, hover/active/focus states og baggrundskontrast.
 *
 * Snapshots gemmes pr. browser-projekt. Generér første gang med:
 *   bun run test:e2e -- --update-snapshots dark-mode-planner
 *
 * Tærskel: 1% pixel-diff for at tillade font-rendering subpixels på
 * tværs af OS, men fange ægte farve/kontrast-fejl i dark mode.
 */

const SNAPSHOT_OPTS = {
  maxDiffPixelRatio: 0.01,
  animations: "disabled" as const,
  caret: "hide" as const,
};

const MODES = ["light", "dark"] as const;

test.describe("Route planner — visual regression (light + dark)", () => {
  for (const mode of MODES) {
    test.describe(`${mode} mode`, () => {
      test("page surface, buttons og badges", async ({ page }) => {
        await page.goto(`/__visual/planner?mode=${mode}`);
        await page.waitForSelector('[data-testid="visual-test-root"]');
        await page.waitForTimeout(100);
        await expect(page).toHaveScreenshot(`planner-surface-${mode}.png`, SNAPSHOT_OPTS);
      });

      test("button hover-state for alle varianter", async ({ page }) => {
        await page.goto(`/__visual/planner?mode=${mode}`);
        await page.waitForSelector('[data-testid="visual-test-root"]');

        for (const variant of ["default", "secondary", "outline", "ghost", "destructive"] as const) {
          const btn = page.getByTestId(`btn-${variant}`);
          await btn.hover();
          await page.waitForTimeout(80);
          await expect(btn).toHaveScreenshot(
            `btn-${variant}-hover-${mode}.png`,
            SNAPSHOT_OPTS,
          );
        }
      });

      test("button active (mouse-down) state", async ({ page }) => {
        await page.goto(`/__visual/planner?mode=${mode}`);
        const btn = page.getByTestId("btn-default");
        const box = await btn.boundingBox();
        if (!box) throw new Error("knap ikke fundet");
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(80);
        await expect(btn).toHaveScreenshot(`btn-default-active-${mode}.png`, SNAPSHOT_OPTS);
        await page.mouse.up();
      });

      test("button focus-visible (keyboard)", async ({ page }) => {
        await page.goto(`/__visual/planner?mode=${mode}`);
        await page.waitForSelector('[data-testid="visual-test-root"]');
        // Tab indtil første knap i grid'et har fokus.
        await page.keyboard.press("Tab");
        await page.waitForTimeout(80);
        const btn = page.getByTestId("btn-default");
        await btn.focus();
        await expect(btn).toHaveScreenshot(`btn-default-focus-${mode}.png`, SNAPSHOT_OPTS);
      });

      test("Dialog (Flet ruter) — overlay, close-ikon, footer", async ({ page }) => {
        await page.goto(`/__visual/planner?mode=${mode}&dialog=1`);
        const dlg = page.getByTestId("dialog-content");
        await dlg.waitFor();
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot(`dialog-open-${mode}.png`, SNAPSHOT_OPTS);

        // Hover close-ikonet for at fange dark-mode hover-kontrast.
        const close = dlg.locator('button[aria-label], button:has(svg)').last();
        await close.hover();
        await page.waitForTimeout(80);
        await expect(dlg).toHaveScreenshot(`dialog-close-hover-${mode}.png`, SNAPSHOT_OPTS);
      });

      test("AlertDialog (Slet rute) — destructive action", async ({ page }) => {
        await page.goto(`/__visual/planner?mode=${mode}&alert=1`);
        const alert = page.getByTestId("alert-content");
        await alert.waitFor();
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot(`alert-open-${mode}.png`, SNAPSHOT_OPTS);
      });

      test("Sheet (Tildel medarbejder) — side-overlay + ghost-knapper", async ({ page }) => {
        await page.goto(`/__visual/planner?mode=${mode}&sheet=1`);
        const sheet = page.getByTestId("sheet-content");
        await sheet.waitFor();
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot(`sheet-open-${mode}.png`, SNAPSHOT_OPTS);

        // Hover første medarbejder-knap — fanger ghost/outline hover-regler.
        const first = sheet.getByRole("button").first();
        await first.hover();
        await page.waitForTimeout(80);
        await expect(sheet).toHaveScreenshot(`sheet-button-hover-${mode}.png`, SNAPSHOT_OPTS);
      });
    });
  }
});
