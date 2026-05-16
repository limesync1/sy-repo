import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { expandRecurringRoutes, intervalToDays, projectedStopMatchesSources, filterStopsByOccurrenceDate } from "./recurring-projection";

// Lås "today" på filniveau, så past-clamp i expandRecurringRoutes ikke
// filtrerer testdatoer afhængigt af kørselstidspunktet. Alle testdata er
// kalibreret omkring maj 2026.
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-12-31T08:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

describe("intervalToDays", () => {
  it("maps known intervals", () => {
    expect(intervalToDays("ugentlig")).toBe(7);
    expect(intervalToDays("hver_14_dag")).toBe(14);
    expect(intervalToDays("hver_2_dag")).toBe(2);
    expect(intervalToDays("hver_3_uge")).toBe(21);
    expect(intervalToDays("hver_4_uge")).toBe(28);
    expect(intervalToDays("hver_8_uge")).toBe(56);
    expect(intervalToDays("månedlig")).toBe(30);
  });
  it("returns null for unknown/empty", () => {
    expect(intervalToDays(null)).toBeNull();
    expect(intervalToDays("custom")).toBeNull();
    expect(intervalToDays("foo")).toBeNull();
  });
});

describe("expandRecurringRoutes", () => {
  const range = { rangeStart: "2026-05-01", rangeEnd: "2026-05-31" };

  it("projects weekly recurring routes inside the visible range", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
      ],
    });
    expect(out.map((p) => p.date)).toEqual([
      "2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25",
    ]);
    expect(out.every((p) => p.baseRouteId === "r1")).toBe(true);
  });

  it("fast-forwards seeds far in the past so projections always show", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2024-01-01", preferred_route_id: "r1" },
      ],
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].date >= range.rangeStart).toBe(true);
  });

  it("skips dates that already have a real route", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(["r1|2026-05-11"]),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
      ],
    });
    expect(out.find((p) => p.date === "2026-05-11")).toBeUndefined();
    expect(out.find((p) => p.date === "2026-05-04")).toBeDefined();
  });

  it("ignores sources without preferred_route_id (handled by occurrence fallback) without throwing", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: null },
        { id: "a2", interval: "ugentlig", seed_date: "2026-05-05", preferred_route_id: "r2" },
      ],
    });
    // Sources without preferred_route_id are intentionally skipped here — the
    // RoutePlanner renders ghost cards from `agreement_occurrences` instead.
    expect(out.every((p) => p.baseRouteId === "r2")).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });

  it("supports custom intervals via interval_days", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "custom", interval_days: 10, seed_date: "2026-05-02", preferred_route_id: "r3" },
      ],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-02", "2026-05-12", "2026-05-22"]);
  });

  it("custom 30-day storage projects as monthly calendar cadence, not drifting days", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-01-01",
      rangeEnd: "2026-06-30",
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "custom", interval_days: 30, seed_date: "2026-01-31", preferred_route_id: "r3" },
      ],
    });
    expect(out.map((p) => p.date)).toEqual([
      "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31", "2026-06-30",
    ]);
  });

  it("supports flexible service intervals such as every 8 weeks", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-09-30",
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "hver_8_uge", seed_date: "2026-05-04", preferred_route_id: "r8" },
      ],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-04", "2026-06-29", "2026-08-24"]);
  });

  it("projects every 14 days from the agreement seed date", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "hver_14_dag", seed_date: "2026-05-10", preferred_route_id: "r14" },
      ],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-10", "2026-05-24"]);
  });

  it("uses route anchor date to project a 14-day route backwards inside the visible range", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-31",
      realRouteDates: new Set(["r14|2026-05-28"]),
      sources: [
        { id: "sub:s1", interval: "hver_14_dag", seed_date: "2026-05-28", anchor_date: "2026-05-28", preferred_route_id: "r14" },
      ],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-14"]);
  });

  it("deduplicates when multiple agreements share route + date", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
        { id: "a2", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
      ],
    });
    const may4 = out.filter((p) => p.date === "2026-05-04");
    expect(may4.length).toBe(1);
  });

  it("bevarer aktive kilder når flere aftaler deler samme projicerede rute/dato", () => {
    const [projected] = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:a1"] },
        { id: "a2", interval: "hver_14_dag", seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:a2"] },
      ],
    });
    expect(projected.sourceKeys.sort()).toEqual(["agr:a1", "agr:a2"]);
  });
});

describe("projectedStopMatchesSources", () => {
  it("viser kun stops hvor aftalens interval faktisk rammer datoen", () => {
    const weeklyStop = { agreement_id: "weekly" };
    const monthlyStop = { agreement_id: "monthly" };
    expect(projectedStopMatchesSources(weeklyStop, ["agr:weekly"])).toBe(true);
    expect(projectedStopMatchesSources(monthlyStop, ["agr:weekly"])).toBe(false);
  });

  it("matcher også legacy subscription/order nøgler", () => {
    expect(projectedStopMatchesSources({ subscription_id: "s1" }, ["sub:s1"])).toBe(true);
    expect(projectedStopMatchesSources({ order_id: "o1" }, ["order:o1"])).toBe(true);
    expect(projectedStopMatchesSources({ agreement_occurrences: { agreement_id: "a1", legacy_order_id: "o2" } }, ["agr:a1"])).toBe(true);
    expect(projectedStopMatchesSources({ agreement_occurrences: { agreement_id: "a1", legacy_order_id: "o2" } }, ["order:o2"])).toBe(true);
  });
});

describe("expandRecurringRoutes — robustness", () => {
  const range = { rangeStart: "2026-05-01", rangeEnd: "2026-05-31" };

  it("returns empty when sources list is empty", () => {
    expect(expandRecurringRoutes({ ...range, sources: [], realRouteDates: new Set() })).toEqual([]);
  });

  it("ignores sources without seed_date", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: null, preferred_route_id: "r1" }],
    });
    expect(out).toEqual([]);
  });

  it("ignores sources with unknown interval and no interval_days", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "engangskøb", seed_date: "2026-05-04", preferred_route_id: "r1" }],
    });
    expect(out).toEqual([]);
  });

  it("ignores sources with custom interval but missing/invalid interval_days", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "custom", interval_days: 0, seed_date: "2026-05-04", preferred_route_id: "r1" },
        { id: "a2", interval: "custom", interval_days: -3, seed_date: "2026-05-04", preferred_route_id: "r2" },
        { id: "a3", interval: "custom", interval_days: null, seed_date: "2026-05-04", preferred_route_id: "r3" },
      ],
    });
    expect(out).toEqual([]);
  });

  it("does not throw on malformed seed_date", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "not-a-date", preferred_route_id: "r1" }],
    });
    expect(out).toEqual([]);
  });

  it("handles ISO timestamp seed_date (slices to date)", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04T08:30:00.000Z", preferred_route_id: "r1" },
      ],
    });
    expect(out[0].date).toBe("2026-05-04");
  });

  it("daily interval projects every day in range", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-07",
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "daglig", seed_date: "2026-05-01", preferred_route_id: "r1" }],
    });
    expect(out.map((p) => p.date)).toEqual([
      "2026-05-01","2026-05-02","2026-05-03","2026-05-04","2026-05-05","2026-05-06","2026-05-07",
    ]);
  });

  it("daily interval over a year stays within safety bound", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-01-01",
      rangeEnd: "2026-12-31",
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "daglig", seed_date: "2026-01-01", preferred_route_id: "r1" }],
    });
    expect(out.length).toBe(365);
  });

  it("seed in the future inside range projects from seed forward", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-05-15", preferred_route_id: "r1" }],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-15", "2026-05-22", "2026-05-29"]);
  });

  it("seed beyond rangeEnd produces no projections", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-07-01", preferred_route_id: "r1" }],
    });
    expect(out).toEqual([]);
  });

  it("virtual ids follow the stable virtual:<routeId>:<date> shape", () => {
    const [p] = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" }],
    });
    expect(p.id).toBe("virtual:r1:2026-05-04");
    expect(p.baseRouteId).toBe("r1");
  });

  it("multiple routes are projected independently", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
        { id: "a2", interval: "hver_14_dag", seed_date: "2026-05-05", preferred_route_id: "r2" },
      ],
    });
    const r1 = out.filter((p) => p.baseRouteId === "r1").map((p) => p.date);
    const r2 = out.filter((p) => p.baseRouteId === "r2").map((p) => p.date);
    expect(r1).toEqual(["2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25"]);
    expect(r2).toEqual(["2026-05-05", "2026-05-19"]);
  });

  it("realRouteDates does not block other dates of same route", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(["r1|2026-05-04", "r1|2026-05-25"]),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" }],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-11", "2026-05-18"]);
  });
});

// Regressionstests for fletning af ruter (MergeRoutesDialog → "Fremtidige aftaler også"):
// Når flere aftaler med FORSKELLIGE intervaller re-pointes til samme målrute,
// SKAL projektionen tegne alle intervaller — ikke kun ét. Tidligere blev alle
// aftaler tvunget til samme seed_date (basisrutens dato), hvilket kollapsede
// flere serier til én. Disse tests låser den korrekte adfærd fast.
describe("expandRecurringRoutes — merge med blandede intervaller", () => {
  const range = { rangeStart: "2026-05-01", rangeEnd: "2026-06-30" };

  it("projicerer både ugentlig og månedlig aftale på samme målrute", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        // Begge aftaler er nu re-pointet til "target" efter merge.
        { id: "weekly", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "target" },
        { id: "monthly", interval: "månedlig", seed_date: "2026-05-06", preferred_route_id: "target" },
      ],
    });
    const dates = out.map((p) => p.date).sort();
    // Ugentlig serie skal være med
    expect(dates).toContain("2026-05-04");
    expect(dates).toContain("2026-05-11");
    expect(dates).toContain("2026-05-18");
    expect(dates).toContain("2026-05-25");
    // Månedlig serie (30 dages step) skal også være med
    expect(dates).toContain("2026-05-06");
    // Månedlig stepper med ÆGTE kalender-måned, ikke 30 dage.
    expect(dates).toContain("2026-06-06");
    // Alle på målruten
    expect(out.every((p) => p.baseRouteId === "target")).toBe(true);
  });

  it("projicerer tre forskellige intervaller (uge, 14-dag, 4-uge) på samme målrute", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "target" },
        { id: "a2", interval: "hver_14_dag", seed_date: "2026-05-05", preferred_route_id: "target" },
        { id: "a3", interval: "hver_4_uge",  seed_date: "2026-05-06", preferred_route_id: "target" },
      ],
    });
    const dates = new Set(out.map((p) => p.date));
    // Mindst én forekomst fra hver serie skal være til stede
    expect(dates.has("2026-05-04")).toBe(true); // ugentlig seed
    expect(dates.has("2026-05-05")).toBe(true); // 14-dag seed
    expect(dates.has("2026-05-19")).toBe(true); // 14-dag næste
    expect(dates.has("2026-05-06")).toBe(true); // 4-uge seed
    expect(dates.has("2026-06-03")).toBe(true); // 4-uge næste (28 dage)
  });

  it("custom interval_days bevares efter merge sammen med standardintervaller", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "weekly", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "target" },
        { id: "custom", interval: "custom", interval_days: 10, seed_date: "2026-05-02", preferred_route_id: "target" },
      ],
    });
    const dates = out.map((p) => p.date).sort();
    // Custom 10-dages serie
    expect(dates).toContain("2026-05-02");
    expect(dates).toContain("2026-05-12");
    expect(dates).toContain("2026-05-22");
    // Ugentlig serie
    expect(dates).toContain("2026-05-04");
    expect(dates).toContain("2026-05-11");
  });

  it("dedup: når to aftaler med forskellige intervaller falder på samme dag, kommer dagen kun én gang", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "target" },
        { id: "a2", interval: "hver_14_dag", seed_date: "2026-05-04", preferred_route_id: "target" },
      ],
    });
    const may4 = out.filter((p) => p.date === "2026-05-04");
    expect(may4.length).toBe(1);
    // Men ugentlige mellemforekomster skal stadig være der
    expect(out.find((p) => p.date === "2026-05-11")).toBeDefined();
  });

  it("hver aftale beholder sin egen seed_date — ingen kollaps til fælles dato", () => {
    // Dette er kerne-regressionen: hvis vi nogensinde igen tvinger alle
    // aftaler til samme seed_date (fx basisrutens route_date), vil denne
    // test fejle, fordi den anden series datoer ikke længere produceres.
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "mon", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "target" }, // mandag
        { id: "wed", interval: "ugentlig", seed_date: "2026-05-06", preferred_route_id: "target" }, // onsdag
      ],
    });
    const dates = out.map((p) => p.date);
    // Begge ugedags-serier skal være bevaret
    expect(dates).toContain("2026-05-04");
    expect(dates).toContain("2026-05-06");
    expect(dates).toContain("2026-05-11");
    expect(dates).toContain("2026-05-13");
  });
});

// Overlap- og suppressions-tests: efterligner præcis hvordan RoutePlanner
// bygger `realKeys` (både `routeId|date` og `base_route_id|date`), så vi
// fanger alle de scenarier hvor en projiceret rute IKKE må dukke op
// oven på en allerede materialiseret rute. Disse låser regression fast
// for det gentagne problem hvor brugere ser en projektion + en rigtig
// rute på samme dag, eller hvor klik på projektionen åbner et separat
// modal i stedet for basisruten.
describe("expandRecurringRoutes — overlap/suppression mod rigtige ruter", () => {
  const range = { rangeStart: "2026-05-01", rangeEnd: "2026-05-31" };

  // Hjælper: bygger realKeys på samme måde som RoutePlanner.tsx (linje 624-632).
  const buildRealKeys = (
    realRoutes: { id: string; route_date: string; base_route_id?: string | null }[],
    occurrenceExceptions: { base_route_id: string; occurrence_date: string }[] = [],
  ): Set<string> => {
    const s = new Set<string>();
    for (const r of realRoutes) {
      s.add(`${r.id}|${r.route_date}`);
      if (r.base_route_id) s.add(`${r.base_route_id}|${r.route_date}`);
    }
    for (const ex of occurrenceExceptions) {
      s.add(`${ex.base_route_id}|${ex.occurrence_date}`);
    }
    return s;
  };

  it("suppressing via base_route_id på materialiseret child-rute", () => {
    // Bruger har "låst op" en enkelt forekomst — den fik nyt route-id men
    // peger tilbage på basisruten via base_route_id. Projektionen for
    // basisruten på samme dag SKAL forsvinde, så vi ikke får dobbelt-pille.
    const realKeys = buildRealKeys([
      { id: "child-route-xyz", route_date: "2026-05-11", base_route_id: "base-1" },
    ]);
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: realKeys,
      sources: [
        { id: "agr", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "base-1" },
      ],
    });
    expect(out.find((p) => p.date === "2026-05-11")).toBeUndefined();
    // Andre forekomster i serien skal stadig være der
    expect(out.find((p) => p.date === "2026-05-04")).toBeDefined();
    expect(out.find((p) => p.date === "2026-05-18")).toBeDefined();
  });

  it("suppressing via route_occurrence_exceptions (skip-én-gang)", () => {
    const realKeys = buildRealKeys([], [
      { base_route_id: "base-1", occurrence_date: "2026-05-11" },
    ]);
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: realKeys,
      sources: [
        { id: "agr", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "base-1" },
      ],
    });
    expect(out.find((p) => p.date === "2026-05-11")).toBeUndefined();
    expect(out.length).toBe(3);
  });

  it("realRouteDates med FORKERT routeId blokerer ikke andre serier", () => {
    // Hvis en helt anden rute er materialiseret på datoen, må vores serie
    // ikke skjules. Tidligere bug: et globalt sæt af datoer (uden routeId)
    // ville fejlagtigt blokere alle serier samme dag.
    const realKeys = buildRealKeys([
      { id: "other-route", route_date: "2026-05-11" },
    ]);
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: realKeys,
      sources: [
        { id: "agr", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "base-1" },
      ],
    });
    expect(out.find((p) => p.date === "2026-05-11")).toBeDefined();
  });

  it("flere materialiseringer af samme base/dag blokerer kun den ene dag", () => {
    // Defensivt: hvis DB ved et uheld har duplikerede materialiseringer for
    // samme base+dag, skal projektionen stadig kun springe netop den dag over.
    const realKeys = buildRealKeys([
      { id: "child-a", route_date: "2026-05-11", base_route_id: "base-1" },
      { id: "child-b", route_date: "2026-05-11", base_route_id: "base-1" },
    ]);
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: realKeys,
      sources: [
        { id: "agr", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "base-1" },
      ],
    });
    expect(out.find((p) => p.date === "2026-05-11")).toBeUndefined();
    expect(out.length).toBe(3);
  });

  it("idempotens: to identiske kald giver præcis samme resultat (ids + datoer)", () => {
    const args = {
      ...range,
      realRouteDates: new Set<string>(),
      sources: [
        { id: "a1", interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "r1" },
        { id: "a2", interval: "hver_14_dag", seed_date: "2026-05-05", preferred_route_id: "r2" },
        { id: "a3", interval: "custom", interval_days: 10, seed_date: "2026-05-02", preferred_route_id: "r3" },
      ],
    };
    const a = expandRecurringRoutes(args);
    const b = expandRecurringRoutes(args);
    expect(a).toEqual(b);
  });

  it("alle virtuelle ids er unikke inden for samme kald (ingen dubletter)", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-08-31",
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "r1" },
        { id: "a2", interval: "hver_14_dag", seed_date: "2026-05-05", preferred_route_id: "r1" },
        { id: "a3", interval: "månedlig",    seed_date: "2026-05-04", preferred_route_id: "r1" },
        { id: "a4", interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "r2" },
      ],
    });
    const ids = out.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Og hver id skal kunne dekodes tilbage til (baseRouteId, date).
    for (const p of out) {
      expect(p.id).toBe(`virtual:${p.baseRouteId}:${p.date}`);
    }
  });

  it("ingen duplikerede (baseRouteId, date) på tværs af alle serier", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-12-31",
      realRouteDates: new Set(),
      sources: [
        // Alle peger på samme målrute — efter merge.
        { id: "a1", interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "target" },
        { id: "a2", interval: "hver_14_dag", seed_date: "2026-05-04", preferred_route_id: "target" },
        { id: "a3", interval: "hver_4_uge",  seed_date: "2026-05-04", preferred_route_id: "target" },
        { id: "a4", interval: "ugentlig",    seed_date: "2026-05-11", preferred_route_id: "target" },
      ],
    });
    const keys = out.map((p) => `${p.baseRouteId}|${p.date}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("rangeEnd før rangeStart → tomt resultat (ingen crash)", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-31",
      rangeEnd: "2026-05-01",
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" }],
    });
    expect(out).toEqual([]);
  });

  it("rangeStart === rangeEnd og seed rammer dagen → præcis 1 forekomst", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-04",
      rangeEnd: "2026-05-04",
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" }],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-04"]);
  });

  it("projicerer hele det synlige range, også tidligere datoer i måneden", () => {
    // Systemtid er låst til 2025-12-31 (se beforeAll øverst i filen).
    // Selv hvis kalenderens rangeStart starter midt i december (fx fordi
    // måneds-griddet inkluderer forrige måneds dage), må vi aldrig projicere
    // forekomster i fortiden — de er allerede passeret.
    const out = expandRecurringRoutes({
      rangeStart: "2025-12-01",
      rangeEnd: "2026-01-15",
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2025-12-01", preferred_route_id: "r1" }],
    });
    expect(out.map((p) => p.date)).toEqual([
      "2025-12-01", "2025-12-08", "2025-12-15", "2025-12-22", "2025-12-29", "2026-01-05", "2026-01-12",
    ]);
  });

  it("multi-year horisont med ugentlig serie projicerer alle uger uden tab", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-01-01",
      rangeEnd: "2027-12-31",
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-01-01", preferred_route_id: "r1" }],
    });
    // 2026-01-01 til 2027-12-31 = 730 dage = 105 hele uger (104 step + seed) = 105.
    expect(out.length).toBeGreaterThanOrEqual(104);
    expect(out.length).toBeLessThanOrEqual(106);
    // Først og sidst skal være på korrekt cyklus (dage delelig med 7 fra seed).
    const first = out[0].date;
    const last = out[out.length - 1].date;
    expect(first).toBe("2026-01-01");
    expect(last <= "2027-12-31").toBe(true);
  });

  it("daglig serie i 4 år når safety-loftet (4000) men crasher ikke", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-01-01",
      rangeEnd: "2030-12-31", // ~1825 dage — under safety-loftet
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "daglig", seed_date: "2026-01-01", preferred_route_id: "r1" }],
    });
    expect(out.length).toBeGreaterThan(1800);
    expect(out.length).toBeLessThanOrEqual(4000);
  });

  it("samme aftale-id duplikeret i sources → datoer dedupes pr. (route,dato)", () => {
    // Defensivt: hvis to identiske kilder smutter med (fx race i React-state),
    // skal projektionen stadig kun give én forekomst pr. dag.
    const dup = { id: "a1", interval: "ugentlig" as const, seed_date: "2026-05-04", preferred_route_id: "r1" };
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [dup, dup],
    });
    const dates = out.map((p) => p.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("efter merge: ALLE intervaller projiceres OG ingen dato kommer to gange", () => {
    // Kombineret regression: 3 aftaler med forskellige intervaller på samme
    // målrute. Vi tjekker både at alle serier er repræsenteret OG at der
    // ikke er dubletter — det er præcis det scenarie hvor brugeren tidligere
    // har set "ekstra" projektioner eller manglende serier.
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "u",  interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "t" },
        { id: "f",  interval: "hver_14_dag", seed_date: "2026-05-04", preferred_route_id: "t" },
        { id: "m",  interval: "månedlig",    seed_date: "2026-05-04", preferred_route_id: "t" },
      ],
    });
    const keys = out.map((p) => `${p.baseRouteId}|${p.date}`);
    expect(new Set(keys).size).toBe(keys.length);
    // Alle 4 ugentlige forekomster i maj
    expect(out.filter((p) => p.date === "2026-05-04").length).toBe(1);
    expect(out.filter((p) => p.date === "2026-05-11").length).toBe(1);
    expect(out.filter((p) => p.date === "2026-05-18").length).toBe(1);
    expect(out.filter((p) => p.date === "2026-05-25").length).toBe(1);
  });
});

// Tests fokuseret på selve scenariet brugeren rapporterer: ÉN projiceret
// rute (samme baseRouteId + samme dato) hvor flere aftaler med FORSKELLIGE
// intervaller alle "rammer" netop den dag. Vi skal:
//   1) kun udsende én projiceret rute pr. (baseRouteId, dato),
//   2) bevare alle aktive sourceKeys så stops-filteret efterfølgende kan
//      vise præcis de aftaler der reelt er aktuelle den dag,
//   3) IKKE lække stops fra aftaler der ikke rammer datoen.
describe("expandRecurringRoutes — samme projicerede rute, forskellige aktive intervaller", () => {
  const range = { rangeStart: "2026-05-01", rangeEnd: "2026-06-30" };

  it("samler kun aftaler hvis interval RAMMER den projicerede dato i sourceKeys", () => {
    // Kun ugentlig (a1) og månedlig (a3) lander præcist på 2026-05-04.
    // 14-dages-aftalen (a2) starter 2026-05-05 og rammer ikke 5/4.
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:a1"] },
        { id: "a2", interval: "hver_14_dag", seed_date: "2026-05-05", preferred_route_id: "r1", sourceKeys: ["agr:a2"] },
        { id: "a3", interval: "månedlig",    seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:a3"] },
      ],
    });
    const may4 = out.find((p) => p.date === "2026-05-04");
    expect(may4).toBeDefined();
    // Kun a1 og a3 må være aktive den 4. — IKKE a2.
    expect(may4!.sourceKeys.sort()).toEqual(["agr:a1", "agr:a3"]);
    // Den 5. skal til gengæld vise a2 (alene).
    const may5 = out.find((p) => p.date === "2026-05-05");
    expect(may5).toBeDefined();
    expect(may5!.sourceKeys).toEqual(["agr:a2"]);
  });

  it("ugentlig + 14-dags falder sammen hver 14. dag → fælles sourceKeys, ene-uger har kun ugentlig", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "u",  interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:u"] },
        { id: "f",  interval: "hver_14_dag", seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:f"] },
      ],
    });
    const byDate = new Map(out.map((p) => [p.date, p]));
    // Sammenfald (uge 18 og 20)
    expect(byDate.get("2026-05-04")!.sourceKeys.sort()).toEqual(["agr:f", "agr:u"]);
    expect(byDate.get("2026-05-18")!.sourceKeys.sort()).toEqual(["agr:f", "agr:u"]);
    // Mellem-uger har kun ugentlig
    expect(byDate.get("2026-05-11")!.sourceKeys).toEqual(["agr:u"]);
    expect(byDate.get("2026-05-25")!.sourceKeys).toEqual(["agr:u"]);
  });

  it("projectedStopMatchesSources viser kun de stops hvis aftale rammer datoen", () => {
    // Simulér basisrutens stops: ét pr. aftale.
    const baseStops = [
      { id: "s-weekly",  agreement_id: "weekly" },
      { id: "s-14",      agreement_id: "14d" },
      { id: "s-monthly", agreement_id: "monthly" },
      { id: "s-oneoff",  order_id: "o1" }, // engangs, ingen agreement
    ];
    // Projiceret rute hvor kun ugentlig og månedlig er aktive netop i dag.
    const sourceKeys = ["agr:weekly", "agr:monthly"];
    const visible = baseStops.filter((s) => projectedStopMatchesSources(s, sourceKeys));
    expect(visible.map((s) => s.id).sort()).toEqual(["s-monthly", "s-weekly"]);
    // Engangs-stop skal IKKE komme med på en projiceret dato — det hører
    // ikke hjemme i nogen gentagende serie.
    expect(visible.find((s) => s.id === "s-oneoff")).toBeUndefined();
  });

  it("dedup-merge må ikke 'lække' sourceKeys fra en serie der IKKE rammer datoen", () => {
    // Regression: tidligere kunne en aftale der bare delte target-rute få
    // sin sourceKey vedhæftet en projektion på en dag den ikke rammer.
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig",    seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:a1"] },
        { id: "a2", interval: "hver_4_uge",  seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:a2"] },
      ],
    });
    const may4  = out.find((p) => p.date === "2026-05-04")!;
    const may11 = out.find((p) => p.date === "2026-05-11")!;
    const may18 = out.find((p) => p.date === "2026-05-18")!;
    const may25 = out.find((p) => p.date === "2026-05-25")!;
    const jun01 = out.find((p) => p.date === "2026-06-01")!;
    // 4/5 og 1/6 falder begge serier sammen (4-uges cyklus matcher ugentlig).
    expect(may4.sourceKeys.sort()).toEqual(["agr:a1", "agr:a2"]);
    expect(jun01.sourceKeys.sort()).toEqual(["agr:a1", "agr:a2"]);
    // De øvrige uger er KUN den ugentlige — 4-uges-aftalen må ikke "lække"
    // ind på naboforekomster.
    expect(may11.sourceKeys).toEqual(["agr:a1"]);
    expect(may18.sourceKeys).toEqual(["agr:a1"]);
    expect(may25.sourceKeys).toEqual(["agr:a1"]);
  });

  it("når flere aftaler smelter sammen på én dag bliver sourceKeys unikke (intet duplikeret id)", () => {
    // Tre aftaler — to af dem har FAKTISK samme sourceKey (samme legacy
    // order rendering twice). Resultatet skal stadig være unikt.
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:shared"] },
        { id: "a2", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:shared"] },
        { id: "a3", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:other"] },
      ],
    });
    const may4 = out.find((p) => p.date === "2026-05-04")!;
    expect(may4.sourceKeys.sort()).toEqual(["agr:other", "agr:shared"]);
    expect(new Set(may4.sourceKeys).size).toBe(may4.sourceKeys.length);
  });

  it("custom interval bevarer sin egen sourceKey og blander sig ikke ind på naboforekomster", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-31",
      realRouteDates: new Set(),
      sources: [
        { id: "u",  interval: "ugentlig",                 seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:u"] },
        { id: "c",  interval: "custom", interval_days: 10, seed_date: "2026-05-02", preferred_route_id: "r1", sourceKeys: ["agr:c"] },
      ],
    });
    const byDate = new Map(out.map((p) => [p.date, p]));
    // Ugentlig serie — kun u
    expect(byDate.get("2026-05-04")!.sourceKeys).toEqual(["agr:u"]);
    expect(byDate.get("2026-05-11")!.sourceKeys).toEqual(["agr:u"]);
    // Custom 10-dages serie — kun c (aldrig "lækker" u ind)
    expect(byDate.get("2026-05-02")!.sourceKeys).toEqual(["agr:c"]);
    expect(byDate.get("2026-05-12")!.sourceKeys).toEqual(["agr:c"]);
    expect(byDate.get("2026-05-22")!.sourceKeys).toEqual(["agr:c"]);
  });

  it("subscription + agreement (legacy + ny) på samme dag → begge sourceKeys bevares", () => {
    // Marketplace har historisk haft både `subscriptions` og nye `agreements`
    // for samme aftale. Når begge kilder rammer samme dag på samme rute,
    // skal projektionen huske begge nøgler så stops fra både legacy- og
    // ny-ordningen kan vises (eller filtreres bort konsistent).
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-31",
      realRouteDates: new Set(),
      sources: [
        { id: "agreement", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["agr:abc"] },
        { id: "legacy",    interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1", sourceKeys: ["sub:xyz", "order:legacy"] },
      ],
    });
    const may4 = out.find((p) => p.date === "2026-05-04")!;
    expect(may4.sourceKeys.sort()).toEqual(["agr:abc", "order:legacy", "sub:xyz"]);
    // Stops-filter skal nu kunne acceptere alle tre identifikator-typer.
    expect(projectedStopMatchesSources({ agreement_id: "abc" }, may4.sourceKeys)).toBe(true);
    expect(projectedStopMatchesSources({ subscription_id: "xyz" }, may4.sourceKeys)).toBe(true);
    expect(projectedStopMatchesSources({ order_id: "legacy" }, may4.sourceKeys)).toBe(true);
    // Men en helt anden aftale skal afvises.
    expect(projectedStopMatchesSources({ agreement_id: "other" }, may4.sourceKeys)).toBe(false);
  });
});

// Tests for filterStopsByOccurrenceDate — den hjælper både medarbejder-app og
// rute-data-hooket bruger til at sikre at en dag KUN viser stops der reelt
// hører til datoen (når aftalens occurrence er kendt).
describe("filterStopsByOccurrenceDate", () => {
  it("beholder stops uden occurrence (one-off / legacy)", () => {
    const stops = [{ id: "a" }, { id: "b", order_id: "o1" }];
    expect(filterStopsByOccurrenceDate(stops, "2026-05-11")).toEqual(stops);
  });

  it("beholder stops hvor occurrence_date matcher dagen", () => {
    const stops = [
      { id: "a", agreement_occurrence: { occurrence_date: "2026-05-11" } },
      { id: "b", agreement_occurrence: { occurrence_date: "2026-05-11T08:00:00Z" } },
    ];
    expect(filterStopsByOccurrenceDate(stops, "2026-05-11").map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("dropper stops hvor occurrence_date peger på en anden dag", () => {
    const stops = [
      { id: "today", agreement_occurrence: { occurrence_date: "2026-05-11" } },
      { id: "yesterday", agreement_occurrence: { occurrence_date: "2026-05-10" } },
      { id: "next-week", agreement_occurrence: { occurrence_date: "2026-05-18" } },
    ];
    expect(filterStopsByOccurrenceDate(stops, "2026-05-11").map((s) => s.id)).toEqual(["today"]);
  });

  it("understøtter både agreement_occurrence (singular) og agreement_occurrences (plural)", () => {
    const stops = [
      { id: "a", agreement_occurrences: { occurrence_date: "2026-05-11" } },
      { id: "b", agreement_occurrence: { occurrence_date: "2026-05-12" } },
    ];
    expect(filterStopsByOccurrenceDate(stops, "2026-05-11").map((s) => s.id)).toEqual(["a"]);
  });

  it("blandet input: nogle med occurrence, andre uden — kun mismatch fjernes", () => {
    const stops = [
      { id: "no-occ" },
      { id: "match", agreement_occurrence: { occurrence_date: "2026-05-11" } },
      { id: "mismatch", agreement_occurrence: { occurrence_date: "2026-05-04" } },
      { id: "legacy-order", order_id: "o9" },
    ];
    expect(filterStopsByOccurrenceDate(stops, "2026-05-11").map((s) => s.id))
      .toEqual(["no-occ", "match", "legacy-order"]);
  });

  it("tomt input → tomt output, og crasher ikke på null/undefined", () => {
    expect(filterStopsByOccurrenceDate([], "2026-05-11")).toEqual([]);
    // Defensivt: hvis caller sender null, må vi ikke smide.
    expect(filterStopsByOccurrenceDate(null as any, "2026-05-11")).toEqual([]);
  });

  it("normaliserer dayDate (slice 10) så ISO-tid også virker", () => {
    const stops = [
      { id: "a", agreement_occurrence: { occurrence_date: "2026-05-11" } },
      { id: "b", agreement_occurrence: { occurrence_date: "2026-05-12" } },
    ];
    expect(filterStopsByOccurrenceDate(stops, "2026-05-11T23:59:00Z").map((s) => s.id)).toEqual(["a"]);
  });
});