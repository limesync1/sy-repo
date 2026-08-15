// SickLeaveDialog — "Meld syg" med konsekvens-overblik og løsningsforslag.
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CalendarDays, CheckCircle2, MapPin, Users } from "lucide-react";
import {
  useSickLeaveImpact, useCommitSickLeave, scoreCandidate, sortCandidates,
  type RouteDecision, type SickLeaveAction,
} from "@/hooks/route-planner/useSickLeave";
import { useEmployeeAbsences } from "@/hooks/useEmployeeAbsences";

type Emp = { id: string; name: string; is_active?: boolean; max_stops_per_day?: number | null };

const localDate = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
};
const prettyDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" });

const ACTION_LABEL: Record<SickLeaveAction, string> = {
  replace: "Erstat med kollega",
  spread: "Fordel på resten af holdet",
  unassign: "Frigiv aftalerne (ingen tildelt)",
  move_date: "Flyt hele ruten til en anden dato",
};

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
  const [employeeId, setEmployeeId] = useState<string | null>(initialEmployeeId ?? null);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [note, setNote] = useState("");
  const [decisions, setDecisions] = useState<Record<string, RouteDecision>>({});

  useEffect(() => {
    if (!open) return;
    setEmployeeId(initialEmployeeId ?? null);
    setFrom(today);
    setTo(today);
    setNote("");
    setDecisions({});
  }, [open, initialEmployeeId, today]);

  const safeTo = to < from ? from : to;
  const impactQuery = useSickLeaveImpact(businessId, employeeId, from, safeTo, open);
  const impact = impactQuery.data;
  const { data: absences = [] } = useEmployeeAbsences(businessId, from, safeTo);
  const commit = useCommitSickLeave();

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const sickEmp = employeeId ? empById.get(employeeId) : null;

  const unavailableIds = useMemo(
    () => new Set(absences.map((a) => a.employee_id)),
    [absences],
  );

  // Kandidater per rute, sorteret bedst først
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

  // Sæt fornuftige standardvalg når konsekvensen er hentet
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

  const decisionList = useMemo(
    () => (impact?.routes || []).map((r) => decisions[r.id]).filter(Boolean) as RouteDecision[],
    [impact, decisions],
  );

  const problems = useMemo(() => {
    const list: string[] = [];
    for (const route of impact?.routes || []) {
      const d = decisions[route.id];
      if (!d) continue;
      if (d.action === "replace" && !d.replacementId) list.push(`Vælg en afløser til "${route.name || "rute"}"`);
      if (d.action === "spread" && route.crewIds.length === 0) list.push(`"${route.name || "rute"}" har ingen andre på holdet`);
      if (d.action === "move_date" && !d.newDate) list.push(`Vælg en ny dato for "${route.name || "rute"}"`);
    }
    return list;
  }, [impact, decisions]);

  const canSubmit = !!employeeId && problems.length === 0 && !commit.isPending;

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

  const candidateLabel = (c: ReturnType<typeof scoreCandidate>) => {
    const name = empById.get(c.employeeId)?.name || "Medarbejder";
    const bits: string[] = [];
    if (c.conflicts > 0) bits.push(`${c.conflicts} tidskonflikt${c.conflicts === 1 ? "" : "er"}`);
    else bits.push("ledig");
    if (c.onCrew) bits.push("på holdet");
    if (c.overCapacity) bits.push("over kapacitet");
    bits.push(`${c.currentLoad} aftaler`);
    return `${name} · ${bits.join(" · ")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Meld medarbejder syg
          </DialogTitle>
          <DialogDescription className="text-xs">
            Vi finder alle aftaler i perioden og foreslår, hvem der kan overtage. Intet ændres, før du bekræfter.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-5">
            {/* Hvem og hvornår */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Medarbejder</Label>
                <Select value={employeeId ?? ""} onValueChange={(v) => { setEmployeeId(v); setDecisions({}); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Vælg medarbejder" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.is_active !== false).map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fra og med</Label>
                <Input type="date" value={from} className="h-9 text-xs"
                  onChange={(e) => { setFrom(e.target.value); setDecisions({}); }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Til og med</Label>
                <Input type="date" value={safeTo} min={from} className="h-9 text-xs"
                  onChange={(e) => { setTo(e.target.value); setDecisions({}); }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Kun i dag", f: today, t: today },
                { label: "I dag + i morgen", f: today, t: addDays(today, 1) },
                { label: "Resten af ugen", f: today, t: addDays(today, 4) },
              ].map((p) => (
                <Button key={p.label} type="button" variant="outline" size="sm" className="h-7 text-[11px]"
                  onClick={() => { setFrom(p.f); setTo(p.t); setDecisions({}); }}>
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Konsekvens */}
            {!employeeId ? (
              <p className="text-xs text-muted-foreground">Vælg en medarbejder for at se konsekvensen.</p>
            ) : impactQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (impact?.routes.length ?? 0) === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border bg-secondary/40 px-3 py-3 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Ingen ruter eller aftaler bliver ramt i perioden. Fraværet registreres bare.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Stat icon={<CalendarDays className="h-3.5 w-3.5" />} value={impact!.routes.length} label="ruter berørt" />
                  <Stat icon={<MapPin className="h-3.5 w-3.5" />} value={impact!.totalStops} label="aftaler skal dækkes" />
                  <Stat
                    icon={<Users className="h-3.5 w-3.5" />}
                    value={employees.filter((e) => e.id !== employeeId && e.is_active !== false && !unavailableIds.has(e.id)).length}
                    label="kolleger tilgængelige"
                  />
                </div>

                <div className="space-y-3">
                  {impact!.routes.map((route) => {
                    const d = decisions[route.id];
                    const cands = candidatesByRoute.get(route.id) || [];
                    const understaffed = route.stops.filter(
                      (s) => (s.required_staff || 1) > s.assignee_ids.length,
                    ).length;
                    return (
                      <div key={route.id} className="rounded-xl border bg-card p-3 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{route.name || "Rute uden navn"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {prettyDate(route.route_date)} · {route.stops.length} aftale{route.stops.length === 1 ? "" : "r"}
                              {route.crewIds.length > 0 && ` · ${route.crewIds.length} anden${route.crewIds.length === 1 ? "" : "re"} på holdet`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {route.isPrimary && <Badge variant="secondary" className="text-[10px]">Ansvarlig</Badge>}
                            {understaffed > 0 && (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">
                                {understaffed} underbemandet
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <Select
                            value={d?.action || "replace"}
                            onValueChange={(v) => setDecision(route.id, { action: v as SickLeaveAction })}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(ACTION_LABEL) as SickLeaveAction[]).map((a) => (
                                <SelectItem key={a} value={a} className="text-xs"
                                  disabled={a === "spread" && route.crewIds.length === 0}>
                                  {ACTION_LABEL[a]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {d?.action === "replace" && (
                            <Select
                              value={d.replacementId || ""}
                              onValueChange={(v) => setDecision(route.id, { replacementId: v })}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vælg afløser" /></SelectTrigger>
                              <SelectContent>
                                {cands.length === 0 && (
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Ingen ledige kolleger</div>
                                )}
                                {cands.map((c) => (
                                  <SelectItem key={c.employeeId} value={c.employeeId} className="text-xs">
                                    {candidateLabel(c)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {d?.action === "move_date" && (
                            <Input
                              type="date"
                              className="h-8 text-xs"
                              value={d.newDate || addDays(safeTo, 1)}
                              onChange={(e) => setDecision(route.id, { newDate: e.target.value })}
                            />
                          )}
                        </div>

                        {route.stops.length > 0 && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {route.stops.slice(0, 3).map((s) => s.customer_name || s.address || "Aftale").join(" · ")}
                            {route.stops.length > 3 && ` +${route.stops.length - 3} mere`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Note (valgfri)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                className="text-xs resize-none" placeholder="Fx: Sygemeldt om morgenen, forventes tilbage mandag" />
            </div>

            {problems.length > 0 && (
              <ul className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 space-y-1">
                {problems.map((p) => (
                  <li key={p} className="text-[11px] text-amber-700 dark:text-amber-400">{p}</li>
                ))}
              </ul>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-5 py-3 border-t flex-row items-center justify-between gap-3 sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            {impact
              ? `Ændrer ${impact.routes.length} rute${impact.routes.length === 1 ? "" : "r"} og ${impact.totalStops} aftale${impact.totalStops === 1 ? "" : "r"}`
              : "Vælg medarbejder og periode"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annullér</Button>
            <Button size="sm" onClick={submit} disabled={!canSubmit}>
              {commit.isPending ? "Gennemfører…" : "Bekræft sygemelding"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Stat = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <div className="rounded-lg border bg-secondary/30 px-3 py-2">
    <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-lg font-semibold text-foreground leading-none">{value}</span></div>
    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);