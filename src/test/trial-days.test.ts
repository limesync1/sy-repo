import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { TRIAL_DAYS } from "@/lib/trial";

describe("Prøveperiode", () => {
  it("er 30 dage", () => {
    expect(TRIAL_DAYS).toBe(30);
  });
  it("nævnes aldrig som 14 dage i tekster om prøveperioden", () => {
    const pattern = "14 dages (gratis )?prøve|gratis i 14 dage|14 dage gratis|[Ff]ørste 14 dage er gratis|trial_days: 14";
    let out = "";
    try {
      out = execSync(`rg -n -e "${pattern}" src public/llms.txt index.html supabase/functions --glob '!**/trial-days.test.ts'`, { encoding: "utf8" });
    } catch { out = ""; }
    expect(out).toBe("");
  });
});
