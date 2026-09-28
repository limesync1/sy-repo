import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Navigation2,
  Phone,
  Undo2,
  Loader2,
  BellRing,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStartStopTime, useStopTimeEntries, type RouteStop } from "@/hooks/useRoutes";
import { useMyEmployeeId } from "@/hooks/useMyEmployee";
import { stripPrices } from "@/lib/employee-display";

/**
 * Tjekliste-tilstand: den simple måde at køre en rute på.
 *
 * Ingen kort, ingen løbende GPS og ingen talte manøvrer — bare stoppene i
 * rækkefølge med én tydelig handling: "Udført". Det er både markant enklere
 * at bruge på en telefon og stort set gratis strømmæssigt, fordi der ikke
 * kører hverken kort-rendering eller positionssporing i baggrunden.
 */

type Props = {
  routeName: string;
  themeColor: string;
  stops: RouteStop[];
  /** Stop-id der lige nu gemmes — bruges til at vise spinner på knappen. */
  pendingId: string | null;
  locked: boolean;
  onComplete: (stop: RouteStop) => void;
  onUndo: (stop: RouteStop) => void;
  onNavigate: (stop: RouteStop) => void;
  onSwitchToGuide: () => void;
  onFinish: () => void;
  /** Flyt et stop op/ned i rækkefølgen mens man kører. */
  onMoveStop?: (stopId: string, dir: -1 | 1) => void;
  reordering?: boolean;
  notification?: { title: string; message: string } | null;
  onMarkNotificationRead?: () => void;
};

export const RouteChecklistView = ({
  routeName,
  themeColor,
  stops,
  pendingId,
  locked,
  onComplete,
  onUndo,
  onNavigate,
  onSwitchToGuide,
  onFinish,
  onMoveStop,
  reordering = false,
  notification = null,
  onMarkNotificationRead,
}: Props) => {
  const [showDone, setShowDone] = useState(false);
  const employeeId = useMyEmployeeId();
  const { data: timeEntries = [] } = useStopTimeEntries(stops.map((stop) => stop.id));
  const startStopTime = useStartStopTime();
  const completed = useMemo(() => stops.filter((s) => s.status === "completed"), [stops]);
  const remaining = useMemo(() => stops.filter((s) => s.status !== "completed"), [stops]);
  const next = remaining[0];
  const nextIsStarted = !!next && timeEntries.some((entry) => entry.stop_id === next.id && entry.employee_id === employeeId && !entry.ended_at);
  const allDone = stops.length > 0 && remaining.length === 0;
  const progress = stops.length > 0 ? (completed.length / stops.length) * 100 : 0;

  const addressOf = (s: RouteStop) => s.full_address || s.address || null;

  return (
    <div className="employee-route-run flex min-h-dvh flex-col bg-secondary/35">
      {/* Header */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-card text-foreground shadow-sm">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-2 sm:px-5">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-md">
            <Link to="/medarbejder" aria-label="Tilbage til dagens ruter">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-bold text-foreground">{routeName}</h1>
            <p className="text-[11.5px] tabular-nums text-muted-foreground">
              {completed.length} af {stops.length} klaret
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 shrink-0 gap-1.5 border border-beige-foreground/15 bg-beige px-3 text-[12.5px] font-semibold text-beige-foreground hover:bg-beige/80"
            onClick={onSwitchToGuide}
          >
            <Navigation2 className="h-4 w-4" />
            Vis kort
          </Button>
        </div>
        <div className="h-1 w-full bg-secondary" aria-hidden>
          <div
            className="h-full transition-all duration-500 ease-out bg-accent"
            style={{ width: `${progress}%`, background: themeColor }}
          />
        </div>
      </header>

      {notification && (
        <div className="border-b border-destructive/25 bg-destructive/5 px-3 py-2.5">
          <div className="mx-auto flex max-w-2xl items-start gap-2.5">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase text-destructive">{notification.title}</p>
              <p className="mt-0.5 text-xs font-medium leading-relaxed text-foreground">{notification.message}</p>
            </div>
            {onMarkNotificationRead && (
              <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs" onClick={onMarkNotificationRead}>Markér som læst</Button>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 px-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-5 sm:pt-5">
        {allDone ? (
          <section className="rounded-md border border-border bg-card p-6 text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-md bg-success/10 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-xl font-bold text-foreground">Ruten er kørt færdig</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Du klarede alle {stops.length} stop. Godt gået.
            </p>
            <Button className="mt-5 h-12 w-full text-[15px]" onClick={onFinish}>
              Tilbage til dagens ruter
            </Button>
          </section>
        ) : (
          <>
            {/* Næste stop — det eneste der fylder */}
            {next && (
              <section
                className="overflow-hidden rounded-[5px] border border-border bg-card shadow-sm"
                aria-label="Næste stop"
              >
                <div className="flex items-center gap-2 border-b border-border bg-secondary/45 px-3 py-2 text-foreground">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-accent text-[11px] font-bold text-accent-foreground"
                  >
                    {completed.length + 1}
                  </span>
                  <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Næste stop
                  </span>
                </div>
                <div className="p-3 sm:p-4">
                <h2 className="text-[18px] font-semibold leading-tight text-foreground">
                  {next.customer_name || "Stop"}
                </h2>
                {addressOf(next) && (
                  <p className="mt-1 flex items-start gap-1.5 text-[13.5px] leading-6 text-muted-foreground">
                    <MapPin className="mt-1 h-4 w-4 shrink-0" />
                    {addressOf(next)}
                  </p>
                )}
                {next.service_summary && stripPrices(next.service_summary) && (
                  <p className="mt-2 rounded-[4px] bg-secondary/60 px-3 py-2 text-[13px] leading-5 text-foreground">
                    {stripPrices(next.service_summary)}
                  </p>
                )}

                <div className="mt-3 grid gap-2">
                  {!nextIsStarted && (
                    <Button
                      type="button"
                      className="min-h-11 w-full gap-2 bg-warning font-semibold text-warning-foreground hover:bg-warning/90"
                      disabled={!employeeId || locked || startStopTime.isPending}
                      onClick={() => employeeId && startStopTime.mutate({ stop_id: next.id, employee_id: employeeId })}
                    >
                      {startStopTime.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Start aftale
                    </Button>
                  )}
                  <Button
                    className="h-13 min-h-[52px] w-full gap-2 bg-success text-[15px] font-semibold text-success-foreground hover:bg-success/90"
                    disabled={locked || pendingId === next.id}
                    onClick={() => onComplete(next)}
                  >
                    {pendingId === next.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    )}
                    {nextIsStarted ? "Aftale udført" : "Markér som udført"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-11 gap-2"
                      onClick={() => onNavigate(next)}
                    >
                      <Navigation2 className="h-4 w-4" />
                      Kør dertil
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 gap-2"
                      disabled={!next.customer_phone}
                      asChild={!!next.customer_phone}
                    >
                      {next.customer_phone ? (
                        <a href={`tel:${next.customer_phone}`}>
                          <Phone className="h-4 w-4" />
                          Ring
                        </a>
                      ) : (
                        <span>
                          <Phone className="h-4 w-4" />
                          Intet nr.
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
                {locked && (
                  <p className="mt-2 text-center text-[12px] text-muted-foreground">
                    Ruten kan først udføres på selve dagen.
                  </p>
                )}
                </div>
              </section>
            )}

            {/* Resten af dagen */}
             {remaining.length > 1 && (
               <section className="mt-4">
                <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Derefter ({remaining.length - 1})
                </h3>
                <ul className="mt-2 space-y-2">
                  {remaining.slice(1).map((s, i) => (
                    <li key={s.id}>
                         <div className="flex min-h-14 items-center gap-2.5 rounded-[5px] border border-border bg-card px-2.5 py-2 shadow-sm transition-colors hover:border-accent/25 hover:bg-secondary/25">
                         <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-secondary text-[12px] font-semibold text-muted-foreground">
                          {completed.length + i + 2}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-foreground">
                            {s.customer_name || "Stop"}
                          </p>
                          {addressOf(s) && (
                            <p className="truncate text-[12px] text-muted-foreground">{addressOf(s)}</p>
                          )}
                        </div>
                        {onMoveStop && (
                           <div className="flex shrink-0 gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              type="button"
                              aria-label="Flyt stoppet tidligere på ruten"
                              disabled={reordering}
                              onClick={() => onMoveStop(s.id, -1)}
                               className="h-10 w-10 rounded-[4px] text-muted-foreground hover:text-foreground"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              type="button"
                              aria-label="Flyt stoppet senere på ruten"
                              disabled={reordering || i >= remaining.length - 2}
                              onClick={() => onMoveStop(s.id, 1)}
                               className="h-10 w-10 rounded-[4px] text-muted-foreground hover:text-foreground"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {/* Udførte stop */}
        {completed.length > 0 && (
          <section className="mt-5">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              className="h-auto w-full justify-between rounded-md bg-card px-3 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-[13.5px] font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {completed.length} udført
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showDone && "rotate-180",
                )}
              />
            </Button>
            {showDone && (
              <ul className="mt-2 space-y-2">
                {completed.map((s) => (
                  <li
                    key={s.id}
                     className="flex items-center gap-3 rounded-md border border-border bg-card/70 px-3 py-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground line-through">
                      {s.customer_name || "Stop"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 gap-1 border-destructive/30 px-2 text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onUndo(s)}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Fortryd
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default RouteChecklistView;
