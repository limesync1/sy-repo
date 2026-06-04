import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { addDays, format, parseISO } from "date-fns";
import { ProjectionEngine } from "./projection-engine";
import type { ProjectionSource, AgreementOccurrenceOverride, AgreementPauseRange } from "@/lib/route-projection";

/**
 * Bølge 4 / 4.1 — Property-based tests for ProjectionEngine.
 * -----------------------------------------------------------------------------
 * Vi genererer tilfældige aftaler + override-/pause-/helligdags-sæt og
 * verificerer invarianter der MÅ holde uanset input. Det fanger edge cases
 * vores eksempel-tests overser (fx en pause der starter præcis på seed-date).
 *
 * Invarianter:
 *  - Idempotens: build() to gange i træk giver samme resultat.
 *  - Ingen dubletter pr. (sourceKey, dato).
 *  - Alle datoer ligger inden for det udvidede effective range.
 *  - Cancelled override + pause + helligdag fjerner ALTID en projektion.
 *  - Tom kilde-liste → tom projektion.
 */

const INTERVALS = ["ugentlig", "hver_anden_uge", "månedlig"] as const;

const dateArb = fc.integer({ min: 0, max: 60 }).map((d) =>
  format(addDays(parseISO("2026-06-01"), d), "yyyy-MM-dd"),
);

const sourceArb: fc.Arbitrary<ProjectionSource> = fc.record({
  id: fc.uuid(),
  interval: fc.constantFrom(...INTERVALS),
  seed_date: dateArb,
  anchor_date: dateArb,
  preferred_route_id: fc.uuid(),
  agreement_id: fc.uuid(),
}).map((s) => ({ ...s, sourceKeys: [`agr:${s.agreement_id}`] }));

describe("ProjectionEngine — property-based invariants", () => {
  it("er idempotent: build() to gange giver samme datoer", () => {
    fc.assert(fc.property(fc.array(sourceArb, { minLength: 1, maxLength: 4 }), (sources) => {
      const eng = ProjectionEngine.from(sources)
        .inRange("2026-06-01", "2026-08-31")
        .withRealRoutes(new Set<string>());
      const a = eng.build().projections.map((p) => `${p.id}|${p.date}`).sort();
      const b = eng.build().projections.map((p) => `${p.id}|${p.date}`).sort();
      expect(a).toEqual(b);
    }), { numRuns: 30 });
  });

  it("ingen dubletter pr. (sourceKey, dato)", () => {
    fc.assert(fc.property(fc.array(sourceArb, { minLength: 1, maxLength: 4 }), (sources) => {
      const projs = ProjectionEngine.from(sources)
        .inRange("2026-06-01", "2026-08-31")
        .withRealRoutes(new Set<string>())
        .build().projections;
      const seen = new Set<string>();
      for (const p of projs) {
        const key = `${p.baseRouteId}|${p.date}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }), { numRuns: 30 });
  });

  it("alle projektioner ligger inden for effective range", () => {
    fc.assert(fc.property(fc.array(sourceArb, { minLength: 1, maxLength: 4 }), (sources) => {
      const res = ProjectionEngine.from(sources)
        .inRange("2026-06-01", "2026-08-31")
        .withRealRoutes(new Set<string>())
        .build();
      for (const p of res.projections) {
        expect(p.date >= res.effectiveRange.rangeStart).toBe(true);
        expect(p.date <= res.effectiveRange.rangeEnd).toBe(true);
      }
    }), { numRuns: 30 });
  });

  it("cancelled override fjerner forekomst på den dato", () => {
    fc.assert(fc.property(sourceArb, dateArb, (source, cancelDate) => {
      const base = ProjectionEngine.from([source])
        .inRange("2026-06-01", "2026-08-31")
        .withRealRoutes(new Set<string>())
        .build();
      if (!base.projections.some((p) => p.date === cancelDate)) return; // ikke relevant
      const overrides: AgreementOccurrenceOverride[] = [
        { agreement_id: source.agreement_id!, original_date: cancelDate, status: "cancelled" },
      ];
      const after = ProjectionEngine.from([source])
        .inRange("2026-06-01", "2026-08-31")
        .withRealRoutes(new Set<string>())
        .applyOverrides(overrides)
        .build();
      expect(after.projections.some((p) => p.date === cancelDate)).toBe(false);
    }), { numRuns: 30 });
  });

  it("helligdag fjerner forekomst på dagen", () => {
    fc.assert(fc.property(sourceArb, dateArb, (source, holiday) => {
      const after = ProjectionEngine.from([source])
        .inRange("2026-06-01", "2026-08-31")
        .withRealRoutes(new Set<string>())
        .applyHolidays([holiday])
        .build();
      expect(after.projections.some((p) => p.date === holiday)).toBe(false);
    }), { numRuns: 30 });
  });

  it("pause-interval skjuler alle datoer i intervallet", () => {
    fc.assert(fc.property(sourceArb, dateArb, fc.integer({ min: 1, max: 30 }), (source, start, len) => {
      const end = format(addDays(parseISO(start), len), "yyyy-MM-dd");
      const pauses: AgreementPauseRange[] = [
        { agreement_id: source.agreement_id!, start_date: start, end_date: end },
      ];
      const after = ProjectionEngine.from([source])
        .inRange("2026-06-01", "2026-08-31")
        .withRealRoutes(new Set<string>())
        .applyPauses(pauses)
        .build();
      for (const p of after.projections) {
        const inside = p.date >= start && p.date <= end;
        expect(inside).toBe(false);
      }
    }), { numRuns: 30 });
  });

  it("tom kilde-liste giver tom projektion", () => {
    const res = ProjectionEngine.from([])
      .inRange("2026-06-01", "2026-08-31")
      .withRealRoutes(new Set<string>())
      .build();
    expect(res.projections).toEqual([]);
  });
});