// Fanger en PDF-brugerguide, der er kommet bagud i forhold til funktionskataloget.
// Kør `bun run guide:pdf` (eller bare start dev/build) for at regenerere.
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { plannerOnlyFeatures, PLANNER_FEATURE_CATEGORIES } from "./routePlannerFeatures";

const HASH_FILE = "public/guides/planner-guide.hash";

describe("PDF-brugerguiden", () => {
  it("matcher funktionskataloget", () => {
    if (!existsSync(HASH_FILE)) return; // PDF genereres i miljøer med python3
    const json = JSON.stringify(
      { categories: PLANNER_FEATURE_CATEGORIES, features: plannerOnlyFeatures() },
      null,
      2,
    ) + "\n";
    const hash = createHash("sha256").update(json).digest("hex");
    expect(readFileSync(HASH_FILE, "utf8").trim()).toBe(hash);
  });
});
