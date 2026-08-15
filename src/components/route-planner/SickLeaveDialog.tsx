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
import { SheetHeaderBlock } from "@/components/route-planner/SheetSection";
import { EmployeeAvatars } from "@/components/route-planner/EmployeeAvatars";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, MapPin, Users, Thermometer,
} from "lucide-react";
import {
  useSickLeaveImpact, useCommitSickLeave, scoreCandidate, sortCandidates,
  type RouteDecision, type SickLeaveAction,
} from "@/hooks/route-planner/useSickLeave";
import { useEmployeeAbsences } from "@/hooks/useEmployeeAbsences";

type Emp = {
  id: string;
  name: string;
  is_active?: boolean;
  max_stops_per_day?: number | null;
  avatar_url?: string | null;
  color?: string | null;
};

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
const daysBetween = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000) + 1);

const ACTION_LABEL: Record<SickLeaveAction, string> = {
  replace: "Erstat med kollega",
  spread: "Fordel på resten af holdet",
  unassign: "Frigiv aftalerne (ingen tildelt)",
  move_date: "Flyt hele ruten til en anden dato",
};

/** Lille avatar + navn, bruges i dropdowns. */
const EmpOption = ({ emp, trailing }: { emp?: Emp; trailing?: React.ReactNode }) => (
  <span className="flex items-center gap-2 min-w-0">
    <EmployeeAvatars
      employees={emp ? [{ id: emp.id, name: emp.name, avatar_url: emp.avatar_url, color: emp.color }] : []}
      size={22}
      max={1}
    />
    <span className="truncate font-medium">{emp?.name || "Medarbejder"}</span>
    {trailing}
  </span>
);

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

  const presets = [
    { label: "I dag", f: today, t: today },
    { label: "I dag + i morgen", f: today, t: addDays(today, 1) },
    { label: "Resten af ugen", f: today, t: addDays(today, 4) },
  ];
  const activePreset = presets.find((p) => p.f === from && p.t === safeTo)?.label;
  const dayCount = daysBetween(from, safeTo);

  const availableCount = employees.filter(
    (e) => e.id !== employeeId && e.is_active !== false && !unavailableIds.has(e.id),
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-5 py-4 pr-12 border-b shrink-0 space-y-0 text-left">
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
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 bg-secondary/20">
          <div className="px-4 sm:px-5 py-4 space-y-4">
            {/* 1 — Hvem og hvornår */}
            <section className="rounded-xl border bg-card p-3 sm:p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">1</span>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hvem og hvornår</h3>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Medarbejder</Label>
                <Select value={employeeId ?? ""} onValueChange={(v) => { setEmployeeId(v); setDecisions({}); }}>
                  <SelectTrigger className="h-11 text-sm">
                    {sickEmp ? <EmpOption emp={sickEmp} /> : <SelectValue placeholder="Vælg medarbejder" />}
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.is_active !== false).map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-sm py-2">
                        <EmpOption emp={e} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Periode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Fraværsperiode</Label>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {dayCount} dag{dayCount === 1 ? "" : "e"}
                  </span>
                </div>
                <div className="rounded-lg border bg-secondary/30 p-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="flex-1 rounded-md border bg-card px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-ring/40">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Fra og med</span>
                      <input
                        type="date"
                        value={from}
                        onChange={(e) => { setFrom(e.target.value); setDecisions({}); }}
                        className="w-full bg-transparent text-sm font-medium outline-none tabular-nums"
                      />
                    </label>
                    <ArrowRight className="hidden sm:block h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <label className="flex-1 rounded-md border bg-card px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-ring/40">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Til og med</span>
                      <input
                        type="date"
                        value={safeTo}
                        min={from}
                        onChange={(e) => { setTo(e.target.value); setDecisions({}); }}
                        className="w-full bg-transparent text-sm font-medium outline-none tabular-nums"
                      />
                    </label>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => { setFrom(p.f); setTo(p.t); setDecisions({}); }}
                        className={cn(
                          "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                          activePreset === p.label
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 2 — Konsekvens */}
            {!employeeId ? (
              <p className="text-xs text-muted-foreground px-1">Vælg en medarbejder for at se konsekvensen.</p>
            ) : impactQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (impact?.routes.length ?? 0) === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-3 text-xs shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                Ingen ruter eller aftaler bliver ramt i perioden. Fraværet registreres bare.
              </div>
            ) : (
              <section className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Stat icon={<CalendarDays className="h-3.5 w-3.5" />} value={impact!.routes.length} label="ruter berørt" />
                  <Stat icon={<MapPin className="h-3.5 w-3.5" />} value={impact!.totalStops} label="aftaler skal dækkes" />
                  <Stat icon={<Users className="h-3.5 w-3.5" />} value={availableCount} label="kolleger tilgængelige" />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">2</span>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sådan dækkes aftalerne</h3>
                </div>

                <div className="space-y-2.5">
                  {impact!.routes.map((route) => {
                    const d = decisions[route.id];
                    const cands = candidatesByRoute.get(route.id) || [];
                    const best = cands[0];
                    const understaffed = route.stops.filter(
                      (s) => (s.required_staff || 1) > s.assignee_ids.length,
                    ).length;
                    const crew = route.crewIds
                      .map((id) => empById.get(id))
                      .filter(Boolean)
                      .map((e) => ({ id: e!.id, name: e!.name, avatar_url: e!.avatar_url, color: e!.color }));
                    return (
                      <div key={route.id} className="rounded-xl border bg-card p-3 space-y-2.5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{route.name || "Rute uden navn"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {prettyDate(route.route_date)} · {route.stops.length} aftale{route.stops.length === 1 ? "" : "r"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {crew.length > 0 && <EmployeeAvatars employees={crew} size={20} max={3} />}
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
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
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
                              <SelectTrigger className="h-9 text-xs">
                                {d.replacementId
                                  ? <EmpOption emp={empById.get(d.replacementId)} />
                                  : <SelectValue placeholder="Vælg afløser" />}
                              </SelectTrigger>
                              <SelectContent>
                                {cands.length === 0 && (
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Ingen ledige kolleger</div>
                                )}
                                {cands.map((c) => (
                                  <SelectItem key={c.employeeId} value={c.employeeId} className="text-xs py-2">
                                    <EmpOption
                                      emp={empById.get(c.employeeId)}
                                      trailing={
                                        <span className="flex items-center gap-1 ml-1 shrink-0">
                                          {c.conflicts > 0 ? (
                                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">
                                              {c.conflicts} konflikt{c.conflicts === 1 ? "" : "er"}
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">Ledig</Badge>
                                          )}
                                          {c.onCrew && <Badge variant="secondary" className="text-[10px]">På holdet</Badge>}
                                          {c.overCapacity && (
                                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">Over kapacitet</Badge>
                                          )}
                                          <span className="text-[10px] text-muted-foreground tabular-nums">{c.currentLoad} aftaler</span>
                                        </span>
                                      }
                                    />
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {d?.action === "move_date" && (
                            <Input
                              type="date"
                              className="h-9 text-xs"
                              value={d.newDate || addDays(safeTo, 1)}
                              onChange={(e) => setDecision(route.id, { newDate: e.target.value })}
                            />
                          )}
                        </div>

                        {d?.action === "replace" && best && d.replacementId === best.employeeId && best.conflicts === 0 && (
                          <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Foreslået automatisk — ingen tidskonflikter
                          </p>
                        )}

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
              </section>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Note (valgfri)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                className="text-xs resize-none bg-card" placeholder="Fx: Sygemeldt om morgenen, forventes tilbage mandag" />
            </div>

            {problems.length > 0 && (
              <ul className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 space-y-1">
                {problems.map((p) => (
                  <li key={p} className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-4 sm:px-5 py-3 border-t shrink-0 flex-row items-center justify-between gap-3 sm:justify-between bg-background">
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
  <div className="rounded-xl border bg-card px-3 py-2 shadow-sm">
    <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-lg font-semibold text-foreground leading-none tabular-nums">{value}</span></div>
    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);
