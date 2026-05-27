import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  MapPin, Clock, Phone,
  StickyNote, ChevronDown, ChevronRight, Route as RouteIcon, Lock, Sparkles,
  Info, Check,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { da } from "date-fns/locale";
import { formatDurationMin } from "@/lib/duration-format";
import { relativeFromNow } from "@/lib/relative-time";
import { IntervalBadge } from "./IntervalBadge";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton-version af kortet — bruges mens aftaler/GPS-status indlæses.
 *  Matcher kortets højde og indre struktur så listen ikke "hopper" når
 *  rigtige kort kommer ind. */
export const UnassignedJobCardSkeleton = ({ compact = false }: { compact?: boolean }) => (
  <div className={`relative rounded-lg border border-border/60 bg-card overflow-hidden ${compact ? "p-2.5 pl-3" : "p-3 pl-3.5"} space-y-2`}>
    <Skeleton className="absolute left-0 top-0 bottom-0 w-1 rounded-none" />
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-4 w-40 rounded" />
      </div>
      <Skeleton className="h-4 w-12 rounded shrink-0" />
    </div>
    <Skeleton className="h-3 w-3/4 rounded" />
    <Skeleton className="h-3 w-2/3 rounded" />
  </div>
);

type OrderItem = {
  service_name: string;
  quantity: number;
  total_price: number;
  details?: { interval?: string } | null;
};

type Props = {
  job: {
    id: string;
    status?: string | null;
    customer_name: string;
    customer_phone?: string | null;
    address?: string | null;
    city?: string | null;
    zip_code?: string | null;
    total_amount?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    preferred_date?: string | null;
    preferred_time_start?: string | null;
    preferred_time_end?: string | null;
    estimated_duration_minutes?: number | null;
    notes?: string | null;
    preferred_route_name?: string | null;
    next_service_date?: string | null;
    order_items?: OrderItem[] | null;
    business_response?: string | null;
    customer_response?: string | null;
    adjusted_details?: any;
    adjusted_amount?: number | null;
    completed_cycles?: number | null;
  };
  onClick?: () => void;
  onSuggestRoute?: () => void;
  /** Hopper kalenderen til første dag med ledig kapacitet. */
  onFindFreeSlot?: () => void;
  /** Multi-select: aktuel valg-tilstand for dette kort. */
  selected?: boolean;
  /** Multi-select: true når mindst ét kort er valgt — bruges til at vise
   *  checkbox-affordance på alle kort så brugeren ser at de også kan vælges. */
  anySelected?: boolean;
  /** Toggle bulk-valg af dette kort. */
  onToggleSelect?: (e: React.MouseEvent) => void;
  /** Kompakt visning — skjuler varighed/badges og holder skema-banner på én linje. */
  compact?: boolean;
};

/** Beregn tydeligt label for hvornår jobbet skal udføres næste gang.
 *  Viser ugedag + dato + relativ tid, så ejeren hurtigt kan se hvilken
 *  rute / dag aftalen hører hjemme på. */
const getSchedule = (d?: string | null) => {
  if (!d) return null;
  const date = parseISO(d);
  const diff = differenceInDays(date, new Date());
  let relative: string | null;
  if (isPast(date) && !isToday(date)) {
    const minsLate = Math.round((Date.now() - date.getTime()) / 60000);
    if (minsLate < 60) relative = `${minsLate} min forsinket`;
    else if (minsLate < 60 * 24) relative = `${Math.round(minsLate / 60)} t forsinket`;
    else relative = `${Math.abs(diff)} dage forsinket`;
  } else if (isToday(date) || isTomorrow(date)) {
    // dayLabel viser allerede "I dag" / "I morgen" — undgå "I dag · i dag".
    relative = null;
  } else {
    relative = relativeFromNow(date);
  }

  const dayLabel = isToday(date) ? "I dag"
    : isTomorrow(date) ? "I morgen"
    : format(date, "EEE d. MMM", { locale: da });

  const tone =
    isPast(date) && !isToday(date)
      ? "text-destructive"
      : isToday(date)
      ? "text-orange-600 dark:text-orange-400"
      : isTomorrow(date)
      ? "text-amber-600 dark:text-amber-400"
      : diff <= 7
      ? "text-foreground"
      : "text-muted-foreground";

  const dotTone =
    isPast(date) && !isToday(date)
      ? "bg-destructive"
      : isToday(date)
      ? "bg-orange-500"
      : isTomorrow(date)
      ? "bg-amber-500"
      : diff <= 7
      ? "bg-primary"
      : "bg-muted-foreground/50";

  return { dayLabel, relative, tone, dotTone };
};

export const UnassignedJobCard = ({
  job, onClick, onSuggestRoute, onFindFreeSlot,
  selected, anySelected, onToggleSelect, compact = false,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const isPending = job.status === "pending";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `job-${job.id}`,
    data: { type: "job", job },
    disabled: isPending,
  });

  // Hvis kunden har godkendt et tilpasset forslag, så er adjusted_details
  // den gældende aftale — brug dén til at vise korrekt interval/serviceliste.
  const useAdjusted =
    job.business_response === "adjusted" &&
    job.customer_response === "accepted" &&
    Array.isArray((job.adjusted_details as any)?.items);
  const items = useAdjusted
    ? ((job.adjusted_details as any).items as OrderItem[])
    : (job.order_items || []);
  const hasRecurringInterval = items.some((it: any) => {
    const interval = it.details?.interval;
    return interval && interval !== "engangskøb";
  });
  // Aftalen er "ny" indtil den er udført første gang. For sådanne aftaler
  // viser vi "Opstart:" i stedet for "Næste:" — også for gentagne aftaler,
  // siden næste forekomst først giver mening efter første udførelse.
  const isFirstOccurrence = (job.completed_cycles ?? 0) === 0;
  const itemCount = items.length;
  // Vis hele adressen: gade, postnummer og by samlet
  const cityLine = [job.zip_code, job.city].filter(Boolean).join(" ");
  const fullAddress = [job.address, cityLine].filter(Boolean).join(", ");

  // Foretrukken kilde til varighed: eksplicit estimeret felt fra ordren.
  // Falder tilbage til tidsvindue. Vi viser kun varighed hvis vi har
  // et reelt tal — et hard-coded "30 min" forvirrer mere end det hjælper.
  let estimatedMin: number | null = null;
  if (job.estimated_duration_minutes && job.estimated_duration_minutes > 0) {
    estimatedMin = job.estimated_duration_minutes;
  } else if (job.preferred_time_start && job.preferred_time_end) {
    const [sh, sm] = job.preferred_time_start.split(":").map(Number);
    const [eh, em] = job.preferred_time_end.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff > 0) estimatedMin = diff;
  }

  // Foretrukken dato — recurring abonnementer bruger next_service_date som "skal udføres senest".
  // For engangs aftaler bruges kundens preferred_date.
  const scheduleDate = hasRecurringInterval
    ? job.next_service_date || job.preferred_date || null
    : job.preferred_date || job.next_service_date || null;
  const schedule = getSchedule(scheduleDate);
  const hasGps = job.latitude != null && job.longitude != null;
  const displayAmount = job.customer_response === "accepted"
    ? job.adjusted_amount ?? job.total_amount
    : job.total_amount;

  // Accent-stribe i venstre kant signalerer dag-status (forsinket/i dag/i morgen/senere).
  // Erstatter den støjende uppercase-pille øverst og gør status scannelig på 1 blik.
  const accentBar = isPending
    ? "bg-amber-400"
    : schedule
      ? (schedule.dotTone === "bg-destructive" ? "bg-destructive"
        : schedule.dotTone === "bg-orange-500" ? "bg-orange-500"
        : schedule.dotTone === "bg-amber-500" ? "bg-amber-500"
        : schedule.dotTone === "bg-primary" ? "bg-primary"
        : "bg-muted-foreground/50")
      : "bg-muted-foreground/40";

  return (
    <div
      ref={setNodeRef}
      {...(isPending ? {} : listeners)}
      {...(isPending ? {} : attributes)}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      aria-label={isPending
        ? `${job.customer_name} — afventer kundens godkendelse`
        : `${job.customer_name} — træk for at planlægge, klik for detaljer`}
      className={`group relative rounded-lg border bg-card transition-all duration-150 overflow-hidden ${
        isPending ? "" : "cursor-grab active:cursor-grabbing touch-none"
      } ${
        isPending
          ? "border-amber-300/70 bg-amber-50/40"
          : selected
            ? "border-accent/60 bg-accent/5 shadow-sm"
            : "border-border/70 hover:border-foreground/25 hover:shadow-md hover:-translate-y-px"
      }`}
    >
      {/* Venstre status-stribe: tydelig farvekode for hvornår aftalen skal udføres.
          Når valgt: accent-farve overrider, så bulk-tilstand er entydig. */}
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-1 ${selected && !isPending ? "bg-accent" : accentBar}`}
      />
      {/* Pending lås — overlay i toppen højre hjørne (erstatter venstre kolonne). */}
      {isPending && (
        <div
          aria-hidden
          className="absolute top-2 right-2 h-5 w-5 inline-flex items-center justify-center rounded text-amber-600 bg-amber-100/80"
          title="Aftalen skal godkendes før den kan lægges på en rute"
        >
          <Lock className="h-3 w-3" />
        </div>
      )}

      {/* Multi-select knap — overlay i top-venstre hjørne så den ikke stjæler indholdsplads.
          Vises permanent når kortet er valgt eller bulk-tilstand er aktiv, ellers kun på hover. */}
      {!isPending && onToggleSelect && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(e); }}
          aria-label={selected ? "Fravælg aftale" : "Vælg aftale"}
          aria-pressed={selected}
          title={selected ? "Fravælg" : "Vælg flere aftaler"}
          className={`absolute top-1.5 left-2.5 z-10 h-4 w-4 rounded border flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
            selected
              ? "bg-accent border-accent text-accent-foreground opacity-100"
              : anySelected
                ? "bg-card border-accent/60 hover:bg-accent/10 opacity-100"
                : "bg-card border-border hover:border-accent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </button>
      )}

      <div className={`${compact ? "p-2 pl-3" : "p-3 pl-3.5"}`}>
        <div
          {...(isPending ? {} : {
            role: "button",
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); }
            },
            "aria-label": `Åbn detaljer for ${job.customer_name}`,
          })}
          className={`min-w-0 text-left rounded-md ${isPending ? "" : "cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"} ${compact ? "space-y-1" : "space-y-1.5"}`}
        >
          {/* HIERARKI:
              1) Dag-label (lille caps) — wayfinding-etiket: hvornår skal det ske?
              2) Kunde-navn (stort, fed) — primært fokus: hvem er det?
              3) Pris (højre, tabular) — sekundært fokus: hvad er værdien?
              4) Service (1 linje, foreground/70) — kontekst
              5) Adresse + meta (mindre, muted) — tertiær info
              Den farvede venstre-stribe erstatter den gamle dag-pille som visuel ankerpunkt. */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {schedule && (
                <div className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider leading-none ${schedule.tone}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${schedule.dotTone}`} aria-hidden />
                  <span>{schedule.dayLabel}</span>
                  {schedule.relative && !compact && (
                    <span className="font-normal normal-case tracking-normal text-muted-foreground">· {schedule.relative}</span>
                  )}
                </div>
              )}
              <p className={`${compact ? "text-[13px]" : "text-[14px]"} font-semibold leading-tight text-foreground truncate capitalize ${schedule ? "mt-1" : ""}`}>
                {job.customer_name}
              </p>
            </div>
            <span className={`shrink-0 ${compact ? "text-[12px]" : "text-[13.5px]"} font-bold text-foreground tabular-nums tracking-tight leading-tight`}>
              {Math.round(Number(displayAmount || 0))}<span className="ml-0.5 text-[10px] font-medium text-muted-foreground">kr</span>
            </span>
          </div>

          {itemCount > 0 && (
            <p className="text-[12px] text-foreground/75 truncate leading-snug">
              {items[0].quantity > 1 && <span className="text-muted-foreground">{items[0].quantity}× </span>}
              {items[0].service_name}
              {itemCount > 1 && <span className="text-muted-foreground"> · +{itemCount - 1} mere</span>}
            </p>
          )}

          {/* Pending-banner — kort forklaring + tydelig handling.
              Brugeren forstår både HVORFOR aftalen er låst og HVAD han kan gøre. */}
          {isPending && (
            <div className="rounded-md bg-amber-100/70 border border-amber-300/60 px-2 py-1.5 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900">
                <Lock className="h-3 w-3 shrink-0" />
                <span>Venter på kundens svar</span>
              </div>
              <p className="text-[10px] leading-snug text-amber-800/90">
                Aftalen kan først planlægges når kunden har godkendt tilbuddet.
              </p>
              {onClick && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClick(); }}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 hover:text-amber-950 underline underline-offset-2"
                >
                  <Info className="h-3 w-3" />
                  Se årsag og send påmindelse
                </button>
              )}
            </div>
          )}

          {/* Adresse — pin-farve signalerer GPS-status (tooltip forklarer) */}
          {fullAddress && (
            <p
              className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 leading-snug"
              title={hasGps ? "Adressen er fundet på kortet" : "Adressen mangler GPS — ruten kan ikke vises på kort"}
            >
              <MapPin className={`h-3 w-3 shrink-0 ${hasGps ? "text-muted-foreground/70" : "text-orange-500"}`} />
              <span className="truncate">{fullAddress}</span>
            </p>
          )}

          {/* Meta-linje: tid + varighed + interval. Relativ tid er flyttet op
              ved siden af dag-labelet for at undgå duplikering. */}
          {(job.preferred_time_start || estimatedMin != null || !compact) && (
            <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[11px] min-w-0 text-muted-foreground">
              {job.preferred_time_start && (
                <span className="tabular-nums">
                  {job.preferred_time_start.slice(0, 5)}
                  {job.preferred_time_end && `–${job.preferred_time_end.slice(0, 5)}`}
                </span>
              )}
              {!compact && estimatedMin != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDurationMin(estimatedMin)}
                </span>
              )}
              {!compact && (
                <IntervalBadge
                  interval={items.find((it: any) => it.details?.interval)?.details?.interval}
                  size="sm"
                />
              )}
            </div>
          )}

          {/* Foreslået tidligere rute — diskret hint kun når relevant. */}
          {job.preferred_route_name && !compact && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 min-w-0">
              <RouteIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">Tidligere på <span className="font-medium text-foreground">{job.preferred_route_name}</span></span>
            </p>
          )}
        </div>
      </div>

      {/* Samlet actions-bar: "Foreslå rute" + "Detaljer" på én række i stedet for to */}
      {!compact && !isPending && (onSuggestRoute || job.customer_phone || itemCount > 1 || job.notes) && (
        <div className="flex border-t border-border/50 divide-x divide-border/50 text-[11px]">
          {onSuggestRoute && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSuggestRoute(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 font-medium text-foreground hover:bg-accent/10 transition-colors focus-visible:bg-accent/15 focus-visible:outline-none"
              title="Foreslå bedste rute baseret på afstand, kapacitet og færdigheder"
            >
              <Sparkles className="h-3 w-3 text-accent" />
              Foreslå rute
            </button>
          )}
          {(job.customer_phone || itemCount > 1 || job.notes) && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-expanded={expanded}
              title={expanded ? "Skjul ydelser, telefon og note" : "Vis ydelser, telefon og note"}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors focus-visible:bg-secondary focus-visible:text-foreground focus-visible:outline-none"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {expanded ? "Skjul mere" : "Mere info"}
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="px-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-border/50 bg-secondary/20">
          {job.customer_phone && (
            <a
              href={`tel:${job.customer_phone}`}
              className="text-[11px] text-foreground hover:text-primary flex items-center gap-1.5"
            >
              <Phone className="h-3 w-3 shrink-0" />
              {job.customer_phone}
            </a>
          )}
          {itemCount > 1 && (
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Ydelser</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-[11px] text-foreground/80">
                  <span className="truncate">
                    {item.quantity > 1 && <span className="text-muted-foreground">{item.quantity}× </span>}
                    {item.service_name}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {Math.round(Number(item.total_price))} kr
                  </span>
                </div>
              ))}
            </div>
          )}
          {job.notes && (
            <div className="flex items-start gap-1.5 text-[11px] text-foreground/70 italic bg-background rounded px-2 py-1.5">
              <StickyNote className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
              <span className="leading-snug">{job.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
