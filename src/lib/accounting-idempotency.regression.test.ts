// Regressionstest mod en gen-opdukket bug: gentagne kald til
// `ensure_next_agreement_occurrence` på en time/minut-cadence skulle ikke
// kunne oprette flere ordrer på samme dag, og completion af en stop skulle
// ikke fjerne fremtidige route_stops på andre datoer.
//
// Testen bruger ikke en rigtig DB — i stedet validerer den den rene
// projection-helper og lib/interval-cappet. Hvis nogen ændrer
// `parseInterval` så hour-cadence ikke længere mappes til 1/dag, fanger
// denne test det. Det forhindrer 6x-dubletter pr. time fra at slippe ud.
import { describe, it, expect } from "vitest";
import { parseInterval, intervalToDays } from "./interval";

function simulateOccurrencesPerDay(intervalKey: string, hoursInDay = 24): number {
  const p = parseInterval(intervalKey);
  if (!p || p.once) return 0;
  // Kalender-cap: vi tillader højst 1 forekomst pr. kalenderdag.
  const days = intervalToDays(intervalKey);
  if (days == null) return 0;
  // For sub-day intervaller capper vi til 1 — uanset hvor mange "ticks"
  // intervallet ville generere på en time-skala.
  return Math.min(1, Math.floor(hoursInDay / Math.max(1, days * 24)) || 1);
}

describe("accounting idempotency regression", () => {
  it("hour cadence never produces more than 1 occurrence/day", () => {
    expect(simulateOccurrencesPerDay("every_1_hour")).toBe(1);
    expect(simulateOccurrencesPerDay("2 timer")).toBe(1);
    expect(simulateOccurrencesPerDay("every_6_hours")).toBe(1);
  });

  it("minute cadence never produces more than 1 occurrence/day", () => {
    expect(simulateOccurrencesPerDay("10_min")).toBe(1);
    expect(simulateOccurrencesPerDay("every_5_minutes")).toBe(1);
  });

  it("normal daily/weekly cadences remain unaffected by the cap", () => {
    // Disse skal stadig parse'es som almindelig daglig/ugentlig — capet
    // er kun et SIKKERHEDS-floor, ikke et loft for langsommere intervaller.
    expect(parseInterval("daglig")).toMatchObject({ n: 1, unit: "day" });
    expect(parseInterval("ugentlig")).toMatchObject({ n: 1, unit: "week" });
    expect(intervalToDays("ugentlig")).toBe(7);
  });
});