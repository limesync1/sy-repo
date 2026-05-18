import { test, expect } from "@playwright/test";

/**
 * Verificerer at DragOverlay-mønsteret (position:fixed portal'et til <body>)
 * følger pointeren korrekt selv når en forfader bruger `transform`.
 *
 * Fixturen renderer to identiske overlays:
 *  - #overlay-bug    → child af .transformed-parent (forventet at afvige
 *                      hvis forælderen er offset — bug-reproduktion)
 *  - #overlay-portal → direkte child af <body> (fix-mønstret — skal
 *                      altid følge cursoren præcist)
 *
 * På /virksomhed/ruter er #overlay-portal mønstret det vi bruger via
 * createPortal(<DragOverlay/>, document.body). Test'en kører på desktop-,
 * tablet- og mobil-emulering (se playwright.config.ts projects).
 */

const FIXTURE = "/e2e/drag-overlay.html";
const TOLERANCE_PX = 2; // sub-pixel rounding på touch-devices

test.describe("DragOverlay følger pointeren på tværs af enheder", () => {
  test("portalet overlay tracker cursoren præcist", async ({ page }) => {
    await page.goto(FIXTURE);
    const handle = page.getByTestId("handle");
    const portal = page.getByTestId("overlay-portal");

    const box = await handle.boundingBox();
    if (!box) throw new Error("handle ikke fundet");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Bevæg cursoren gennem en serie af punkter og bekræft at det
    // portalerede overlay altid centreres under pointeren (translate -40px).
    const points = [
      [startX + 100, startY + 50],
      [startX + 250, startY + 180],
      [startX + 50,  startY + 300],
    ];

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    for (const [x, y] of points) {
      await page.mouse.move(x, y, { steps: 8 });
      // Læs transform — overlay centreres med 40px offset (half = 80/2).
      const rect = await portal.evaluate((el) => el.getBoundingClientRect());
      expect(Math.abs(rect.x + rect.width / 2 - x)).toBeLessThanOrEqual(TOLERANCE_PX);
      expect(Math.abs(rect.y + rect.height / 2 - y)).toBeLessThanOrEqual(TOLERANCE_PX);
    }

    await page.mouse.up();
  });

  test("portalet overlay er direkte barn af <body> (ikke af transformed forfader)", async ({ page }) => {
    await page.goto(FIXTURE);
    const parentTag = await page.locator('[data-testid="overlay-portal"]').evaluate(
      (el) => el.parentElement?.tagName.toLowerCase() ?? "",
    );
    expect(parentTag).toBe("body");
  });

  test("touch-emulering: tap+drag tracker fingeren", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "Firefox understøtter ikke page.touchscreen i denne version");
    await page.goto(FIXTURE);
    const handle = page.getByTestId("handle");
    const portal = page.getByTestId("overlay-portal");
    const box = await handle.boundingBox();
    if (!box) throw new Error("handle ikke fundet");

    // Brug page.touchscreen.tap for at starte, derefter dispatch touchmove
    // for at simulere finger-drag (Playwrights touchscreen API har ikke move).
    const x0 = box.x + box.width / 2;
    const y0 = box.y + box.height / 2;

    await page.evaluate(([x, y]) => {
      const target = document.getElementById("handle")!;
      const ev = new PointerEvent("pointerdown", {
        pointerType: "touch", clientX: x, clientY: y, bubbles: true, isPrimary: true, pointerId: 1,
      });
      target.dispatchEvent(ev);
    }, [x0, y0]);

    const points = [[x0 + 120, y0 + 60], [x0 + 220, y0 + 220]];
    for (const [x, y] of points) {
      await page.evaluate(([x, y]) => {
        const ev = new PointerEvent("pointermove", {
          pointerType: "touch", clientX: x, clientY: y, bubbles: true, isPrimary: true, pointerId: 1,
        });
        window.dispatchEvent(ev);
      }, [x, y]);
      const rect = await portal.evaluate((el) => el.getBoundingClientRect());
      expect(Math.abs(rect.x + rect.width / 2 - x)).toBeLessThanOrEqual(TOLERANCE_PX);
      expect(Math.abs(rect.y + rect.height / 2 - y)).toBeLessThanOrEqual(TOLERANCE_PX);
    }

    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent("pointerup", {
        pointerType: "touch", bubbles: true, isPrimary: true, pointerId: 1,
      }));
    });
  });
});