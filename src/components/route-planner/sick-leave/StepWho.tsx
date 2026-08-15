// Trin 1 — hvem melder sig syg og i hvilken periode.
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/route-planner/DatePickerField";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { Emp, EmpLine, StepHeading, addDays, daysBetween, localDate } from "./shared";
import type { SickLeaveImpact } from "@/hooks/route-planner/useSickLeave";

export type Preset = { label: string; f: string; t: string };

export const buildPresets = (today: string): Preset[] => [
  { label: "I dag", f: today, t: today },
  { label: "I dag + i morgen", f: today, t: addDays(today, 1) },
  { label: "Resten af ugen", f: today, t: addDays(today, 4) },
  { label: "Hele næste uge", f: addDays(today, 7), t: addDays(today, 11) },
];

export default function StepWho({
  employees, employeeId, onEmployeeChange, from, to, onFromChange, onToChange,
  today, impact, loading, alreadyAbsent,
}: {
  employees: Emp[];
  employeeId: string | null;
  onEmployeeChange: (id: string) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  today: string;
  impact?: SickLeaveImpact;
  loading: boolean;
  alreadyAbsent: boolean;
}) {
  const presets = buildPresets(today || localDate());
  const active = presets.find((p) => p.f === from && p.t === to)?.label;
  const days = daysBetween(from, to);
  const sickEmp = employees.find((e) => e.id === employeeId);

  return (
    <div className="space-y-5">
      <StepHeading
        step={1}
        title="Hvem og hvornår"
        description="Vælg medarbejderen og den periode fraværet dækker."
      />

      <div className="space-y-2">
        <Label className="text-xs">Medarbejder</Label>
        <Select value={employeeId ?? ""} onValueChange={onEmployeeChange}>
          <SelectTrigger className="h-11 bg-background text-sm [&>span]:flex [&>span]:min-w-0 [&>span]:items-center">
            {sickEmp ? <EmpLine emp={sickEmp} /> : <SelectValue placeholder="Vælg medarbejder" />}
          </SelectTrigger>
          <SelectContent>
            {employees.filter((e) => e.is_active !== false).map((e) => (
              <SelectItem key={e.id} value={e.id} className="py-2 text-sm">
                <EmpLine emp={e} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {alreadyAbsent && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            Denne medarbejder er allerede registreret fraværende i dele af perioden.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Fraværsperiode</Label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {days} dag{days === 1 ? "" : "e"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Fra og med
            </span>
            <DatePickerField value={from} onChange={onFromChange} />
          </div>
           <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 self-center text-muted-foreground sm:block" />
          <div className="min-w-0 flex-1 space-y-1">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Til og med
            </span>
            <DatePickerField value={to} onChange={onToChange} minDate={from} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { onFromChange(p.f); onToChange(p.t); }}
              className={cn(
                "min-h-8 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                active === p.label
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roligt resumé */}
      {!employeeId ? (
        <p className="text-xs text-muted-foreground">Vælg en medarbejder for at se konsekvensen.</p>
      ) : loading ? (
        <Skeleton className="h-11 w-full rounded-lg" />
      ) : (impact?.routes.length ?? 0) === 0 ? (
         <div className="flex items-center gap-2 rounded-md border bg-secondary/30 px-3 py-3 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          Ingen ruter eller aftaler bliver ramt. Fraværet registreres bare.
        </div>
      ) : (
         <div className="flex items-center gap-2 rounded-md border bg-secondary/30 px-3 py-3 text-xs">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="tabular-nums">
            {days} dag{days === 1 ? "" : "e"} · {impact!.routes.length} rute
            {impact!.routes.length === 1 ? "" : "r"} · {impact!.totalStops} aftale
            {impact!.totalStops === 1 ? "" : "r"} berørt
          </span>
        </div>
      )}
    </div>
  );
}
