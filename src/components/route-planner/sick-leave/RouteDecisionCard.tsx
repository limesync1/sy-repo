// Ét kort pr. ramt rute: synlige handlingsvalg + afløserliste.
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmployeeAvatars } from "@/components/route-planner/EmployeeAvatars";
import { DatePickerField } from "@/components/route-planner/DatePickerField";
import { cn } from "@/lib/utils";
import { Check, Sparkles } from "lucide-react";
import {
  type AffectedRoute, type CandidateScore, type RouteDecision, type SickLeaveAction,
} from "@/hooks/route-planner/useSickLeave";
import { ACTION_HINT, ACTION_LABEL, Emp, EmpLine, shortDate } from "./shared";

const ACTIONS: SickLeaveAction[] = ["replace", "spread", "unassign", "move_date"];

export default function RouteDecisionCard({
  route, decision, candidates, empById, onChange, minDate,
}: {
  route: AffectedRoute;
  decision?: RouteDecision;
  candidates: CandidateScore[];
  empById: Map<string, Emp>;
  onChange: (patch: Partial<RouteDecision>) => void;
  minDate: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const action = decision?.action || "replace";
  const best = candidates[0];
  const visible = showAll ? candidates : candidates.slice(0, 3);
  const understaffed = route.stops.filter(
    (s) => (s.required_staff || 1) > s.assignee_ids.length,
  ).length;
  const crew = route.crewIds
    .map((id) => empById.get(id))
    .filter(Boolean)
    .map((e) => ({ id: e!.id, name: e!.name, avatar_url: e!.avatar_url, color: e!.color }));

  const disabledReason = (a: SickLeaveAction) =>
    a === "spread" && route.crewIds.length === 0 ? "Ingen andre på holdet" : null;

  return (
    <section className="space-y-4 rounded-lg border bg-card p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{route.name || "Rute uden navn"}</p>
          <p className="text-[11px] text-muted-foreground">
            {shortDate(route.route_date)} · {route.stops.length} aftale
            {route.stops.length === 1 ? "" : "r"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {crew.length > 0 && <EmployeeAvatars employees={crew} size={20} max={3} />}
          {route.isPrimary && <Badge variant="secondary" className="text-[10px]">Ansvarlig</Badge>}
          {understaffed > 0 && (
            <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600">
              {understaffed} underbemandet
            </Badge>
          )}
        </div>
      </div>

      {/* Handlingsvalg som radiokort */}
      <div role="radiogroup" aria-label="Løsning for ruten" className="grid gap-2">
        {ACTIONS.map((a) => {
          const reason = disabledReason(a);
          const selected = action === a;
          return (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!!reason}
              onClick={() => onChange({ action: a })}
              className={cn(
                "rounded-md border px-3 py-2.5 text-left transition-colors",
                selected ? "border-foreground bg-secondary/60" : "border-border hover:bg-secondary/40",
                reason && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                    selected && "border-foreground bg-foreground text-background",
                  )}
                >
                  {selected && <Check className="h-2.5 w-2.5" />}
                </span>
                {ACTION_LABEL[a]}
              </span>
               <span className="mt-1 block pl-5 text-[11px] leading-relaxed text-muted-foreground">
                {reason || ACTION_HINT[a]}
              </span>
            </button>
          );
        })}
      </div>

      {action === "replace" && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Vælg afløser
          </p>
          {candidates.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
              Ingen ledige kolleger i perioden — vælg en anden løsning.
            </p>
          ) : (
            <>
              <div className="space-y-1">
                {visible.map((c) => {
                  const selected = decision?.replacementId === c.employeeId;
                  return (
                    <button
                      key={c.employeeId}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange({ replacementId: c.employeeId })}
                      className={cn(
                        "flex w-full flex-col items-stretch gap-2 rounded-md border px-3 py-2.5 text-left transition-colors sm:flex-row sm:items-center sm:justify-between",
                        selected ? "border-foreground bg-secondary/60" : "hover:bg-secondary/40",
                      )}
                    >
                      <EmpLine emp={empById.get(c.employeeId)} size={22} className="text-xs" />
                      <span className="flex shrink-0 flex-wrap items-center gap-1">
                        {best?.employeeId === c.employeeId && c.conflicts === 0 && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <Sparkles className="h-2.5 w-2.5" /> Anbefalet
                          </Badge>
                        )}
                        {c.conflicts > 0 ? (
                          <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600">
                            {c.conflicts} konflikt{c.conflicts === 1 ? "" : "er"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-600">
                            Ledig
                          </Badge>
                        )}
                        {c.onCrew && <Badge variant="secondary" className="text-[10px]">På holdet</Badge>}
                        {c.overCapacity && (
                          <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600">
                            Over kapacitet
                          </Badge>
                        )}
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {c.currentLoad} aftaler
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {candidates.length > 3 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? "Vis færre" : `Vis alle (${candidates.length})`}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {action === "move_date" && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Ny dato for ruten
          </p>
          <DatePickerField
            value={decision?.newDate || ""}
            minDate={minDate}
            onChange={(v) => onChange({ newDate: v })}
          />
        </div>
      )}

      {route.stops.length > 0 && (
        <p className="truncate text-[11px] text-muted-foreground">
          {route.stops.slice(0, 3).map((s) => s.customer_name || s.address || "Aftale").join(" · ")}
          {route.stops.length > 3 && ` +${route.stops.length - 3} mere`}
        </p>
      )}
    </section>
  );
}
