// useSickLeave
// -----------------------------------------------------------------------------
// Quickfix-logik når en medarbejder melder sig syg:
//  1) Find alle ruter og aftaler medarbejderen står på i en periode
//  2) Beregn hvilke kolleger der realistisk kan overtage (konflikter, load, kapacitet)
//  3) Udfør en samlet handling per rute (erstat / fordel / frigiv / flyt dato)
//
// Alt sker mod eksisterende tabeller (routes, route_employees, route_stops,
// route_stop_assignees) plus den nye employee_absences.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateRouteSyncQueries } from "@/hooks/useRoutes";
import { logRouteAudit } from "@/lib/route-audit";

export type AffectedStop = {
  id: string;
  route_id: string;
  customer_name: string | null;
  address: string | null;
  planned_arrival: string | null;
  duration_minutes: number | null;
  required_staff: number | null;
  status: string | null;
  sequence: number | null;
  /** Alle tildelte på stoppet (inkl. den syge). */
  assignee_ids: string[];
  lead_id: string | null;
};

export type AffectedRoute = {
  id: string;
  name: string | null;
  route_date: string;
  /** Er den syge rutens primære medarbejder? */
  isPrimary: boolean;
  /** Resten af holdet på ruten (uden den syge). */
  crewIds: string[];
  stops: AffectedStop[];
};

export type SickLeaveImpact = {
  routes: AffectedRoute[];
  /** Alle stops i perioden — bruges til at beregne kollegers optagethed. */
  busyByEmployee: Record<string, { date: string; start: number; end: number }[]>;
  /** Antal stops per medarbejder i perioden. */
  loadByEmployee: Record<string, number>;
  totalStops: number;
};

const minutesOf = (iso: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
};

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

export const useSickLeaveImpact = (
  businessId: string | undefined,
  employeeId: string | null,
  from: string,
  to: string,
  enabled = true,
) =>
  useQuery<SickLeaveImpact>({
    queryKey: ["sick-leave-impact", businessId, employeeId, from, to],
    enabled: !!businessId && !!employeeId && !!from && !!to && enabled,
    staleTime: 15 * 1000,
    queryFn: async () => {
      const empty: SickLeaveImpact = { routes: [], busyByEmployee: {}, loadByEmployee: {}, totalStops: 0 };
      if (!businessId || !employeeId) return empty;

      const { data: routeRows, error: routeErr } = await supabase
        .from("routes")
        .select("id, name, route_date, employee_id")
        .eq("business_id", businessId)
        .gte("route_date", from)
        .lte("route_date", to)
        .is("deleted_at", null)
        .is("archived_at", null);
      if (routeErr) throw routeErr;
      const routes = routeRows || [];
      if (routes.length === 0) return empty;

      const routeIds = routes.map((r) => r.id);

      const [{ data: stopRows, error: stopErr }, { data: crewRows }] = await Promise.all([
        supabase
          .from("route_stops")
          .select(
            "id, route_id, customer_name, address, planned_arrival, planned_departure, duration_minutes, required_staff, status, sequence",
          )
          .in("route_id", routeIds),
        supabase.from("route_employees").select("route_id, employee_id").in("route_id", routeIds),
      ]);
      if (stopErr) throw stopErr;
      const stops = stopRows || [];
      const stopIds = stops.map((s) => s.id);

      const { data: assigneeRows } = await supabase
        .from("route_stop_assignees")
        .select("stop_id, employee_id, is_lead")
        .in("stop_id", stopIds.length ? stopIds : [EMPTY_UUID]);

      const assigneesByStop = new Map<string, { ids: string[]; lead: string | null }>();
      (assigneeRows || []).forEach((a: any) => {
        const cur = assigneesByStop.get(a.stop_id) || { ids: [], lead: null };
        cur.ids.push(a.employee_id);
        if (a.is_lead) cur.lead = a.employee_id;
        assigneesByStop.set(a.stop_id, cur);
      });

      const routeById = new Map(routes.map((r) => [r.id, r]));
      const busyByEmployee: Record<string, { date: string; start: number; end: number }[]> = {};
      const loadByEmployee: Record<string, number> = {};

      for (const s of stops) {
        const info = assigneesByStop.get(s.id);
        if (!info) continue;
        const date = routeById.get(s.route_id)?.route_date as string | undefined;
        const start = minutesOf(s.planned_arrival);
        const end =
          minutesOf((s as any).planned_departure) ??
          (start != null ? start + Math.max(s.duration_minutes || 30, 15) : null);
        for (const eid of info.ids) {
          loadByEmployee[eid] = (loadByEmployee[eid] || 0) + 1;
          if (date && start != null && end != null) {
            (busyByEmployee[eid] ||= []).push({ date, start, end });
          }
        }
      }

      const crewByRoute = new Map<string, string[]>();
      (crewRows || []).forEach((c: any) => {
        const arr = crewByRoute.get(c.route_id) || [];
        arr.push(c.employee_id);
        crewByRoute.set(c.route_id, arr);
      });

      const stopsByRoute = new Map<string, AffectedStop[]>();
      for (const s of stops) {
        const info = assigneesByStop.get(s.id);
        if (!info?.ids.includes(employeeId)) continue;
        // Færdige aftaler skal ikke flyttes — arbejdet er allerede udført.
        if (s.status === "completed" || s.status === "cancelled") continue;
        const arr = stopsByRoute.get(s.route_id) || [];
        arr.push({
          id: s.id,
          route_id: s.route_id,
          customer_name: s.customer_name,
          address: s.address,
          planned_arrival: s.planned_arrival,
          duration_minutes: s.duration_minutes,
          required_staff: s.required_staff,
          status: s.status,
          sequence: s.sequence,
          assignee_ids: info.ids,
          lead_id: info.lead,
        });
        stopsByRoute.set(s.route_id, arr);
      }

      const affected: AffectedRoute[] = routes
        .filter((r) => stopsByRoute.has(r.id) || r.employee_id === employeeId || (crewByRoute.get(r.id) || []).includes(employeeId))
        .map((r) => ({
          id: r.id,
          name: r.name,
          route_date: r.route_date as string,
          isPrimary: r.employee_id === employeeId,
          crewIds: (crewByRoute.get(r.id) || []).filter((e) => e !== employeeId),
          stops: (stopsByRoute.get(r.id) || []).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
        }))
        .sort((a, b) => a.route_date.localeCompare(b.route_date));

      return {
        routes: affected,
        busyByEmployee,
        loadByEmployee,
        totalStops: affected.reduce((n, r) => n + r.stops.length, 0),
      };
    },
  });

/* ─────────────── Kandidat-scoring ─────────────── */

export type CandidateScore = {
  employeeId: string;
  /** Antal af de berørte aftaler hvor personen har en tidskonflikt. */
  conflicts: number;
  /** Aftaler personen har i forvejen i perioden. */
  currentLoad: number;
  /** Overskrider max_stops_per_day hvis de overtager. */
  overCapacity: boolean;
  /** Allerede på ruten. */
  onCrew: boolean;
};

export const scoreCandidate = (
  employeeId: string,
  route: AffectedRoute,
  impact: SickLeaveImpact,
  maxStopsPerDay?: number | null,
): CandidateScore => {
  const busy = impact.busyByEmployee[employeeId] || [];
  let conflicts = 0;
  for (const stop of route.stops) {
    const start = minutesOf(stop.planned_arrival);
    if (start == null) continue;
    const end = start + Math.max(stop.duration_minutes || 30, 15);
    if (busy.some((b) => b.date === route.route_date && start < b.end && end > b.start)) conflicts++;
  }
  const sameDayLoad = busy.filter((b) => b.date === route.route_date).length;
  const overCapacity =
    !!maxStopsPerDay && maxStopsPerDay > 0 && sameDayLoad + route.stops.length > maxStopsPerDay;
  return {
    employeeId,
    conflicts,
    currentLoad: impact.loadByEmployee[employeeId] || 0,
    overCapacity,
    onCrew: route.crewIds.includes(employeeId),
  };
};

export const sortCandidates = (a: CandidateScore, b: CandidateScore) => {
  if (a.conflicts !== b.conflicts) return a.conflicts - b.conflicts;
  if (a.overCapacity !== b.overCapacity) return a.overCapacity ? 1 : -1;
  if (a.onCrew !== b.onCrew) return a.onCrew ? -1 : 1;
  return a.currentLoad - b.currentLoad;
};

/* ─────────────── Commit ─────────────── */

export type SickLeaveAction = "replace" | "spread" | "unassign" | "move_date";

/** Dansk forklaring til historikken, så ejeren kan se hvad der blev valgt. */
const SICK_LEAVE_SUMMARY: Record<SickLeaveAction, (newDate: string | null) => string> = {
  replace: () => "ruten blev overtaget af en afløser",
  spread: () => "stoppene blev fordelt på det øvrige hold",
  unassign: () => "ruten blev sat fri uden medarbejder",
  move_date: (d) => `ruten blev flyttet til ${d ?? "en ny dato"}`,
};

export type RouteDecision = {
  routeId: string;
  action: SickLeaveAction;
  replacementId?: string | null;
  newDate?: string | null;
};

export type CommitSickLeaveInput = {
  businessId: string;
  employeeId: string;
  employeeName: string;
  /** Registrér fravær i kalenderen. */
  absence: { from: string; to: string; type: "sick" | "vacation" | "other"; note?: string } | null;
  decisions: RouteDecision[];
  impact: SickLeaveImpact;
};

export const useCommitSickLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CommitSickLeaveInput) => {
      const { businessId, employeeId, impact } = input;
      let stopsChanged = 0;
      let routesChanged = 0;

      if (input.absence) {
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase.from("employee_absences").insert({
          business_id: businessId,
          employee_id: employeeId,
          start_date: input.absence.from,
          end_date: input.absence.to,
          absence_type: input.absence.type,
          note: input.absence.note || null,
          created_by: userRes.user?.id ?? null,
        });
        if (error) throw error;
      }

      const routeById = new Map(impact.routes.map((r) => [r.id, r]));

      for (const decision of input.decisions) {
        const route = routeById.get(decision.routeId);
        if (!route) continue;

        if (decision.action === "move_date") {
          if (!decision.newDate) continue;
          const { error } = await supabase
            .from("routes")
            .update({ route_date: decision.newDate })
            .eq("id", route.id);
          if (error) throw error;
          routesChanged++;
          continue;
        }

        // Hvem overtager hvert stop?
        const takeoverByStop = new Map<string, string | null>();

        if (decision.action === "replace") {
          const rep = decision.replacementId || null;
          route.stops.forEach((s) => takeoverByStop.set(s.id, rep));
        } else if (decision.action === "spread") {
          const crew = route.crewIds.filter((c) => c !== employeeId);
          if (crew.length === 0) {
            throw new Error(`Ruten "${route.name || "uden navn"}" har ingen andre medarbejdere at fordele på`);
          }
          const counts = new Map(crew.map((c) => [c, impact.loadByEmployee[c] || 0]));
          route.stops.forEach((s) => {
            // Undgå at give stoppet til en der allerede står på det
            const eligible = crew.filter((c) => !s.assignee_ids.includes(c));
            const pool = eligible.length ? eligible : crew;
            const pick = pool.reduce((best, c) =>
              (counts.get(c) ?? 0) < (counts.get(best) ?? 0) ? c : best,
            pool[0]);
            counts.set(pick, (counts.get(pick) ?? 0) + 1);
            takeoverByStop.set(s.id, pick);
          });
        } else {
          route.stops.forEach((s) => takeoverByStop.set(s.id, null));
        }

        for (const stop of route.stops) {
          const takeover = takeoverByStop.get(stop.id) ?? null;
          const { error: delErr } = await supabase
            .from("route_stop_assignees")
            .delete()
            .eq("stop_id", stop.id)
            .eq("employee_id", employeeId);
          if (delErr) throw delErr;

          if (takeover && !stop.assignee_ids.includes(takeover)) {
            const { error: insErr } = await supabase
              .from("route_stop_assignees")
              .upsert(
                { stop_id: stop.id, employee_id: takeover, is_lead: stop.lead_id === employeeId },
                { onConflict: "stop_id,employee_id", ignoreDuplicates: false },
              );
            if (insErr) throw insErr;
          } else if (takeover && stop.lead_id === employeeId) {
            await supabase
              .from("route_stop_assignees")
              .update({ is_lead: true })
              .eq("stop_id", stop.id)
              .eq("employee_id", takeover);
          }
          stopsChanged++;
        }

        // Hold-listen på ruten: tilføj afløser, fjern den syge
        if (decision.action === "replace" && decision.replacementId && !route.crewIds.includes(decision.replacementId)) {
          await supabase
            .from("route_employees")
            .upsert(
              { route_id: route.id, employee_id: decision.replacementId },
              { onConflict: "route_id,employee_id", ignoreDuplicates: true },
            );
        }
        await supabase
          .from("route_employees")
          .delete()
          .eq("route_id", route.id)
          .eq("employee_id", employeeId);

        if (route.isPrimary) {
          const newPrimary =
            decision.action === "replace"
              ? decision.replacementId ?? null
              : decision.action === "spread"
                ? route.crewIds[0] ?? null
                : null;
          const { error } = await supabase
            .from("routes")
            .update({ employee_id: newPrimary })
            .eq("id", route.id);
          if (error) throw error;
        }
        routesChanged++;

        await logRouteAudit({
          business_id: businessId,
          route_id: route.id,
          action: `sygemelding:${decision.action}`,
          summary: `${input.employeeName} blev meldt syg — ${
            SICK_LEAVE_SUMMARY[decision.action as SickLeaveAction](decision.newDate ?? null)
          }.`,
          scope: "single",
          affected_count: route.stops.length,
          before: { employee_id: employeeId, employee_name: input.employeeName },
          after: { replacement_id: decision.replacementId ?? null, new_date: decision.newDate ?? null },
        });
      }

      return { routesChanged, stopsChanged };
    },
    onSuccess: (res) => {
      invalidateRouteSyncQueries(qc);
      qc.invalidateQueries({ queryKey: ["sick-leave-impact"] });
      qc.invalidateQueries({ queryKey: ["employee-absences"] });
      qc.invalidateQueries({ queryKey: ["route-employees-bulk"] });
      qc.invalidateQueries({ queryKey: ["stop-assignees-bulk"] });
      toast.success(
        `Sygemelding gennemført — ${res.routesChanged} rute${res.routesChanged === 1 ? "" : "r"} og ${res.stopsChanged} aftale${res.stopsChanged === 1 ? "" : "r"} opdateret`,
      );
    },
    onError: (e: any) => {
      toast.error(e?.message || "Kunne ikke gennemføre sygemeldingen");
    },
  });
};