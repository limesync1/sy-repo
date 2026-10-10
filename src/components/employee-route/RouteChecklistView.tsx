import { EmployeeStopActions } from "@/components/employee/EmployeeStopActions";
import { useOrderForStop } from "@/hooks/useRoutes";
import { Moon, Sun } from "lucide-react";
import { formatClockTime, formatRunDuration, readArrival, readArrivalEstimate } from "./route-run-clock";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  MapPin,
  Navigation2,
  Phone,
  Undo2,
  Loader2,
  BellRing,
  Play,
  Volume2,
  VolumeX,
  Map as MapIcon,
  Info,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/components/ConfirmDialogHost";
import { cn } from "@/lib/utils";
import { useStartStopTime, useStopTimeEntries, type RouteStop } from "@/hooks/useRoutes";
import { useMyEmployeeId } from "@/hooks/useMyEmployee";
import { stripPrices } from "@/lib/employee-display";
import { playStartChime, unlockAudio } from "@/lib/employee-audio";

/**
 * Tjekliste-tilstand: den simple måde at køre en rute på.
 *
 * Ingen kort og ingen løbende GPS. Ét tydeligt "nu"-kort med én primær
 * handling ad gangen (Start aftale → Aftale udført) og en samlet tidslinje
 * over hele dagen. På computer står nu-kortet til venstre og tidslinjen til
 * højre; på mobil står de under hinanden.
 */

type Props = {
  routeId?: string;
  routeName: string;
  themeColor: string;
  stops: RouteStop[];
  pendingId: string | null;
  locked: boolean;
  onComplete: (stop: RouteStop) => void;
  onUndo: (stop: RouteStop) => void;
  onNavigate: (stop: RouteStop) => void;
  onOpenDetails: (stop: RouteStop) => void;
  routeDate?: string | null;
  onSwitchToGuide: () => void;
  onFinish: () => void;
  onMoveStop?: (stopId: string, dir: -1 | 1) => void;
  reordering?: boolean;
  notification?: { title: string; message: string } | null;
  onMarkNotificationRead?: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  startedAt?: number | null;
  etaLabel?: string | null;
  arrivalLabel?: string | null;
  driveEstimateSeconds?: number | null;
  summary?: ReactNode;
  weather?: ReactNode;
  night: boolean;
  onToggleNight: () => void;
};

const formatElapsed = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, "0")).join(":");
};

export const RouteChecklistView = ({
  routeId,
  routeName,
  stops,
  pendingId,
  locked,
  onComplete,
  onUndo,
  onNavigate,
  onOpenDetails,
  routeDate,
  onSwitchToGuide,
  onFinish,
  onMoveStop,
  reordering = false,
  notification = null,
  onMarkNotificationRead,
  audioEnabled,
  onToggleAudio,
  startedAt = null,
  etaLabel = null,
  arrivalLabel = null,
  driveEstimateSeconds = null,
  summary,
  weather,
  night,
  onToggleNight,
}: Props) => {
  const employeeId = useMyEmployeeId();
  const { data: timeEntries = [] } = useStopTimeEntries(stops.map((stop) => stop.id));
  const startStopTime = useStartStopTime();
  const [now, setNow] = useState(() => Date.now());
  const completed = useMemo(() => stops.filter((s) => s.status === "completed"), [stops]);
  const remaining = useMemo(() => stops.filter((s) => s.status !== "completed"), [stops]);
  const next = remaining[0];
  const activeEntry = timeEntries.find((entry) => entry.employee_id === employeeId && !entry.ended_at);
  const activeStop = activeEntry ? stops.find((stop) => stop.id === activeEntry.stop_id) : undefined;
  const activeNextEntry = activeEntry?.stop_id === next?.id ? activeEntry : undefined;
  const nextIsStarted = !!activeNextEntry;
  const elapsedSeconds = activeEntry
    ? Math.max(0, Math.floor((now - new Date(activeEntry.started_at).getTime()) / 1000))
    : 0;
  const allDone = stops.length > 0 && remaining.length === 0;
  const progress = stops.length > 0 ? (completed.length / stops.length) * 100 : 0;
  const nextNumber = next ? stops.findIndex((s) => s.id === next.id) + 1 : 0;

  const addressOf = (s: RouteStop) => s.full_address || s.address || null;

  useEffect(() => {
    if (!activeEntry && !startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), activeEntry ? 1000 : 15_000);
    return () => window.clearInterval(timer);
  }, [activeEntry?.id, startedAt]);

  const startNext = async () => {
    if (!employeeId || !next) return;
    unlockAudio();
    try {
      await startStopTime.mutateAsync({ stop_id: next.id, employee_id: employeeId });
      if (audioEnabled) playStartChime();
    } catch { /* mutation shows the actionable error and rolls back */ }
  };

  const remainingIds = remaining.map((s) => s.id);

  return (
    <div className={cn("employee-route-run flex min-h-dvh flex-col bg-secondary/40 text-foreground", night && "dark route-night bg-background")}>
      {/* Topbjælke */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-1.5 px-2 sm:gap-2 sm:px-5">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0">
            <Link to="/medarbejder" aria-label="Tilbage til dagens ruter">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-foreground">{routeName}</h1>
            <p className="truncate text-xs tabular-nums text-muted-foreground">
              {completed.length}/{stops.length} udført
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-10 shrink-0 gap-1.5 px-3" onClick={onSwitchToGuide} aria-label="Skift til kortvisning">
            <MapIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Kortvisning</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onToggleNight} aria-label={night ? "Skift til lys visning" : "Skift til mørk visning"} aria-pressed={night}>
            {night ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onToggleAudio} aria-label={audioEnabled ? "Slå lyd fra" : "Slå lyd til"} aria-pressed={!audioEnabled}>
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
        <div className="h-1 w-full bg-secondary" aria-hidden>
          <div className="h-full bg-accent transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto min-w-0 w-full max-w-5xl flex-1 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pt-5">
        {weather && <div className="mb-3">{weather}</div>}
        {activeEntry && activeStop && activeStop.id !== next?.id && (
          <div className="mb-3 flex items-center gap-3 rounded-md border border-warning/35 bg-warning/10 p-3 text-sm" role="status">
            <Clock className="h-4 w-4 shrink-0 text-warning" />
            <p className="min-w-0 flex-1">Tid registreres stadig hos <strong>{activeStop.customer_name || "forrige stop"}</strong> · <span className="font-mono tabular-nums">{formatElapsed(elapsedSeconds)}</span>. Når du starter næste aftale, afsluttes den automatisk.</p>
          </div>
        )}
        {!allDone && <p className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span>Start <b className="text-foreground">{startedAt ? formatClockTime(startedAt) : "—"}</b></span>
          <span>Køretid · ca. <b className="text-foreground">{driveEstimateSeconds == null ? "—" : formatRunDuration(driveEstimateSeconds)}</b></span>
          <span>{arrivalLabel ? "Ankommet" : "Ankomst · ca."} <b className="text-foreground">{arrivalLabel ?? etaLabel ?? "—"}</b></span>
        </p>}
        {notification && (
          <div className="mb-3 flex items-start gap-3 rounded-md border border-destructive/25 bg-card p-3 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <BellRing className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-destructive">{notification.title}</p>
              <p className="mt-0.5 text-sm leading-snug text-foreground">{notification.message}</p>
            </div>
            {onMarkNotificationRead && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onMarkNotificationRead} aria-label="Markér som læst">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
          {/* Nu-kort */}
          <div className="min-w-0 lg:sticky lg:top-[4.75rem]">
            {allDone ? (
              <section className="service-panel-card rounded-md border border-border bg-card shadow-sm">{summary ?? <Button onClick={onFinish}>Til dagens ruter</Button>}</section>
            ) : next ? (
              <section className="service-panel-card overflow-hidden rounded-md border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {nextIsStarted ? "I gang nu" : "Næste stop"}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                    Stop {nextNumber} af {stops.length}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-card text-base font-bold tabular-nums text-foreground">
                      {nextNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-xl font-semibold leading-tight text-foreground">{next.customer_name || "Stop"}</h2>
                      {addressOf(next) && (
                        <p className="mt-1 flex items-start gap-1.5 text-sm leading-snug text-muted-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="min-w-0 break-words">{addressOf(next)}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {next.service_summary && stripPrices(next.service_summary) && (
                    <p className="mt-3 rounded-md bg-secondary/70 px-3 py-2.5 text-sm leading-snug text-foreground">
                      {stripPrices(next.service_summary)}
                    </p>
                  )}

                  {nextIsStarted && (
                    <div className="mt-3 flex items-center justify-between rounded-md border border-success/25 bg-success/10 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-success">
                        <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                        Tid registreres
                      </span>
                      <span className="shrink-0 font-mono text-base font-semibold tabular-nums text-foreground sm:text-xl">{formatElapsed(elapsedSeconds)}</span>
                    </div>
                  )}

                  <div className="mt-3 grid gap-2">
                    {nextIsStarted ? (
                      <Button
                        variant="complete" className="h-12 w-full gap-2 text-base font-semibold"
                        disabled={locked || pendingId === next.id}
                        onClick={() => onComplete(next)}
                      >
                        {pendingId === next.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                        Aftale udført
                      </Button>
                    ) : (
                      <Button
                        className="h-12 w-full gap-2 text-base font-semibold"
                        disabled={!employeeId || locked || startStopTime.isPending}
                        onClick={() => void startNext()}
                      >
                        {startStopTime.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                        Start aftale
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-11 gap-2" onClick={() => onNavigate(next)}>
                        <Navigation2 className="h-4 w-4" />
                        Vis vej
                      </Button>
                      <Button variant="outline" className="h-11 gap-2" onClick={() => onOpenDetails(next)}>
                        <Info className="h-4 w-4" />
                        Oplysninger
                      </Button>
                      <div className="col-span-2 min-w-0"><ChecklistStopActions stop={next} routeDate={routeDate} /></div>
                      {next.customer_phone ? <Button variant="outline" className="col-span-2 h-11 gap-2" asChild>
                        <a href={`tel:${next.customer_phone}`}><Phone className="h-4 w-4" />Ring til kunden</a>
                      </Button> : null}
                    </div>
                    {!nextIsStarted && (
                      <Button
                        variant="ghost"
                        className="h-auto min-h-11 w-full justify-start gap-3 whitespace-normal border border-dashed border-border px-3 py-2 text-left text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        disabled={locked || pendingId === next.id}
                        onClick={async () => {
                          const confirmed = await askConfirm({ title: "Udfør uden registreret tid?", description: "Brug kun dette, hvis arbejdet ikke skal have en start- og sluttid. Manuel tidsregistrering er standard.", confirmLabel: "Markér udført uden tid", cancelLabel: "Tilbage" });
                          if (confirmed) onComplete(next);
                        }}
                      >
                        <Check className="h-4 w-4 shrink-0" />
                        <span><span className="block text-sm font-medium">Udfør uden registreret tid</span><span className="block text-xs">Ingen arbejdstid gemmes.</span></span>
                      </Button>
                    )}
                  </div>
                  {locked && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">Ruten kan først udføres på selve dagen.</p>
                  )}
                </div>
              </section>
            ) : null}
          </div>

          {/* Tidslinje over hele dagen */}
          <section className="service-panel-card rounded-md border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-semibold text-foreground">Dagens stop</h3>
              <span className="text-xs tabular-nums text-muted-foreground">{remaining.length} tilbage</span>
            </div>
            <ol className="relative px-2 py-2">
              {stops.map((s, i) => {
                const done = s.status === "completed";
                const current = next?.id === s.id;
                const arrived = routeId ? readArrival(routeId, s.id) : null;
                const expected = routeId ? readArrivalEstimate(routeId, s.id, now) : null;
                const remIdx = remainingIds.indexOf(s.id);
                const canMove = !!onMoveStop && !done && !current;
                return (
                  <li key={s.id} className="relative">
                    {i < stops.length - 1 && (
                      <span className="absolute left-[1.6rem] top-10 bottom-0 w-px bg-border" aria-hidden />
                    )}
                    <div className={cn("relative flex items-center gap-3 rounded-md px-2 py-2", current && "bg-accent/[0.07]")}>
                      <span
                        className={cn(
                          "relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                          done && "border-success bg-success text-success-foreground",
                          current && "border-2 border-accent bg-card text-foreground",
                          !done && !current && "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-medium", done ? "text-muted-foreground" : "text-foreground")}>
                          {s.customer_name || "Stop"}
                        </p>
                        {done && s.completed_at ? (
                          <p className="truncate text-xs tabular-nums text-success">Udført kl. {formatClockTime(new Date(s.completed_at).getTime())}</p>
                        ) : addressOf(s) ? (
                          <p className="truncate text-xs text-muted-foreground">{addressOf(s)}</p>
                        ) : null}
                        {(arrived || (current && expected)) && <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {arrived ? "Ankommet" : "Ankomst · ca."} <b className="text-foreground">{formatClockTime(arrived ?? expected ?? now)}</b>
                        </p>}
                      </div>
                      {done && (
                        <Button
                          variant="undo"
                          size="sm"
                          className="h-auto min-h-10 max-w-[136px] shrink-0 gap-1.5 whitespace-normal px-2 py-2 text-xs font-medium"
                          onClick={() => onUndo(s)}
                          aria-label={`Fortryd udførsel af ${s.customer_name || "stop"}`}
                        >
                          <Undo2 className="h-4 w-4" />
                          Fortryd udførsel
                        </Button>
                      )}
                      {!done && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => onOpenDetails(s)}
                          aria-label={`Åbn oplysninger for ${s.customer_name || "stoppet"}`}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      )}
                      {current && <span className="hidden shrink-0 text-xs font-semibold text-accent sm:inline">Nu</span>}
                      {canMove && (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Flyt stoppet tidligere"
                            disabled={reordering || remIdx <= 1}
                            onClick={() => onMoveStop?.(s.id, -1)}
                            className="h-11 w-11 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Flyt stoppet senere"
                            disabled={reordering || remIdx >= remaining.length - 1}
                            onClick={() => onMoveStop?.(s.id, 1)}
                            className="h-11 w-11 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
};

export default RouteChecklistView;

function ChecklistStopActions({ stop, routeDate }: { stop: RouteStop; routeDate?: string | null }) {
  const { data: order } = useOrderForStop(stop.order_id ?? null);
  return <EmployeeStopActions stopId={stop.id} order={order ?? null} completed={stop.status === "completed"} noteOnly={!order} routeDate={routeDate ?? null} />;
}
