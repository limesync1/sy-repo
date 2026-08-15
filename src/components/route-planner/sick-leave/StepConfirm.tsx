// Trin 3 — klartekst-opsummering, note og eventuelle mangler.
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { RouteDecision, SickLeaveImpact } from "@/hooks/route-planner/useSickLeave";
import { Emp, StepHeading, daysBetween, prettyDate, shortDate } from "./shared";

const describe = (
  d: RouteDecision | undefined,
  routeName: string,
  stops: number,
  empById: Map<string, Emp>,
) => {
  if (!d) return "Ingen løsning valgt";
  const aftaler = `${stops} aftale${stops === 1 ? "" : "r"}`;
  switch (d.action) {
    case "replace": {
      const name = d.replacementId ? empById.get(d.replacementId)?.name : null;
      return name ? `${name} overtager ${aftaler}` : "Afløser mangler";
    }
    case "spread":
      return `${aftaler} fordeles på resten af holdet`;
    case "unassign":
      return `${aftaler} frigives uden tildelt medarbejder`;
    case "move_date":
      return d.newDate ? `Hele ruten flyttes til ${shortDate(d.newDate)}` : "Ny dato mangler";
  }
};

export default function StepConfirm({
  impact, decisions, empById, employeeName, from, to, note, onNoteChange, problems,
}: {
  impact?: SickLeaveImpact;
  decisions: Record<string, RouteDecision>;
  empById: Map<string, Emp>;
  employeeName: string;
  from: string;
  to: string;
  note: string;
  onNoteChange: (v: string) => void;
  problems: string[];
}) {
  const days = daysBetween(from, to);
  const routes = impact?.routes || [];

  return (
    <div className="space-y-4">
      <StepHeading
        step={3}
        title="Bekræft sygemelding"
        description="Tjek konsekvensen igennem. Intet ændres før du bekræfter."
      />

      <div className="rounded-lg border bg-secondary/30 p-3.5">
        <p className="text-sm font-semibold">{employeeName}</p>
        <p className="text-[11px] text-muted-foreground">
          Syg {prettyDate(from)}
          {from !== to && ` — ${prettyDate(to)}`} · {days} dag{days === 1 ? "" : "e"}
        </p>
      </div>

      {routes.length === 0 ? (
         <div className="flex items-center gap-2 rounded-lg border bg-secondary/30 px-3 py-3 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          Ingen aftaler berøres — fraværet registreres blot i kalenderen.
        </div>
      ) : (
         <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {routes.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5 px-3 py-2.5">
              <span className="text-xs font-medium">
                {shortDate(r.route_date)} — {r.name || "Rute uden navn"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {describe(decisions[r.id], r.name || "rute", r.stops.length, empById)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Note (valgfri)</Label>
        <Textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={2}
          className="resize-none bg-card text-xs"
          placeholder="Fx: Sygemeldt om morgenen, forventes tilbage mandag"
        />
      </div>

      {problems.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2">
          {problems.map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
