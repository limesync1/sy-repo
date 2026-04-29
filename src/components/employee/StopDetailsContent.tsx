// StopDetailsContent — fælles "se detaljer" panel for et rute-stop.
// Bruges både fra EmployeeRoute (med markér-som-udført + note) og fra
// EmployeeApp (read-only "Vis detaljer" på dagens stop). Henter fulde
// ordre-detaljer (zip/by, opgave-linjer, kunde-besked, beløb) — så
// medarbejderen aldrig bare ser en gade-adresse uden postnr og by.
import { useMemo } from "react";
import {
  CheckCircle2, Clock, ClipboardList, Info, Loader2, MapPin, MessageSquare,
  Phone, Route as RouteIcon, Wallet, Calendar as CalendarIcon, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import type { RouteStop } from "@/hooks/useRoutes";
import { useOrderForStop } from "@/hooks/useRoutes";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { calcEmployeeShare, formatKr as formatKrUtil } from "@/lib/commission";
import { stripPrices } from "@/lib/employee-display";

type RouteContext = {
  /** Rutens navn ("Mandag-team", "Aarhus C", …). */
  name: string | null;
  /** Rute-farve (hex/hsl). */
  color?: string | null;
  /** Rute-dato (yyyy-MM-dd) — vises hvis der er flere ruter / man kigger frem i tid. */
  date?: string | null;
};

type Props = {
  stop: RouteStop;
  /** Stop-nummer i ruten (1-baseret) — vises i header-cirklen. */
  index: number;
  themeColor: string;
  /** Optional ruten dette stop tilhører — vises som ekstra kontekst. */
  route?: RouteContext;
  /** Read-only: skjul "markér udført" + note-feltet. Default false. */
  readOnly?: boolean;
  /** Note-felt (kun når !readOnly). */
  noteDraft?: string;
  onNoteChange?: (v: string) => void;
  onComplete?: () => void;
  onUndo?: () => void;
  isPending?: boolean;
};

export const StopDetailsContent = ({
  stop, index, route, readOnly = false,
  noteDraft = "", onNoteChange, onComplete, onUndo, isPending,
}: Props) => {
  const { data: order, isLoading: loadingOrder } = useOrderForStop(stop.order_id);
  const { data: meEmployee } = useMyEmployee();
  const isDone = stop.status === "completed";

  // Fuld adresse: vej + postnummer + by — vi viser ALDRIG kun gaden uden
  // postnr/by, fordi flere danske vejnavne findes i flere byer.
  const fullAddress = useMemo(() => {
    const parts: string[] = [];
    const street = stop.address || order?.address || null;
    const zip = order?.zip_code || null;
    const city = order?.city || null;
    if (street) parts.push(street);
    const zipCity = [zip, city].filter(Boolean).join(" ");
    if (zipCity && (!street || !street.toLowerCase().includes(zipCity.toLowerCase()))) {
      parts.push(zipCity);
    }
    return parts.join(", ");
  }, [stop.address, order?.address, order?.zip_code, order?.city]);

  const addressForMaps = encodeURIComponent(fullAddress || stop.address || "");

  type TaskLine = {
    name: string;
    quantity: number;
    unit?: string | null;
    description?: string | null;
    subcategory?: string | null;
    selections: Array<{ label: string; value: string }>;
  };

  const tasks: TaskLine[] = useMemo(() => {
    const items = (order?.order_items || []) as any[];
    return items.map((it) => {
      const svc = it.services || {};
      const details = it.details || {};
      const selections: Array<{ label: string; value: string }> = [];
      if (Array.isArray(details.steps)) {
        for (const step of details.steps) {
          if (step?.label != null && step?.value != null) {
            selections.push({
              label: String(step.label),
              value: `${step.value}${step.unit ? ` ${step.unit}` : ""}`,
            });
          }
        }
      }
      if (details.interval) {
        const intervalMap: Record<string, string> = {
          weekly: "Hver uge",
          biweekly: "Hver 2. uge",
          monthly: "Hver måned",
          quarterly: "Hver 3. måned",
        };
        selections.push({
          label: "Frekvens",
          value: intervalMap[details.interval] || String(details.interval),
        });
      }
      return {
        name: it.service_name || svc.name || "Opgave",
        quantity: it.quantity ?? 1,
        unit: svc.unit,
        description: svc.description,
        subcategory: svc.subcategory,
        selections,
      };
    });
  }, [order?.order_items]);

  const fallbackSummary = !tasks.length && stop.service_summary ? stripPrices(stop.service_summary) : null;
  const customerNote: string | null = (order as any)?.notes || null;

  const orderTotal = useMemo(() => {
    if (!order) return 0;
    const adj = (order as any).adjusted_amount;
    const tot = (order as any).total_amount;
    return Number(adj ?? tot ?? 0);
  }, [order]);

  const sharers = useMemo(() => {
    const n = stop.assignee_ids?.length || 0;
    return Math.max(n || (stop.required_staff || 1), 1);
  }, [stop.assignee_ids, stop.required_staff]);

  const myCommissionPct = Number(meEmployee?.commission_pct || 0);
  const myShare = calcEmployeeShare(orderTotal, myCommissionPct, sharers);

  const orderStatus: string = (order as any)?.status || "";
  const paymentStatus: "paid" | "settling" | "pending" | "unknown" =
    orderStatus === "completed" ? "paid"
    : orderStatus === "in_progress" || orderStatus === "confirmed" ? "settling"
    : orderStatus === "pending" ? "pending"
    : "unknown";
  const paymentLabel =
    paymentStatus === "paid" ? "Betalt"
    : paymentStatus === "settling" ? "Afregnes"
    : paymentStatus === "pending" ? "Afventer betaling"
    : "Status ukendt";
  const paymentClasses =
    paymentStatus === "paid"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      : paymentStatus === "settling"
        ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
        : paymentStatus === "pending"
          ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
          : "bg-secondary text-muted-foreground border-border";

  // Planned / completed timestamps i lokal tid
  const arrivalLabel = stop.planned_arrival
    ? format(new Date(stop.planned_arrival), "HH:mm", { locale: da })
    : null;
  const completedLabel = stop.completed_at
    ? format(new Date(stop.completed_at), "EEEE d. MMM 'kl.' HH:mm", { locale: da })
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header med stop-nummer, navn, status og fuld adresse */}
      <div className="px-5 pt-5 pb-4 border-b border-border bg-card">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-background font-semibold text-base shrink-0 ${
              isDone ? "bg-emerald-500" : "bg-foreground"
            }`}
          >
            {isDone ? <CheckCircle2 className="h-6 w-6" /> : index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg leading-tight truncate text-foreground">
                {stop.customer_name || "Stop"}
              </h3>
              <Badge
                variant="secondary"
                className={`text-[10px] uppercase tracking-wide font-semibold border-0 ${
                  isDone ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : ""
                }`}
              >
                {isDone ? "Færdig" : "Klar"}
              </Badge>
            </div>
            {fullAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${addressForMaps}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-foreground/80 hover:text-foreground underline-offset-2 hover:underline flex items-start gap-1.5 mt-1.5 leading-snug"
              >
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{fullAddress}</span>
              </a>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
              {arrivalLabel && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="h-3 w-3" /> Planlagt {arrivalLabel}
                </span>
              )}
              {stop.duration_minutes > 0 && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="h-3 w-3" /> ~{stop.duration_minutes} min
                </span>
              )}
              {sharers > 1 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> Delt med {sharers - 1} kollega{sharers - 1 === 1 ? "" : "er"}
                </span>
              )}
            </div>
            {completedLabel && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Markeret færdig {completedLabel}
              </p>
            )}
          </div>
        </div>

        {/* Rute-kontekst — hvilken rute hører stoppet til? */}
        {route && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-2 text-xs">
            <span
              className="h-5 w-5 shrink-0 rounded-md border border-border flex items-center justify-center"
              style={{ background: route.color || "hsl(var(--secondary))" }}
            >
              <RouteIcon className="h-3 w-3 text-background" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">På rute</p>
              <p className="truncate font-semibold text-foreground">
                {route.name || "Rute"}
              </p>
            </div>
            {route.date && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(route.date), "d. MMM yyyy", { locale: da })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-4">
          {/* Opgave-sektion */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">
                Opgave hos kunden
              </h4>
            </div>
            {loadingOrder && tasks.length === 0 && !fallbackSummary ? (
              <div className="rounded-xl border bg-secondary/30 p-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Henter opgavedetaljer…
              </div>
            ) : tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((t, i) => (
                  <div key={i} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight">{t.name}</p>
                        {t.subcategory && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{t.subcategory}</p>
                        )}
                      </div>
                      {t.quantity > 1 && (
                        <Badge variant="outline" className="tabular-nums text-[10px] shrink-0">
                          × {t.quantity}{t.unit ? ` ${t.unit}` : ""}
                        </Badge>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-[12px] text-foreground/75 mt-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                    {t.selections.length > 0 && (
                      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                        {t.selections.map((sel, k) => (
                          <div
                            key={k}
                            className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-2 py-1.5"
                          >
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold truncate">
                              {sel.label}
                            </span>
                            <span className="text-[12px] font-bold tabular-nums truncate">
                              {sel.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : fallbackSummary ? (
              <div className="rounded-xl border bg-card p-3">
                <p className="text-sm leading-relaxed">{fallbackSummary}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-secondary/20 p-3 text-center">
                <p className="text-[12px] text-muted-foreground">Ingen detaljer på denne opgave</p>
              </div>
            )}
          </section>

          {customerNote && customerNote.trim() && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">
                  Besked fra kunden
                </h4>
              </div>
              <div className="rounded-xl border border-l-4 border-l-foreground border-border bg-secondary/40 p-3">
                <p className="text-sm leading-relaxed whitespace-pre-line">{customerNote}</p>
              </div>
            </section>
          )}

          {orderTotal > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">
                  Beløb
                </h4>
              </div>
              <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Aftalens beløb</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`h-5 border px-1.5 text-[10px] font-medium ${paymentClasses}`}
                    >
                      {paymentLabel}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatKrUtil(orderTotal)}
                    </span>
                  </div>
                </div>
                {myCommissionPct > 0 && (
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-sm text-muted-foreground">
                      Min andel
                      {sharers > 1 && (
                        <span className="text-[10px] text-muted-foreground/80 ml-1">
                          (delt med {sharers - 1} kollega{sharers - 1 === 1 ? "" : "er"})
                        </span>
                      )}
                    </span>
                    <span className="text-base font-bold tabular-nums text-emerald-600">
                      {formatKrUtil(myShare)}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {stop.customer_phone && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">
                  Kontakt
                </h4>
              </div>
              <Button asChild variant="outline" className="w-full gap-2 h-11 rounded-xl justify-start font-medium">
                <a href={`tel:${stop.customer_phone}`}>
                  <Phone className="h-4 w-4" /> Ring til {stop.customer_name || "kunden"}
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {stop.customer_phone}
                  </span>
                </a>
              </Button>
            </section>
          )}

          {!readOnly && (
            <section>
              <label className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-2 flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Din note
                <span className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground/80">
                  (synlig for virksomheden)
                </span>
              </label>
              <Textarea
                placeholder="Tilføj en note om besøget…"
                value={noteDraft}
                onChange={(e) => onNoteChange?.(e.target.value)}
                rows={3}
                className="resize-none rounded-xl"
              />
            </section>
          )}

          {/* Read-only: vis evt. allerede-gemt note */}
          {readOnly && stop.notes && stop.notes.trim() && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">
                  Note fra besøget
                </h4>
              </div>
              <div className="rounded-xl border bg-secondary/30 p-3">
                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{stop.notes}</p>
              </div>
            </section>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="border-t border-border bg-background/95 backdrop-blur p-4 shrink-0">
          {!isDone ? (
            <Button
              onClick={onComplete}
              className="w-full gap-2 h-12 text-base font-semibold rounded-xl shadow-md bg-foreground text-background hover:bg-foreground/90"
              size="lg"
              disabled={!!isPending}
            >
              {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Markér som udført
            </Button>
          ) : (
            <Button onClick={onUndo} variant="outline" className="w-full h-12 rounded-xl">
              Fortryd udført
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default StopDetailsContent;