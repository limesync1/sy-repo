import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  MapPin,
  Navigation2,
  Phone,
  PartyPopper,
  Undo2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDurationMin } from "@/lib/duration-format";
import type { RouteStop } from "@/hooks/useRoutes";

/**
 * Tjekliste-tilstand: den simple måde at køre en rute på.
 *
 * Ingen kort, ingen løbende GPS og ingen talte manøvrer — bare stoppene i
 * rækkefølge med én tydelig handling: "Udført". Det er både markant enklere
 * at bruge på en telefon og stort set gratis strømmæssigt, fordi der ikke
 * kører hverken kort-rendering eller positionssporing i baggrunden.
 */

const hhmm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const m = String(v).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}.${m[2]}` : null;
};

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
}: Props) => {
  const [showDone, setShowDone] = useState(false);

  const completed = useMemo(() => stops.filter((s) => s.status === "completed"), [stops]);
  const remaining = useMemo(() => stops.filter((s) => s.status !== "completed"), [stops]);
  const next = remaining[0];
  const allDone = stops.length > 0 && remaining.length === 0;
  const progress = stops.length > 0 ? (completed.length / stops.length) * 100 : 0;
  const remainingMin = remaining.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const addressOf = (s: RouteStop) => s.full_address || s.address || null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-card">
        <div className="flex h-14 items-center gap-2 px-3">
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-lg">
            <Link to="/medarbejder" aria-label="Tilbage til dagens ruter">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-foreground">{routeName}</h1>
            <p className="text-[11.5px] tabular-nums text-muted-foreground">
              {completed.length} af {stops.length} klaret
              {remaining.length > 0 ? ` · ca. ${formatDurationMin(remainingMin)} tilbage` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-2.5 text-[12.5px]"
            onClick={onSwitchToGuide}
          >
            <Navigation2 className="h-4 w-4" />
            Kort
          </Button>
        </div>
        <div className="h-1.5 w-full bg-secondary" aria-hidden>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: themeColor }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-3 pb-28 pt-4 sm:px-5">
        {allDone ? (
          <section className="rounded-2xl border border-border bg-card p-6 text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <PartyPopper className="h-7 w-7" />
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
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                aria-label="Næste stop"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ background: themeColor }}
                  >
                    {completed.length + 1}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Næste stop
                  </span>
                </div>

                <h2 className="mt-2.5 text-[19px] font-bold leading-tight text-foreground">
                  {next.customer_name || "Stop"}
                </h2>
                {addressOf(next) && (
                  <p className="mt-1 flex items-start gap-1.5 text-[13.5px] leading-6 text-muted-foreground">
                    <MapPin className="mt-1 h-4 w-4 shrink-0" />
                    {addressOf(next)}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
                  {hhmm(next.planned_arrival) && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="h-3.5 w-3.5" />
                      Planlagt {hhmm(next.planned_arrival)}
                    </span>
                  )}
                  {next.duration_minutes > 0 && (
                    <span className="tabular-nums">{formatDurationMin(next.duration_minutes)} på stedet</span>
                  )}
                </div>
                {next.service_summary && (
                  <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-[13px] leading-5 text-foreground">
                    {next.service_summary}
                  </p>
                )}

                <div className="mt-4 grid gap-2">
                  <Button
                    className="h-13 min-h-[52px] w-full gap-2 text-[15px] font-semibold"
                    disabled={locked || pendingId === next.id}
                    onClick={() => onComplete(next)}
                  >
                    {pendingId === next.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    )}
                    Markér som udført
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
              </section>
            )}

            {/* Resten af dagen */}
            {remaining.length > 1 && (
              <section className="mt-5">
                <h3 className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Derefter ({remaining.length - 1})
                </h3>
                <ul className="mt-2 space-y-2">
                  {remaining.slice(1).map((s, i) => (
                    <li key={s.id}>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-muted-foreground">
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
                        {hhmm(s.planned_arrival) && (
                          <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                            {hhmm(s.planned_arrival)}
                          </span>
                        )}
                        {onMoveStop && (
                          <div className="flex shrink-0 flex-col gap-1">
                            <button
                              type="button"
                              aria-label="Flyt stoppet tidligere på ruten"
                              disabled={reordering}
                              onClick={() => onMoveStop(s.id, -1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Flyt stoppet senere på ruten"
                              disabled={reordering || i >= remaining.length - 2}
                              onClick={() => onMoveStop(s.id, 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
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
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-3 text-left"
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
            </button>
            {showDone && (
              <ul className="mt-2 space-y-2">
                {completed.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card/70 px-3 py-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground line-through">
                      {s.customer_name || "Stop"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 gap-1 px-2 text-[12px]"
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
