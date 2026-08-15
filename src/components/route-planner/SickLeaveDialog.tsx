// SickLeaveDialog — "Meld syg" som roligt 3-trins flow:
//   1) hvem og hvornår  2) sådan dækkes aftalerne  3) bekræft
// Logikken (impact, kandidater, commit) ligger i useSickLeave og er uændret.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SheetHeaderBlock } from "@/components/route-planner/SheetSection";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Thermometer } from "lucide-react";
import {
  scoreCandidate, sortCandidates, useCommitSickLeave, useSickLeaveImpact,
  type RouteDecision, type SickLeaveAction,
} from "@/hooks/route-planner/useSickLeave";
import { useEmployeeAbsences } from "@/hooks/useEmployeeAbsences";
import StepWho from "./sick-leave/StepWho";
import StepConfirm from "./sick-leave/StepConfirm";
import RouteDecisionCard from "./sick-leave/RouteDecisionCard";
import {
  ACTION_LABEL, type Emp, StepHeading, addDays, localDate,
} from "./sick-leave/shared";

const STEPS = ["Hvem og hvornår", "Sådan dækkes det", "Bekræft"];

export default function SickLeaveDialog({
  open, onOpenChange, businessId, employees, initialEmployeeId, initialDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  businessId: string;
  employees: Emp[];
  initialEmployeeId?: string | null;
  initialDate?: string;
}) {
  const today = initialDate || localDate();
  const [step, setStep] = useState(0);
  const [employeeId, setEmployeeId] = useState<string | null>(initialEmployeeId ?? null);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [note, setNote] = useState("");
  const [decisions, setDecisions] = useState<Record<string, RouteDecision>>({});
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setEmployeeId(initialEmployeeId ?? null);
    setFrom(today);
    setTo(today);
    setNote("");
    setDecisions({});
  }, [open, initialEmployeeId, today]);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
  }, [step, open]);

  const safeTo = to < from ? from : to;
  const impactQuery = useSickLeaveImpact(businessId, employeeId, from, safeTo, open);
  const impact = impactQuery.data;
  const { data: absences = [] } = useEmployeeAbsences(businessId, from, safeTo);
  const commit = useCommitSickLeave();

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const sickEmp = employeeId ? empById.get(employeeId) : null;

  const unavailableIds = useMemo(() => new Set(absences.map((a) => a.employee_id)), [absences]);
  const alreadyAbsent = !!employeeId && unavailableIds.has(employeeId);

  const candidatesByRoute = useMemo(() => {
    const map = new Map<string, ReturnType<typeof scoreCandidate>[]>();
    if (!impact || !employeeId) return map;
    for (const route of impact.routes) {
      const scored = employees
        .filter((e) => e.id !== employeeId && e.is_active !== false && !unavailableIds.has(e.id))
        .map((e) => scoreCandidate(e.id, route, impact, e.max_stops_per_day))
        .sort(sortCandidates);
      map.set(route.id, scored);
    }
    return map;
  }, [impact, employees, employeeId, unavailableIds]);

  // Fornuftige standardvalg når konsekvensen er hentet.
  useEffect(() => {
    if (!impact) return;
    setDecisions((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const route of impact.routes) {
        if (next[route.id]) continue;
        const best = candidatesByRoute.get(route.id)?.[0];
        if (best && best.conflicts === 0) {
          next[route.id] = { routeId: route.id, action: "replace", replacementId: best.employeeId };
        } else if (route.crewIds.length > 0) {
          next[route.id] = { routeId: route.id, action: "spread" };
        } else if (best) {
          next[route.id] = { routeId: route.id, action: "replace", replacementId: best.employeeId };
        } else {
          next[route.id] = { routeId: route.id, action: "unassign" };
        }
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [impact, candidatesByRoute]);

  const setDecision = (routeId: string, patch: Partial<RouteDecision>) =>
    setDecisions((prev) => ({
      ...prev,
      [routeId]: { routeId, action: "replace", ...prev[routeId], ...patch },
    }));

  const applyToAll = (action: SickLeaveAction) =>
    setDecisions((prev) => {
      const next = { ...prev };
      for (const route of impact?.routes || []) {
        if (action === "spread" && route.crewIds.length === 0) continue;
        const best = candidatesByRoute.get(route.id)?.[0];
        next[route.id] = {
          routeId: route.id,
          action,
          replacementId: action === "replace" ? (prev[route.id]?.replacementId ?? best?.employeeId ?? null) : null,
          newDate: action === "move_date" ? (prev[route.id]?.newDate ?? addDays(safeTo, 1)) : null,
        };
      }
      return next;
    });

  const decisionList = useMemo(
    () => (impact?.routes || []).map((r) => decisions[r.id]).filter(Boolean) as RouteDecision[],
    [impact, decisions],
  );

  const problems = useMemo(() => {
    const list: string[] = [];
    for (const route of impact?.routes || []) {
      const d = decisions[route.id];
      const name = route.name || "rute";
      if (!d) { list.push(`Vælg en løsning for "${name}"`); continue; }
      if (d.action === "replace" && !d.replacementId) list.push(`Vælg en afløser til "${name}"`);
      if (d.action === "spread" && route.crewIds.length === 0) list.push(`"${name}" har ingen andre på holdet`);
      if (d.action === "move_date" && !d.newDate) list.push(`Vælg en ny dato for "${name}"`);
    }
    return list;
  }, [impact, decisions]);

  const hasRoutes = (impact?.routes.length ?? 0) > 0;
  const loading = impactQuery.isLoading;
  const canLeaveStep1 = !!employeeId && !loading;
  const canSubmit = !!employeeId && problems.length === 0 && !commit.isPending;

  const goNext = () => {
    if (step === 0) setStep(hasRoutes ? 1 : 2);
    else setStep(2);
  };
  const goBack = () => {
    if (step === 2) setStep(hasRoutes ? 1 : 0);
    else setStep(0);
  };

  const submit = async () => {
    if (!employeeId || !sickEmp) return;
    await commit.mutateAsync({
      businessId,
      employeeId,
      employeeName: sickEmp.name,
      absence: { from, to: safeTo, type: "sick", note: note.trim() || undefined },
      decisions: decisionList,
      impact: impact!,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[92vh]">
        <DialogHeader className="shrink-0 space-y-0 border-b px-4 py-4 pr-12 text-left sm:px-5">
          <SheetHeaderBlock
            icon={<Thermometer className="h-4 w-4" />}
            accent="#f59e0b"
            title={<DialogTitle className="text-base">Meld medarbejder syg</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vi finder alle aftaler i perioden og foreslår, hvem der kan overtage. Intet ændres, før du bekræfter.
              </DialogDescription>
            }
          />
          {/* Trin-indikator */}
          <ol className="mt-3 flex items-center gap-1.5" aria-label="Trin">
            {STEPS.map((label, i) => (
              <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
                <span
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i <= step ? "bg-foreground" : "bg-border",
                  )}
                  aria-current={i === step ? "step" : undefined}
                />
                <span
                  className={cn(
                    "hidden shrink-0 text-[10px] font-medium uppercase tracking-wide sm:block",
                    i === step ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 bg-secondary/20">
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div ref={headingRef} tabIndex={-1} className="outline-none" />

            {step === 0 && (
              <StepWho
                employees={employees}
                employeeId={employeeId}
                onEmployeeChange={(v) => { setEmployeeId(v); setDecisions({}); }}
                from={from}
                to={safeTo}
                onFromChange={(v) => { setFrom(v); if (to < v) setTo(v); setDecisions({}); }}
                onToChange={(v) => { setTo(v); setDecisions({}); }}
                today={today}
                impact={impact}
                loading={loading}
                alreadyAbsent={alreadyAbsent}
              />
            )}

            {step === 1 && (
              <div className="space-y-3">
                <StepHeading
                  step={2}
                  title="Sådan dækkes aftalerne"
                  description="Vælg en løsning for hver ramt rute — vi har foreslået det bedste bud."
                />

                {loading ? (
                  <>
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                  </>
                ) : (
                  <>
                    {(impact?.routes.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          Brug samme løsning på alle ruter
                        </span>
                        <Select onValueChange={(v) => applyToAll(v as SickLeaveAction)}>
                          <SelectTrigger className="h-8 w-full text-xs sm:w-56">
                            <SelectValue placeholder="Vælg løsning…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ACTION_LABEL) as SickLeaveAction[]).map((a) => (
                              <SelectItem key={a} value={a} className="text-xs">
                                {ACTION_LABEL[a]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(impact?.routes || []).map((route) => (
                      <RouteDecisionCard
                        key={route.id}
                        route={route}
                        decision={decisions[route.id]}
                        candidates={candidatesByRoute.get(route.id) || []}
                        empById={empById}
                        minDate={addDays(safeTo, 1)}
                        onChange={(patch) => setDecision(route.id, patch)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <StepConfirm
                impact={impact}
                decisions={decisions}
                empById={empById}
                employeeName={sickEmp?.name || "Medarbejder"}
                from={from}
                to={safeTo}
                note={note}
                onNoteChange={setNote}
                problems={problems}
              />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
            onClick={step === 0 ? () => onOpenChange(false) : goBack}
          >
            {step === 0 ? "Annullér" : <><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Tilbage</>}
          </Button>
          {step === 2 ? (
            <Button size="sm" className="w-full sm:w-auto" onClick={submit} disabled={!canSubmit}>
              {commit.isPending ? "Gennemfører…" : "Bekræft sygemelding"}
            </Button>
          ) : (
            <Button size="sm" className="w-full sm:w-auto" onClick={goNext} disabled={!canLeaveStep1}>
              Videre <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
