import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  GripVertical, MapPin, Clock, Phone,
  StickyNote, ChevronDown, ChevronRight, Route as RouteIcon, Lock, Sparkles,
  Info,
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
  <div className={`rounded-lg border border-border/60 bg-card ${compact ? "p-2" : "p-2.5"} space-y-1.5`}>
    <div className="flex items-start gap-2">
      <Skeleton className="h-5 w-5 rounded shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Skeleton className="h-3.5 w-12 rounded-full" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
          <Skeleton className="h-3 w-10 rounded shrink-0" />
        </div>
        <Skeleton className="h-2.5 w-3/4 rounded" />
        <Skeleton className="h-2.5 w-2/3 rounded" />
      </div>
    </div>
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

  return (
    <div
      ref={setNodeRef}
      {...(isPending ? {} : listeners)}
      {...(isPending ? {} : attributes)}
      style={{ opacity: isDragging ? 0.4 : 1 }}
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
      {selected && !isPending && (
        <span aria-hidden className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />
      )}
      {/* Top row: status-affordance (lås / checkbox / diskret grip) + indhold.
          Hele kortet er draggable — venstre-elementet er KUN til status og
          multi-select, aldrig en separat drag-handle. */}
      <div className={`flex items-start gap-2 ${compact ? "p-2" : "p-2.5"}`}>
        {isPending ? (
          <div
            className="shrink-0 mt-0.5 h-5 w-5 inline-flex items-center justify-center rounded text-amber-500"
            title="Aftalen skal godkendes før den kan lægges på en rute"
            aria-label={`${job.customer_name} skal godkendes før den kan flyttes`}
          >
            <Lock className="h-3.5 w-3.5" />
          </div>
        ) : onToggleSelect && (selected || anySelected) ? (
          // Bulk-mode aktiv ELLER kortet er valgt: vis checkbox i stedet for grip.
          // Når mindst ét kort er valgt, gør vi checkboksen permanent synlig på
          // alle kort, så brugeren let kan vælge flere uden at gætte sig frem.
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(e); }}
            aria-label={selected ? "Fravælg aftale" : "Vælg aftale"}
            aria-pressed={selected}
            title={selected ? "Fravælg" : "Vælg"}
            className={`shrink-0 mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
              selected
                ? "bg-accent border-accent text-accent-foreground"
                : "border-accent/60 hover:bg-accent/10"
            }`}
          >
            {selected && <span className="text-[10px] leading-none">✓</span>}
          </button>
        ) : (
          // Default: diskret grip kun som visuel påmindelse om at kortet kan
          // trækkes — IKKE et separat drag-target. Hele kortet er draggable.
          // Lille checkbox-knap vises kun mens man hover'er, så man kan starte
          // bulk-select uden at den fylder i normal visning.
          <div className="shrink-0 mt-0.5 relative h-5 w-5 pointer-events-none">
            <span
              aria-hidden
              className="absolute inset-0 inline-flex items-center justify-center text-muted-foreground/60 group-hover:opacity-0 transition-opacity"
            >
              <GripVertical className="h-4 w-4" />
            </span>
            {onToggleSelect && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onToggleSelect(e); }}
                aria-label="Vælg aftale"
                title="Vælg"
                className="pointer-events-auto absolute inset-0 m-0.5 rounded border border-border hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              />
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onClick}
          aria-label={`Åbn detaljer for ${job.customer_name}`}
          className={`flex-1 min-w-0 text-left cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${compact ? "space-y-1" : "space-y-1.5"}`}
        >
          {/* Header: dag-pille (tydeligst signal) + navn + pris */}
          {/* Header layout:
              - Lille skærm: dag-pille + pris på linje 1, navn på linje 2 (ingen overlap).
              - Bredere kort: alt på én linje med navn der truncater.
              Dag-pille og pris er begge shrink-0 så navnet altid giver plads først. */}
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {schedule && (
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${schedule.tone}`}
                  style={{
                    backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)",
                  }}
                >
                  <span className={`h-1 w-1 rounded-full ${schedule.dotTone}`} />
                  {schedule.dayLabel}
                </span>
              )}
              <p className="text-[13px] font-semibold leading-snug text-foreground truncate min-w-0 flex-1">
                {job.customer_name}
              </p>
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground tabular-nums tracking-tight">
                {Math.round(Number(displayAmount || 0))} kr
              </span>
            </div>
          </div>
          {itemCount > 0 && (
            <p className="text-[11px] text-muted-foreground truncate">
              {items[0].quantity > 1 && <span className="text-foreground/70">{items[0].quantity}× </span>}
              {items[0].service_name}
              {itemCount > 1 && <span className="opacity-70"> · +{itemCount - 1} mere</span>}
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
              className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5"
              title={hasGps ? "Adressen er fundet på kortet" : "Adressen mangler GPS — ruten kan ikke vises på kort"}
            >
              <MapPin className={`h-3 w-3 shrink-0 ${hasGps ? "text-muted-foreground/70" : "text-orange-500"}`} />
              <span className="truncate">{fullAddress}</span>
            </p>
          )}

          {/* Meta-linje: relativ tid + tid + varighed + interval — uden dag-prik (er nu i pillen øverst) */}
          {((schedule?.relative && !compact) || job.preferred_time_start || estimatedMin != null || !compact) && (
            <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[11px] min-w-0 text-muted-foreground">
              {schedule?.relative && !compact && (
                <span className={`${schedule.tone} font-medium truncate`}>{schedule.relative}</span>
              )}
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
        </button>
      </div>

      {/* Samlet actions-bar: "Foreslå rute" + "Detaljer" på én række i stedet for to */}
      {!compact && !isPending && (onSuggestRoute || job.customer_phone || itemCount > 1 || job.notes) && (
        <div className="flex border-t border-border/50 divide-x divide-border/50 text-[11px]">
          {onSuggestRoute && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSuggestRoute(); }}
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
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors focus-visible:bg-secondary focus-visible:text-foreground focus-visible:outline-none"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {expanded ? "Skjul" : "Detaljer"}
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
