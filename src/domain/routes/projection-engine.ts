/**
 * ProjectionEngine — Bølge 2 / 2.2 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * Fluent builder oven på den eksisterende, rene `runProjection(...)`. Formålet
 * er at give call-sites en læsbar pipeline-syntaks uden at ændre adfærd:
 *
 *   ProjectionEngine.from(sources)
 *     .inRange(start, end)
 *     .withRealRoutes(realDates)
 *     .withRealStops(stops, dateByRouteId)
 *     .applyExceptions(exc)
 *     .applyOverrides(ovr)
 *     .applyPauses(pauses)
 *     .applyHolidays(hols)
 *     .onUnprojectable(cb)
 *     .build();          // → ProjectionResult
 *
 * Builderen er immutable: hver metode returnerer en ny instans, så delvise
 * pipelines kan genbruges (fx en "base"-pipeline der specialiseres pr. view).
 * Implementationen er ren syntaks-sukker — den delegerer hele kæden til
 * `runProjection()`.
 */

import {
  runProjection,
  type ProjectionInput,
  type ProjectionResult,
  type ProjectionSource,
  type AgreementOccurrenceOverride,
  type AgreementPauseRange,
  type RouteOccurrenceExceptionLike,
} from "@/lib/route-projection";

type Unprojectable = NonNullable<ProjectionInput["onUnprojectable"]>;

export class ProjectionEngine {
  private constructor(private readonly input: ProjectionInput) {}

  /** Start en ny pipeline med et sæt projicerings-kilder. */
  static from(sources: ProjectionSource[]): ProjectionEngine {
    return new ProjectionEngine({
      sources,
      rangeStart: "",
      rangeEnd: "",
      realRouteDates: new Set<string>(),
    });
  }

  /** Synligt kalender-vindue (yyyy-MM-dd). */
  inRange(rangeStart: string, rangeEnd: string): ProjectionEngine {
    return this.next({ rangeStart, rangeEnd });
  }

  /** Materialiserede ruter — `${baseRouteId}|${yyyy-MM-dd}`. */
  withRealRoutes(realRouteDates: Set<string>): ProjectionEngine {
    return this.next({ realRouteDates });
  }

  /** Rigtige stops + dato pr. rute (id → yyyy-MM-dd). Bruges til dedup. */
  withRealStops(
    realStops: Array<Record<string, any>>,
    realRouteDateById: Map<string, string>,
  ): ProjectionEngine {
    return this.next({ realStops, realRouteDateById });
  }

  applyExceptions(exceptions: RouteOccurrenceExceptionLike[] | undefined): ProjectionEngine {
    return this.next({ exceptions });
  }

  applyOverrides(overrides: AgreementOccurrenceOverride[] | undefined): ProjectionEngine {
    return this.next({ overrides });
  }

  applyPauses(pauses: AgreementPauseRange[] | undefined): ProjectionEngine {
    return this.next({ pauses });
  }

  applyHolidays(holidayDates: Iterable<string> | undefined): ProjectionEngine {
    return this.next({ holidayDates });
  }

  onUnprojectable(cb: Unprojectable | undefined): ProjectionEngine {
    return this.next({ onUnprojectable: cb });
  }

  /** Kør hele pipelinen og returnér det færdige resultat. */
  build(): ProjectionResult {
    if (!this.input.rangeStart || !this.input.rangeEnd) {
      throw new Error("ProjectionEngine: inRange(start, end) er påkrævet før build()");
    }
    return runProjection(this.input);
  }

  /** Eksponér det rå input — nyttigt til snapshot-tests og debugging. */
  toInput(): ProjectionInput {
    return this.input;
  }

  private next(patch: Partial<ProjectionInput>): ProjectionEngine {
    return new ProjectionEngine({ ...this.input, ...patch });
  }
}