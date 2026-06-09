/**
 * decideDrop — Bølge 2 / 2.3 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * Ren, side-effect-fri beslutningsfunktion for et drag-and-drop event i
 * RoutePlanner. Den oversætter (active, over, kontekst) → `DropDecision` der
 * præcist beskriver hvad executoren skal gøre — uden at åbne dialoger, kalde
 * supabase eller vise toasts.
 *
 *   decideDrop()          → DropDecision     (denne fil — pure)
 *   executeDropDecision() → DB-kald + UI     (useRoutePlannerDragEnd)
 *   rollback()            → toast.error + invalidate (executor)
 *
 * Fordele:
 *   - Hver gren kan unit-testes uden React eller netværk.
 *   - Simulation mode (5.1) genbruger samme decision-output uden at commit'e.
 *   - Trigger-/regel-ændringer sker ét sted, ikke spredt i en 600-linjers hook.
 */

import {
  classifyDrop,
  computeTargetDateForGuard,
  type DropKind,
} from "@/lib/route-planner/drop-classifier";

/* ─── Decision-typer ─────────────────────────────────────────────────── */

export type DropOp =
  | {
      type: "add-stop-to-route";
      routeId: string;
      job: any;
      /** Hvis target-ruten har en kendt dato; bruges af executor til start-date guard. */
      targetDate: string | null;
      /** Vist i toast efter commit. */
      targetLabel: string;
    }
  | {
      type: "create-route-with-stop";
      job: any;
      newDate: string;
    }
  | {
      type: "move-stop-to-day";
      stop: any;
      newDate: string;
      /** Originalruten på dropt'idspunktet (til undo + dato-sammenligning). */
      currentRouteDate: string | null;
    };

export type DropDialog =
  | {
      type: "projected-move";
      baseRouteId: string;
      routeName: string;
      fromDate: string;
      toDate: string;
    }
  | {
      type: "route-merge";
      source: any;
      target: any;
    }
  | {
      type: "route-move";
      route: any;
      newDate: string;
    };

export type DropDecision =
  | { kind: "noop"; reason?: string }
  | {
      kind: "blocked";
      severity: "error" | "info";
      title: string;
      description?: string;
    }
  | { kind: "dialog"; dialog: DropDialog }
  | { kind: "commit"; op: DropOp };

/* ─── Kontekst ───────────────────────────────────────────────────────── */

type RouteRow = {
  id: string;
  route_date?: string | null;
  base_route_id?: string | null;
  isVirtual?: boolean;
  name?: string | null;
};

type VirtualRouteRow = {
  id: string;
  route_date?: string | null;
  baseRouteId?: string | null;
};

export type DecideDropCtx = {
  /** Dagens dato i lokal tidszone (yyyy-MM-dd). */
  todayLocal: string;
  /** Alle faktiske + virtuelle ruter (raw row) — bruges til kollisions-check. */
  calendarRoutesRaw: RouteRow[];
  /** Virtuelle (projicerede) forekomster — bruges til projection-kollision. */
  virtualCalendarRoutes: VirtualRouteRow[];
};

/* ─── Hovedfunktion ──────────────────────────────────────────────────── */

const blocked = (
  severity: "error" | "info",
  title: string,
  description?: string,
): DropDecision => ({ kind: "blocked", severity, title, description });

const noop = (reason?: string): DropDecision => ({ kind: "noop", reason });

export function decideDrop(
  activeData: any,
  overData: any,
  ctx: DecideDropCtx,
): DropDecision {
  if (!activeData || !overData) return noop("missing-data");

  // ── Hård guard: aldrig drop på dato før i dag ──
  const routesById = new Map<string, RouteRow>(
    ctx.calendarRoutesRaw.map((r) => [r.id, r]),
  );
  const guardDate = computeTargetDateForGuard(overData, routesById);
  if (guardDate && guardDate < ctx.todayLocal) {
    return blocked(
      "error",
      "Kan ikke flytte til en dato før i dag",
      "Ruter og aftaler kan kun planlægges fra i dag og frem.",
    );
  }

  const kind: DropKind = classifyDrop(activeData, overData);

  switch (kind) {
    case "noop":
      return noop("classify-noop");

    case "projected-route-to-route":
      return blocked(
        "error",
        "Kan ikke flette en projiceret rute",
        "Åbn den projicerede rute først, eller flyt en faktisk rute i stedet.",
      );

    case "projected-route-to-day":
      return decideProjectedRouteToDay(activeData, overData, ctx);

    case "route-to-route":
      return decideRouteToRoute(activeData, overData, ctx);

    case "route-to-day":
      return decideRouteToDay(activeData, overData, ctx);

    case "job-to-route":
      return decideJobToRoute(activeData, overData, ctx);

    case "job-to-day":
      return decideJobToDay(activeData, overData);

    case "stop-to-day":
      return decideStopToDay(activeData, overData, ctx);

    default:
      return noop("unknown-kind");
  }
}

/* ─── Per-kind validators ────────────────────────────────────────────── */

function decideProjectedRouteToDay(
  activeData: any,
  overData: any,
  ctx: DecideDropCtx,
): DropDecision {
  const fromDate = String(activeData.route.route_date || "").slice(0, 10);
  const toDate = String(overData.date || "").slice(0, 10);
  if (!fromDate || !toDate || fromDate === toDate) return noop("same-date");

  const baseRouteId: string | null = activeData.route.baseRouteId ?? null;
  if (!baseRouteId) {
    return blocked("error", "Kan ikke identificere originalruten for forekomsten");
  }

  const collidingReal = ctx.calendarRoutesRaw.find(
    (r) =>
      String(r.route_date).slice(0, 10) === toDate &&
      (r.id === baseRouteId || r.base_route_id === baseRouteId),
  );
  if (collidingReal) {
    return blocked("error", "Der findes allerede en rute fra samme serie på den dato");
  }

  const collidingVirtual = ctx.virtualCalendarRoutes.find(
    (r) =>
      String(r.route_date).slice(0, 10) === toDate &&
      r.baseRouteId === baseRouteId &&
      r.id !== activeData.route.id,
  );
  if (collidingVirtual) {
    return blocked(
      "error",
      "Der ligger allerede en projiceret forekomst af samme rute på den dato",
      "Vælg en anden dato — ellers vil der være to af samme rute på samme dag.",
    );
  }

  return {
    kind: "dialog",
    dialog: {
      type: "projected-move",
      baseRouteId,
      routeName: activeData.route.name || "Rute",
      fromDate,
      toDate,
    },
  };
}

function decideRouteToRoute(
  activeData: any,
  overData: any,
  ctx: DecideDropCtx,
): DropDecision {
  const source = activeData.route;
  const targetRouteId: string = overData.routeId;
  if (source.id === targetRouteId) return noop("merge-self");
  const target = ctx.calendarRoutesRaw.find((r) => r.id === targetRouteId);
  if (!target) return noop("missing-target");
  if ((target as any).isVirtual) {
    return blocked(
      "error",
      "Kan ikke flette ind i en projiceret rute",
      "Vælg en faktisk rute som mål — eller flyt den projicerede forekomst først.",
    );
  }
  return { kind: "dialog", dialog: { type: "route-merge", source, target } };
}

function decideRouteToDay(
  activeData: any,
  overData: any,
  ctx: DecideDropCtx,
): DropDecision {
  const route = activeData.route;
  const newDate: string = overData.date;
  if (route.route_date === newDate) return noop("same-date");

  const baseId: string | null =
    (route as any).base_route_id ?? (route as any).baseRouteId ?? route.id ?? null;

  const collidingReal = ctx.calendarRoutesRaw.find(
    (r: any) =>
      String(r.route_date).slice(0, 10) === newDate &&
      r.id !== route.id &&
      ((baseId && (r.id === baseId || r.base_route_id === baseId)) ||
        (!baseId && r.id === route.id)),
  );
  if (collidingReal) {
    return blocked(
      "error",
      "Der findes allerede en rute fra samme serie på den dato",
      "Flet i stedet ruterne, eller vælg en anden dato.",
    );
  }

  const collidingProjected = ctx.virtualCalendarRoutes.find(
    (r: any) =>
      String(r.route_date).slice(0, 10) === newDate &&
      baseId &&
      r.baseRouteId === baseId &&
      r.id !== route.id,
  );
  // Vi BLOKERER ikke længere når der ligger en projiceret forekomst på
  // måldagen — i stedet åbnes scope-dialogen (single/future) og lader
  // brugeren vælge. Server-siden (`move_route_to_date`) håndterer at
  // forskyde/undertrykke den projicerede forekomst korrekt så vi ikke
  // ender med to af samme serie på samme dag.
  void collidingProjected;

  return { kind: "dialog", dialog: { type: "route-move", route, newDate } };
}

function decideJobToRoute(
  activeData: any,
  overData: any,
  ctx: DecideDropCtx,
): DropDecision {
  const job = activeData.job;
  if (job?.status === "pending") {
    return blocked(
      "error",
      "Aftalen skal godkendes først",
      "Aftalen er endnu ikke bekræftet af jer eller kunden — godkend den før den kan lægges på en rute.",
    );
  }
  const targetRouteId: string = overData.routeId;
  const targetRoute = ctx.calendarRoutesRaw.find((r) => r.id === targetRouteId);
  if ((targetRoute as any)?.isVirtual) {
    return blocked(
      "error",
      "Kan ikke lægge aftaler på en projiceret rute",
      "Projicerede ruter er fremtidige forekomster — læg aftalen på originalruten eller en faktisk rute.",
    );
  }
  const targetDate =
    (targetRoute?.route_date as string | null | undefined) ??
    ((targetRoute as any)?.date as string | null | undefined) ??
    null;
  return {
    kind: "commit",
    op: {
      type: "add-stop-to-route",
      routeId: targetRouteId,
      job,
      targetDate: targetDate ? String(targetDate).slice(0, 10) : null,
      targetLabel: targetRoute?.name ? `ruten "${targetRoute.name}"` : "ruten",
    },
  };
}

function decideJobToDay(activeData: any, overData: any): DropDecision {
  const job = activeData.job;
  if (job?.status === "pending") {
    return blocked(
      "error",
      "Aftalen skal godkendes først",
      "Aftalen er endnu ikke bekræftet af jer eller kunden — godkend den før den kan lægges på en rute.",
    );
  }
  const newDate: string = overData.date;
  return {
    kind: "commit",
    op: { type: "create-route-with-stop", job, newDate },
  };
}

function decideStopToDay(
  activeData: any,
  overData: any,
  ctx: DecideDropCtx,
): DropDecision {
  const stop = activeData.stop;
  if ((stop as any)?.isVirtual || String(stop?.id || "").startsWith("virtual-stop:")) {
    return blocked(
      "error",
      "Projicerede stops kan ikke flyttes",
      "Åbn originalruten for at ændre rækkefølge eller dato for denne aftale.",
    );
  }
  const newDate: string = overData.date;
  const currentRoute = ctx.calendarRoutesRaw.find((r) => r.id === stop.route_id);
  if (currentRoute && currentRoute.route_date === newDate) return noop("same-date");
  return {
    kind: "commit",
    op: {
      type: "move-stop-to-day",
      stop,
      newDate,
      currentRouteDate: (currentRoute?.route_date as string | null) ?? null,
    },
  };
}