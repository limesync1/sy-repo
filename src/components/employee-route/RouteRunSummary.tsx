import { Info, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";
import { formatClockTime, formatRunDuration } from "./route-run-clock";

type Props = {
  count: number; startedAt: number | null; finishedAt: number | null;
  customerSeconds: number; driveEstimateSeconds: number | null;
  loading?: boolean; error?: boolean; pending?: boolean;
  onBack: () => void; onUndo?: () => void; onInfo?: () => void;
};

export function RouteRunSummary({ count, startedAt, finishedAt, customerSeconds, driveEstimateSeconds, loading, error, pending, onBack, onUndo, onInfo }: Props) {
  return <section className="space-y-4 p-4 text-foreground" aria-label="Ruteoversigt">
    <div className="flex items-center gap-3">
      <BrandedIllustration name="routeDone" className="h-12 w-12 shrink-0" />
      <div><h2 className="text-lg font-semibold">Ruteoversigt</h2><p className="text-sm text-muted-foreground">Alle {count} stop er udført</p></div>
    </div>
    <dl className="grid grid-cols-3 gap-2 border-y border-border py-3 text-left">
      <div><dt className="text-xs text-muted-foreground">Stop</dt><dd className="mt-1 text-base font-semibold tabular-nums">{count}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Køretid · estimat</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{loading ? "Henter…" : error || driveEstimateSeconds == null ? "Ikke registreret" : formatRunDuration(driveEstimateSeconds)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Hos kunderne</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{loading ? "Henter…" : error ? "Ikke tilgængelig" : formatRunDuration(customerSeconds)}</dd></div>
    </dl>
    <p className="flex flex-wrap gap-x-4 text-xs text-muted-foreground"><span>Start <b className="text-foreground">{startedAt ? formatClockTime(startedAt) : "Ikke registreret"}</b></span><span>Slut <b className="text-foreground">{finishedAt ? formatClockTime(finishedAt) : "Ikke registreret"}</b></span></p>
    {error && <p role="alert" className="text-sm text-destructive">Tidsregistrering kunne ikke hentes. Prøv at åbne ruten igen.</p>}
    <div className="flex flex-wrap gap-2">
      {onInfo && <Button variant="outline" className="h-11 gap-2" onClick={onInfo}><Info className="h-4 w-4" />Stopoplysninger</Button>}
      {onUndo && <Button variant="undo" className="h-11 gap-2" disabled={pending} onClick={onUndo}><Undo2 className="h-4 w-4" />Fortryd udførsel</Button>}
    </div>
    <Button className="h-11 w-full" onClick={onBack}>Til dagens ruter</Button>
  </section>;
}