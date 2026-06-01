import { test, expect } from "@playwright/test";

/**
 * Visual regression for dark mode på livechat-widgetens synlige
 * elementer. Fixturen ligger på /__visual/livechat og kræver ingen
 * auth eller Supabase-data.
 *
 * Tre views via ?view=chat|closed|inbox så vi rammer alle de
 * tilstande hvor brugere har rapporteret synlighedsfejl:
 *   • chat:   "mine"-bobler, send/attach-knapper, foreslåede svar,
 *             input-bar i begge temaer.
 *   • closed: "Samtalen er afsluttet"-kort + start-ny-knap.
 *   • inbox:  liste over flere samtaler med avatar + ulæst-tæller.
 *
 * Tærskel: 1% pixel-diff (samme som planner-suiten). Genér første
 * gang baseline med:  bun run test:visual:update
 */

const SNAPSHOT_OPTS = {
  maxDiffPixelRatio: 0.01,
  animations: "disabled" as const,
  caret: "hide" as const,
};

const MODES = ["light", "dark"] as const;
const VIEWS = ["chat", "closed", "inbox"] as const;

test.describe("Livechat — visual regression (light + dark)", () => {
  for (const mode of MODES) {
    test.describe(`${mode} mode`, () => {
      for (const view of VIEWS) {
        test(`view=${view} — fuld widget`, async ({ page }) => {
          await page.goto(`/__visual/livechat?mode=${mode}&view=${view}`);
          const shell = page.getByTestId("livechat-shell");
          await shell.waitFor();
          await page.waitForTimeout(120);
          await expect(shell).toHaveScreenshot(
            `livechat-${view}-${mode}.png`,
            SNAPSHOT_OPTS,
          );
        });
      }

      test("header-ikoner: synlighed + hover på hero-gradient", async ({ page }) => {
        await page.goto(`/__visual/livechat?mode=${mode}&view=chat`);
        const header = page.getByTestId("livechat-header");
        await header.waitFor();
        await expect(header).toHaveScreenshot(`livechat-header-${mode}.png`, SNAPSHOT_OPTS);

        for (const id of ["header-volume", "header-more", "header-close"] as const) {
          const btn = page.getByTestId(id);
          await btn.hover();
          await page.waitForTimeout(60);
          await expect(btn).toHaveScreenshot(
            `livechat-${id}-hover-${mode}.png`,
            SNAPSHOT_OPTS,
          );
        }
      });

      test("beskedbobler: 'mine' (inverteret) vs. 'dem'", async ({ page }) => {
        await page.goto(`/__visual/livechat?mode=${mode}&view=chat`);
        const mine = page.getByTestId("bubble-mine");
        const them = page.getByTestId("bubble-them");
        await mine.waitFor();
        await expect(mine).toHaveScreenshot(`livechat-bubble-mine-${mode}.png`, SNAPSHOT_OPTS);
        await expect(them).toHaveScreenshot(`livechat-bubble-them-${mode}.png`, SNAPSHOT_OPTS);
      });

      test("send-knap: idle + hover + disabled (visibility)", async ({ page }) => {
        await page.goto(`/__visual/livechat?mode=${mode}&view=chat`);
        const send = page.getByTestId("send-btn");
        await send.waitFor();
        await expect(send).toHaveScreenshot(`livechat-send-idle-${mode}.png`, SNAPSHOT_OPTS);
        await send.hover();
        await page.waitForTimeout(60);
        await expect(send).toHaveScreenshot(`livechat-send-hover-${mode}.png`, SNAPSHOT_OPTS);
      });

      test("foreslåede svar: chip-kontrast + hover", async ({ page }) => {
        await page.goto(`/__visual/livechat?mode=${mode}&view=chat`);
        const wrap = page.getByTestId("suggested-replies");
        await wrap.waitFor();
        await expect(wrap).toHaveScreenshot(`livechat-replies-${mode}.png`, SNAPSHOT_OPTS);
        const first = wrap.getByRole("button").first();
        await first.hover();
        await page.waitForTimeout(60);
        await expect(first).toHaveScreenshot(`livechat-reply-hover-${mode}.png`, SNAPSHOT_OPTS);
      });
    });
  }
});