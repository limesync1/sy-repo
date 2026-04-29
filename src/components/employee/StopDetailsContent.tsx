// StopDetailsContent — fælles "se detaljer" panel for et rute-stop.
// Bruges både fra EmployeeRoute (med markér-som-udført + note) og fra
// EmployeeApp/EmployeeStats (read-only "Vis detaljer"). Bruger SAMME
// SheetHeaderBlock + Section byggeklodser som virksomhedspanelets
// StopDetailSheet, så medarbejder- og virksomhedspanel har 100% ens
// visuelt sprog når man åbner detaljer for en aftale.
import { useMemo } from "react";
import {
  CheckCircle2, Clock, ClipboardList, Loader2, MapPin, MessageSquare,
  Phone, Route as RouteIcon, Wallet, Calendar as CalendarIcon, Users,
  User as UserIcon, Package,
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
import { SheetHeaderBlock, Section } from "@/components/route-planner/SheetSection";

type RouteContext = {
  name: string | null;
  color?: string | null;
  date?: string | null;
};

type Props = {
  stop: RouteStop;
  /** Stop-nummer i ruten (1-baseret) — vises i header-badge. */
  index: number;
  themeColor: string;
  route?: RouteContext;
  /** Read-only: skjul "markér udført" + note-feltet. */
  readOnly?: boolean;
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

  // Fuld adresse: vej + postnr + by — vi viser ALDRIG kun gaden uden
  // postnr/by, da flere danske vejnavne findes i flere byer.
  const fullAddress = useMemo(() => {
    const street = stop.address || (order as any)?.address || null;
    const zip = (order as any)?.zip_code || null;
    const city = (order as any)?.city || null;
    const cityLine = [zip, city].filter(Boolean).join(" ");
    if (!street && !cityLine) return null;
    if (street && cityLine && !street.toLowerCase().includes(cityLine.toLowerCase())) {
      return `${street}, ${cityLine}`;
    }
    return street || cityLine;
  }, [stop.address, order]);

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
    const items = ((order as any)?.order_items || []) as any[];
    return items.map((it) => {
      const svc = it.services || {};
      const details = it.details || {};
      const selections: Array<{ label: string; value: string }> = [];
      const stepDetails: any[] = Array.isArray(details.stepDetails)
        ? details.stepDetails
        : Array.isArray(details.steps) ? details.steps : [];
      for (const step of stepDetails) {
        if (step?.label != null && step?.value != null) {
          selections.push({
            label: String(step.label),
            value: `${step.value}${step.unit ? ` ${step.unit}` : ""}`,
          });
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
  }, [order]);

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
      ? "bg-feature-cool text-feature-cool-foreground border-transparent"
      : paymentStatus === "settling"
        ? "bg-feature-lilac text-feature-lilac-foreground border-transparent"
        : paymentStatus === "pending"
          ? "bg-feature-warm text-feature-warm-foreground border-transparent"
          : "bg-secondary text-muted-foreground border-transparent";

  const arrivalLabel = stop.planned_arrival
    ? format(new Date(stop.planned_arrival), "HH:mm", { locale: da })
    : null;
  const completedLabel = stop.completed_at
    ? format(new Date(stop.completed_at), "EEEE d. MMM 'kl.' HH:mm", { locale: da })
    : null;
  const accent = route?.color || "hsl(var(--primary))";

  return (
    <div className="flex flex-col h-full bg-secondary/20">
      {/* Header — samme SheetHeaderBlock som virksomhedspanelets StopDetailSheet */}
      <div className="px-5 py-4 border-b shrink-0 bg-card">
        <SheetHeaderBlock
          accent={accent}
          badge={isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          title={<span className="text-base font-semibold">{stop.customer_name || "Stop"}</span>}
          description={
            route?.name ? (
              <span>På rute <strong>{route.name}</strong>{route.date ? ` · ${format(new Date(route.date), "d. MMM yyyy", { locale: da })}` : ""}</span>
            ) : (
              <span>Detaljer for dette stop</span>
            )
          }
        >
          <Badge
            variant="secondary"
            className={isDone
              ? "gap-1 text-[10px] bg-feature-cool/15 text-feature-cool-foreground border-transparent"
              : "gap-1 text-[10px]"}
          >
            {isDone ? <><CheckCircle2 className="h-2.5 w-2.5" />Færdig</> : <>Klar</>}
          </Badge>
          <Badge variant="outline" className={`gap-1 text-[10px] ${paymentClasses}`}>
            <Wallet className="h-2.5 w-2.5" />{paymentLabel}
          </Badge>
          {arrivalLabel && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Clock className="h-2.5 w-2.5" />Planlagt {arrivalLabel}
            </Badge>
          )}
          {stop.duration_minutes > 0 && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Clock className="h-2.5 w-2.5" />~{stop.duration_minutes} min
            </Badge>
          )}
          {sharers > 1 && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Users className="h-2.5 w-2.5" />Delt med {sharers - 1} kollega{sharers - 1 === 1 ? "" : "er"}
            </Badge>
          )}
        </SheetHeaderBlock>
        {completedLabel && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-feature-cool/10 px-2 py-0.5 text-[11px] font-medium text-feature-cool-foreground">
            <CheckCircle2 className="h-3 w-3" /> Markeret færdig {completedLabel}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {/* Kunde-sektion — adresse + kontakt */}
        <Section icon={<UserIcon className="h-3.5 w-3.5" />} title="Kunde">
          <div className="space-y-1.5 text-sm">
            {fullAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${addressForMaps}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 text-foreground hover:underline underline-offset-2"
              >
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span>{fullAddress}</span>
              </a>
            )}
            {stop.customer_phone && (
              <a
                href={`tel:${stop.customer_phone}`}
                className="flex items-center gap-2 text-foreground hover:underline"
              >
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{stop.customer_phone}</span>
              </a>
            )}
          </div>
        </Section>

        {/* Opgaver */}
        <Section
          icon={<Package className="h-3.5 w-3.5" />}
          title="Bestilte ydelser"
          hint={tasks.length > 0 ? `${tasks.length} ${tasks.length === 1 ? "ydelse" : "ydelser"}` : undefined}
        >
          {loadingOrder && tasks.length === 0 && !fallbackSummary ? (
            <div className="rounded-lg border bg-secondary/30 p-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Henter detaljer…
            </div>
          ) : tasks.length > 0 ? (
            <div className="rounded-lg border divide-y bg-card">
              {tasks.map((t, i) => (
                <div key={i} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{t.name}</p>
                      {t.subcategory && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t.subcategory}</p>
                      )}
                    </div>
                    {t.quantity > 1 && (
                      <Badge variant="outline" className="tabular-nums text-[10px] h-4 px-1.5 shrink-0">
                        × {t.quantity}{t.unit ? ` ${t.unit}` : ""}
                      </Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                  {t.selections.length > 0 && (
                    <div className="mt-2 rounded-md bg-secondary/40 divide-y divide-border/50">
                      {t.selections.map((sel, k) => (
                        <div key={k} className="flex justify-between px-2.5 py-1 text-[11px]">
                          <span className="text-muted-foreground">{sel.label}</span>
                          <span className="font-medium text-foreground tabular-nums">{sel.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : fallbackSummary ? (
            <div className="rounded-lg border bg-card p-3">
              <p className="text-sm leading-relaxed">{fallbackSummary}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-secondary/20 p-3 text-center">
              <p className="text-[12px] text-muted-foreground">Ingen detaljer på denne opgave</p>
            </div>
          )}
        </Section>

        {customerNote && customerNote.trim() && (
          <Section icon={<MessageSquare className="h-3.5 w-3.5" />} title="Besked fra kunden">
            <div className="rounded-lg border-l-4 border-l-foreground bg-secondary/40 px-3 py-2">
              <p className="text-sm leading-relaxed whitespace-pre-line">{customerNote}</p>
            </div>
          </Section>
        )}

        {orderTotal > 0 && (
          <Section icon={<Wallet className="h-3.5 w-3.5" />} title="Beløb">
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Aftalens beløb</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatKrUtil(orderTotal)}
                </span>
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
                  <span className="text-base font-bold tabular-nums text-foreground">
                    {formatKrUtil(myShare)}
                  </span>
                </div>
              )}
            </div>
          </Section>
        )}

        {route && (
          <Section icon={<RouteIcon className="h-3.5 w-3.5" />} title="Rute-info">
            <div className="flex items-center gap-2.5">
              <span
                className="h-7 w-7 shrink-0 rounded-md border border-border flex items-center justify-center"
                style={{ background: route.color || "hsl(var(--secondary))" }}
              >
                <RouteIcon className="h-3.5 w-3.5 text-background" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{route.name || "Rute"}</p>
                {route.date && (
                  <p className="text-[11px] text-muted-foreground tabular-nums inline-flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {format(new Date(route.date), "EEEE d. MMM yyyy", { locale: da })}
                  </p>
                )}
              </div>
            </div>
          </Section>
        )}

        {!readOnly && (
          <Section icon={<ClipboardList className="h-3.5 w-3.5" />} title="Din note" hint="synlig for virksomheden">
            <Textarea
              placeholder="Tilføj en note om besøget…"
              value={noteDraft}
              onChange={(e) => onNoteChange?.(e.target.value)}
              rows={3}
              className="resize-none rounded-md"
            />
          </Section>
        )}

        {readOnly && stop.notes && stop.notes.trim() && (
          <Section icon={<ClipboardList className="h-3.5 w-3.5" />} title="Note fra besøget">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{stop.notes}</p>
            </div>
          </Section>
        )}
      </div>

      {!readOnly && (
        <div className="border-t border-border bg-card p-4 shrink-0">
          {!isDone ? (
            <Button
              onClick={onComplete}
              className="w-full gap-2 h-12 text-base font-semibold rounded-lg shadow-sm bg-foreground text-background hover:bg-foreground/90"
              size="lg"
              disabled={!!isPending}
            >
              {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Markér som udført
            </Button>
          ) : (
            <Button onClick={onUndo} variant="outline" className="w-full h-12 rounded-lg">
              Fortryd udført
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default StopDetailsContent;
