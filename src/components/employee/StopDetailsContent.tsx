// StopDetailsContent — fælles "se detaljer" panel for et rute-stop.
// Bruges både fra EmployeeRoute (med markér-som-udført + note) og fra
// EmployeeApp/EmployeeStats (read-only "Vis detaljer"). Bruger SAMME
// SheetHeaderBlock + Section byggeklodser som virksomhedspanelets
// StopDetailSheet, så medarbejder- og virksomhedspanel har 100% ens
// visuelt sprog når man åbner detaljer for en aftale.
import { Clock, Play, Pause } from "lucide-react";
import { useMyEmployeeId } from "@/hooks/useMyEmployee";
import { useStopTimeEntries, useStartStopTime, useEndStopTime } from "@/hooks/useRoutes";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, ClipboardList, Loader2, MapPin, MessageSquare,
  Phone, Route as RouteIcon, Wallet, Calendar as CalendarIcon, Users,
  Package, Send, Undo2,
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
import { INTERVAL_LABELS } from "@/types/service";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type RouteContext = {
  name: string | null;
  color?: string | null;
  date?: string | null;
  /** Hvis true: medarbejderen må udføre stop selvom dato er fremtidig. */
  allowEarly?: boolean;
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
  pendingTimeLabel?: string;
};

export const StopDetailsContent = ({
  stop, index, route, readOnly = false,
  noteDraft = "", onNoteChange, onComplete, onUndo, isPending, pendingTimeLabel,
}: Props) => {
  const { data: order, isLoading: loadingOrder } = useOrderForStop(stop.order_id);
  const { data: meEmployee } = useMyEmployee();
  const myEmployeeId = useMyEmployeeId();
  const { data: timeEntries = [] } = useStopTimeEntries([stop.id]);
  const startStopTime = useStartStopTime();
  const endStopTime = useEndStopTime();
  const [now, setNow] = useState(() => Date.now());

  const myEntry = useMemo(() => 
    timeEntries.find(e => e.employee_id === myEmployeeId && !e.ended_at) ||
    timeEntries.filter(e => e.employee_id === myEmployeeId).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
  , [timeEntries, myEmployeeId]);

  const isWorking = !!(myEntry && !myEntry.ended_at);
  useEffect(() => {
    if (!isWorking) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isWorking, myEntry?.id]);
  const totalDurationSeconds = useMemo(() => {
    const entries = timeEntries.filter(e => e.employee_id === myEmployeeId && e.ended_at);
    return entries.reduce((seconds, entry) => {
      if (!entry.ended_at) return seconds;
      return seconds + Math.max(0, Math.floor((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000));
    }, 0);
  }, [timeEntries, myEmployeeId]);
  const h = Math.floor(totalDurationSeconds / 3600);
  const m = Math.floor((totalDurationSeconds % 3600) / 60);
  const s = totalDurationSeconds % 60;
  const activeSeconds = isWorking && myEntry
    ? Math.max(0, Math.floor((now - new Date(myEntry.started_at).getTime()) / 1000))
    : 0;
  const shownSeconds = totalDurationSeconds + activeSeconds;
  const durationLabel = [Math.floor(shownSeconds / 3600), Math.floor((shownSeconds % 3600) / 60), shownSeconds % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  const handleStartWork = async () => {
    if (!myEmployeeId) return;
    try {
      await startStopTime.mutateAsync({ stop_id: stop.id, employee_id: myEmployeeId });
      toast.success("Tidsregistrering startet");
    } catch (err) {}
  };

  const handleEndWork = async () => {
    if (!myEmployeeId) return;
    try {
      await endStopTime.mutateAsync({ stop_id: stop.id, employee_id: myEmployeeId });
      toast.success("Tidsregistrering afsluttet");
    } catch (err) {}
  };
  const isDone = stop.status === "completed";

  // Lås "Markér udført" indtil rutens dato er aktuel.
  const { canComplete, futureLabel } = useMemo(() => {
    // Hvis virksomheden/medarbejderen/ruten tillader tidlig udførelse,
    // er stoppet altid eksekverbart — uanset rutens dato.
    if (route?.allowEarly) {
      return { canComplete: true, futureLabel: null as string | null };
    }
    const now = new Date();
    if (route?.date) {
      const d = new Date(route.date);
      if (!isNaN(d.getTime())) {
        // Sammenlign rene datoer (midnat) — fremtidige rutedatoer låses.
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const routeDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (routeDay.getTime() > today.getTime()) {
          return {
            canComplete: false,
            futureLabel: format(d, "d. MMM yyyy", { locale: da }),
          };
        }
      }
    }
    return { canComplete: true, futureLabel: null as string | null };
  }, [route?.date, route?.allowEarly]);

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
        // Brug projektets fælles INTERVAL_LABELS-map så medarbejderen
        // ser præcis samme tekst som virksomhedspanelet ("Hver 14. dag"
        // i stedet for det rå "hver_14_dag" eller engelske aliaser).
        const legacyAliases: Record<string, string> = {
          weekly: "ugentlig",
          biweekly: "hver_14_dag",
          monthly: "månedlig",
          quarterly: "kvartalsvis",
          daily: "daglig",
        };
        const key = legacyAliases[details.interval] ?? String(details.interval);
        const value = INTERVAL_LABELS[key] || INTERVAL_LABELS[String(details.interval)] || String(details.interval);
        selections.push({
          label: "Frekvens",
          value,
        });
      }
      return {
        name: it.service_name || svc.name || "Aftale",
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
  // Diskrete outline-badges — matcher virksomhedspanelets StopDetailSheet,
  // hvor status/abonnement/GPS vises som dæmpede outline-badges frem for
  // farverige fyldte chips. Holder header-blokken rolig at se på.
  const paymentClasses =
    paymentStatus === "paid"
      ? "border-feature-cool/40 text-feature-cool-foreground bg-feature-cool/10"
      : paymentStatus === "settling"
        ? "border-feature-lilac/40 text-feature-lilac-foreground bg-feature-lilac/10"
        : paymentStatus === "pending"
          ? "border-feature-warm/40 text-feature-warm-foreground bg-feature-warm/10"
          : "border-border text-muted-foreground bg-secondary/50";

  const accent = route?.color || "hsl(var(--primary))";

  // Send/gensend faktura — kun synlig når aftalen er markeret udført OG der
  // findes en bogført faktura i regnskabsprogrammet som adapter'en kan sende.
  const { data: invoiceCaps } = useQuery({
    queryKey: ["invoice-caps", stop.order_id, isDone],
    enabled: isDone && !!stop.order_id,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("accounting-action", {
          body: { order_id: stop.order_id, action: "check_capabilities" },
        });
        if (error) return null;
        return (data as any)?.caps ?? null;
      } catch { return null; }
    },
  });
  const canResendInvoice = !!invoiceCaps?.can_resend;
  const [resending, setResending] = useState(false);
  const handleResendInvoice = async () => {
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-action", {
        body: { order_id: stop.order_id, action: "resend_invoice" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Faktura sendt til kunden");
    } catch (e: any) {
      toast.error(e?.message ?? "Kunne ikke sende faktura");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-secondary/20">
      {/* Header — samme SheetHeaderBlock som virksomhedspanelets StopDetailSheet */}
      <div className="px-4 sm:px-5 pt-3 pb-3 border-b shrink-0 bg-card">
        <SheetHeaderBlock
          accent={accent}
          badge={isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          title={<span className="text-base font-semibold">{stop.customer_name || "Stop"}</span>}
          description={
            fullAddress ? (
              <span className="line-clamp-1">{fullAddress}</span>
            ) : route?.name ? (
              <span>På rute <strong>{route.name}</strong></span>
            ) : (
              <span>Detaljer for dette stop</span>
            )
          }
        >
          {isDone ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-feature-cool/40 bg-feature-cool/10 text-feature-cool-foreground">
              <CheckCircle2 className="h-2.5 w-2.5" />Færdig
            </Badge>
          ) : null}
          
          <Badge variant="outline" className={`gap-1 text-[10px] ${paymentClasses}`}>
            <Wallet className="h-2.5 w-2.5" />{paymentLabel}
          </Badge>
        </SheetHeaderBlock>
        
        {/* Hurtig-handlinger: Maps + Ring direkte i header — ingen scroll nødvendig.
            Stor touch-target, kompakt layout, samme stil som virksomhedspanelet. */}
        {!readOnly && (fullAddress || stop.customer_phone) && (
          <div className="mt-3 flex gap-2">
            {fullAddress && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 h-10 rounded-lg text-xs font-semibold border-border hover:bg-secondary"
              >
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${addressForMaps}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="h-3.5 w-3.5" /> Maps
                </a>
              </Button>
            )}
            {stop.customer_phone && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 h-10 rounded-lg text-xs font-semibold border-border hover:bg-secondary"
              >
                <a href={`tel:${stop.customer_phone}`}>
                  <Phone className="h-3.5 w-3.5" /> Ring
                </a>
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 space-y-3">
        {/* Statistik viser kun afsluttet faktisk tidsforbrug. Aktiv status og
            starttid hører alene til medarbejderens aktive rutekørsel. */}
        {(!readOnly || (!isWorking && totalDurationSeconds > 0)) && (
          <Section
            icon={<Clock className="h-3.5 w-3.5" />}
            title={readOnly ? "Faktisk tidsforbrug" : "Tidsregistrering"}
            hint={!readOnly && isWorking ? "I gang" : totalDurationSeconds > 0 ? durationLabel : undefined}
          >
            <div className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                {!readOnly && isWorking ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-feature-cool-foreground animate-pulse">
                    <div className="h-2 w-2 rounded-full bg-feature-cool" />
                    <span>Tidsregistrering aktiv</span>
                    <span className="font-mono font-semibold tabular-nums text-foreground">{durationLabel}</span>
                  </div>
                ) : totalDurationSeconds > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Faktisk tid: <span className="font-semibold tabular-nums text-foreground">{durationLabel}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{pendingTimeLabel || "Ingen tidsregistrering endnu"}</p>
                )}
                {!readOnly && !isDone && myEntry?.started_at && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isWorking ? "Startet kl. " : "Seneste start kl. "}
                    {new Date(myEntry.started_at).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              {!readOnly && !isDone && (
                <Button
                  size="sm"
                  variant={isWorking ? "outline" : "default"}
                  className="h-9 gap-2 shrink-0"
                  onClick={isWorking ? handleEndWork : handleStartWork}
                  disabled={startStopTime.isPending || endStopTime.isPending}
                >
                  {!readOnly && isWorking ? (
                    <> <Pause className="h-3.5 w-3.5" /> Stop </>
                  ) : (
                    <> <Play className="h-3.5 w-3.5" /> Start </>
                  )}
                </Button>
              )}
            </div>
          </Section>
        )}

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
              <p className="text-[12px] text-muted-foreground">Ingen detaljer på denne aftale</p>
            </div>
          )}
        </Section>

        {customerNote && customerNote.trim() && (
          <Section
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            title="Besked fra kunden"
          >
            <div className="rounded-lg border-l-4 border-l-foreground bg-secondary/40 px-3 py-2">
              <p className="text-sm leading-relaxed whitespace-pre-line">{customerNote}</p>
            </div>
          </Section>
        )}

        {orderTotal > 0 && (
          <Section
            icon={<Wallet className="h-3.5 w-3.5" />}
            title="Beløb"
            hint={myCommissionPct > 0 ? formatKrUtil(myShare) : formatKrUtil(orderTotal)}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total inkl. moms</span>
                <span className="font-semibold tabular-nums">{formatKrUtil(orderTotal)}</span>
              </div>
              {myCommissionPct > 0 && (
                <div className="flex items-center justify-between border-t pt-1.5">
                  <span className="text-sm text-muted-foreground">
                    Min andel ekskl. moms{sharers > 1 ? ` (÷${sharers})` : ""}
                  </span>
                  <span className="text-base font-bold tabular-nums">{formatKrUtil(myShare)}</span>
                </div>
              )}
            </div>
          </Section>
        )}

        {route && (
          <Section
            icon={<RouteIcon className="h-3.5 w-3.5" />}
            title="Rute-info"
            hint={route.name || undefined}
          >
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
            {sharers > 1 && (
              <p className="mt-2 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Users className="h-3 w-3" /> Delt med {sharers - 1} kollega{sharers - 1 === 1 ? "" : "er"}
              </p>
            )}
          </Section>
        )}

        {!readOnly && (
          <Section
            icon={<ClipboardList className="h-3.5 w-3.5" />}
            title="Din note"
            hint={noteDraft?.trim() ? "udfyldt" : "synlig for virksomheden"}
          >
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
          <Section
            icon={<ClipboardList className="h-3.5 w-3.5" />}
            title="Note fra besøget"
          >
            <div className="rounded-lg border bg-card p-3">
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{stop.notes}</p>
            </div>
          </Section>
        )}
      </div>

      {(!readOnly || canResendInvoice) && (
        <div className="border-t border-border bg-card p-4 shrink-0">
          {!readOnly && !isDone ? (
            <div className="space-y-2">
              <Button
                onClick={onComplete}
                className="w-full gap-2 h-12 text-base font-semibold rounded-lg shadow-sm bg-foreground text-background hover:bg-foreground/90"
                size="lg"
                disabled={!!isPending || !canComplete}
              >
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Markér som udført
              </Button>
              {!canComplete && futureLabel && (
                <p className="text-xs text-muted-foreground text-center">
                  Kan først udføres {futureLabel}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {canResendInvoice && (
                <Button
                  onClick={handleResendInvoice}
                  disabled={resending}
                  className="w-full gap-2 h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90"
                >
                  {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send faktura til kunden
                </Button>
              )}
              {!readOnly && (
                <Button onClick={onUndo} variant="outline" className="h-11 w-full gap-2 rounded-lg sm:w-auto sm:min-w-40">
                  <Undo2 className="h-4 w-4" />
                  Fortryd udførsel
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StopDetailsContent;
