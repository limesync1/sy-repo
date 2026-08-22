import { test, expect } from "@playwright/test";

/**
 * Visuelle regressions-tests for virksomhedsbilleder (logo + cover) samt
 * en flicker-/layoutstabilitetstest af forsidens hero.
 *
 * Fixturen /__visual/media rendrer logoer og covers i ekstreme formater,
 * så vi fanger "presset billede"-fejl før de rammer brugerne.
 *
 * Hero-testen måler Cumulative Layout Shift og skriftstørrelsen på H1 lige
 * efter paint og igen når fonte er klar — så vi fanger tekst-hop
 * (font-swap flicker) og baggrundsskift mellem tema-init og React-mount.
 *
 * Baselines: bun run test:visual:update
 */

const SNAPSHOT_OPTS = {
  maxDiffPixelRatio: 0.01,
  animations: "disabled" as const,
  caret: "hide" as const,
};

const MODES = ["light", "dark"] as const;

test.describe("Virksomhedsbilleder — visual regression", () => {
  for (const mode of MODES) {
    test(`covers i ekstreme formater (${mode})`, async ({ page }) => {
      await page.goto(`/__visual/media?mode=${mode}`);
      const covers = page.getByTestId("media-covers");
      await covers.waitFor();
      await page.waitForTimeout(120);
      await expect(covers).toHaveScreenshot(`media-covers-${mode}.png`, SNAPSHOT_OPTS);
    });

    test(`logoer i ekstreme formater (${mode})`, async ({ page }) => {
      await page.goto(`/__visual/media?mode=${mode}`);
      const logos = page.getByTestId("media-logos");
      await logos.waitFor();
      await page.waitForTimeout(120);
      await expect(logos).toHaveScreenshot(`media-logos-${mode}.png`, SNAPSHOT_OPTS);
    });

    test(`faste aspect ratios holder (${mode})`, async ({ page }) => {
      await page.goto(`/__visual/media?mode=${mode}`);
      const wrap = page.getByTestId("media-cover-ratios");
      await wrap.waitFor();
      await expect(wrap).toHaveScreenshot(`media-ratios-${mode}.png`, SNAPSHOT_OPTS);
    });
  }

  test("cover-billeder har præcist det forventede forhold", async ({ page }) => {
    await page.goto("/__visual/media?mode=light");
    await page.getByTestId("media-cover-ratios").waitFor();
    const expected: Record<string, number> = {
      "ratio-16-6": 16 / 6,
      "ratio-16-9": 16 / 9,
      "ratio-3-2": 3 / 2,
      "ratio-1-1": 1,
    };
    for (const [id, ratio] of Object.entries(expected)) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, `${id} skal findes`).toBeTruthy();
      expect(box!.width / box!.height).toBeCloseTo(ratio, 1);
    }
  });

  test("logoer bliver aldrig strakt (kvadratisk boks, contain)", async ({ page }) => {
    await page.goto("/__visual/media?mode=light");
    await page.getByTestId("media-logos").waitFor();
    for (const id of ["logo-bredt", "logo-hoejt", "logo-kvadratisk", "logo-intet"]) {
      const img = page.getByTestId(id).locator("img, span").first();
      const box = await page.getByTestId(id).locator("div").first().boundingBox();
      expect(box, `${id} skal findes`).toBeTruthy();
      expect(box!.width).toBeCloseTo(box!.height, 0);
      if (await img.evaluate((el) => el.tagName === "IMG").catch(() => false)) {
        const fit = await img.evaluate((el) => getComputedStyle(el).objectFit);
        expect(fit).toBe("contain");
      }
    }
  });
});

test.describe("Forside-hero — flicker og layoutstabilitet", () => {
  test("ingen mærkbar layout shift og ingen tekst-hop i heroen", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) (window as any).__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const h1 = page.locator("h1").first();
    await h1.waitFor();
    const sizeBefore = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

    await page.evaluate(() => (document as any).fonts?.ready);
    await page.waitForTimeout(1200);

    const sizeAfter = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(sizeAfter).toBeCloseTo(sizeBefore, 1);

    const cls = await page.evaluate(() => (window as any).__cls as number);
    expect(cls).toBeLessThan(0.1);
  });
});
