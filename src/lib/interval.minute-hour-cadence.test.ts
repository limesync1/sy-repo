// Regressionstest: minut- og time-cadence skal parse'es korrekt og
// behandles som "1 forekomst pr. dag" i kalender-projektionen, så
// completion af én forekomst ikke genererer 6 ordrer samme dag.
// Dækker også at UI-formateringen viser den korrekte tekst (ikke
// "Dagligt" for en hver-time-cadence).
import { describe, it, expect } from "vitest";
import { parseInterval, formatInterval, intervalToDays } from "./interval";

describe("minute & hour cadence", () => {
  const minute = ["10_min", "5 min", "every_15_minute", "every:30:minutes"];
  const hour = ["every_1_hour", "1 time", "2 timer", "every_3_hours", "every:6:hour"];

  it("parses minute-cadence values as daily cap (n=1, unit=day)", () => {
    for (const v of minute) {
      const p = parseInterval(v);
      expect(p, `${v} should parse`).not.toBeNull();
      expect(p!.once).toBe(false);
      expect(p!.unit).toBe("day");
      expect(p!.n).toBe(1);
    }
  });

  it("parses hour-cadence values as daily cap (n=1, unit=day)", () => {
    for (const v of hour) {
      const p = parseInterval(v);
      expect(p, `${v} should parse`).not.toBeNull();
      expect(p!.once).toBe(false);
      expect(p!.unit).toBe("day");
      expect(p!.n).toBe(1);
    }
  });

  it("intervalToDays returns 1 day for any minute or hour cadence", () => {
    expect(intervalToDays("10_min")).toBe(1);
    expect(intervalToDays("every_1_hour")).toBe(1);
    expect(intervalToDays("2 timer")).toBe(1);
  });

  it("formatInterval shows minute/hour text, not 'Dagligt'", () => {
    expect(formatInterval("10_min")).toBe("Hvert 10. minut");
    expect(formatInterval("1_min")).toBe("Hvert minut");
    expect(formatInterval("every_1_hour")).toMatch(/time/i);
    expect(formatInterval("2 timer")).toBe("Hver 2. time");
    // Sanity: rigtig daglig forbliver "Dagligt"
    expect(formatInterval("daglig")).toBe("Dagligt");
  });
});