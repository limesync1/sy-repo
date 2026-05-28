import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  MapPin, Clock, Phone,
  StickyNote, ChevronDown, ChevronRight, Route as RouteIcon, Lock,
  Info, Check, Repeat, Hourglass,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { da } from "date-fns/locale";
import { formatDurationMin } from "@/lib/duration-format";
import { relativeFromNow } from "@/lib/relative-time";
import { parseInterval, formatInterval } from "@/lib/interval";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CARD_BASE, CARD_BORDER, CARD_HOVER, CARD_SELECTED, CARD_DRAGGING, CARD_RAIL_WIDTH } from "./lib/card-styles";

/** Skeleton-version af kortet — bruges mens aftaler/GPS-status indlæses.
 *  Matcher kortets højde og indre struktur så listen ikke "hopper" når
 *  rigtige kort kommer ind. */
export const UnassignedJobCardSkeleton = ({ compact = false }: { compact?: boolean }) => (
  <div className="relative rounded-xl border border-border/70 bg-card overflow-hidden flex shadow-[0_1px_2px_hsl(var(--foreground)/0.05)]">
    <div className="w-1 bg-secondary shrink-0" />
    <div className={`flex-1 ${compact ? "p-2.5 pl-8" : "p-3 pl-9"} space-y-2`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-3 w-10 rounded" />
        </div>
      </div>
      <Skeleton className="h-3 w-3/4 rounded" />
      <Skeleton className="h-6 w-2/3 rounded-md" />
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

  // Urgency-tema. Én farve, brugt på venstre-rail + dato-pille — ingen tunge
  // farvebånd der konkurrerer med navn/pris. Brugeren scanner urgency via
  // rail-farven, og læser konkret dato i pillen.
  type UrgencyTheme = {
    rail: string;
    pillBg: string;
    pillText: string;
    pillBorder: string;
    pulse: boolean;
    label: string;
  };
  const urgency: UrgencyTheme = isPending
    ? {
        rail: "bg-amber-400",
        pillBg: "bg-amber-50 dark:bg-amber-500/10",
        pillText: "text-amber-700 dark:text-amber-300",
        pillBorder: "border-amber-200 dark:border-amber-500/30",
        pulse: false,
        label: "Afventer kunde",
      }
    : schedule?.dotTone === "bg-destructive"
    ? {
        rail: "bg-destructive",
        pillBg: "bg-destructive/10",
        pillText: "text-destructive",
        pillBorder: "border-destructive/30",
        pulse: true,
        label: schedule?.relative ? schedule.relative.charAt(0).toUpperCase() + schedule.relative.slice(1) : "Forsinket",
      }
    : schedule?.dotTone === "bg-orange-500"
    ? {
        rail: "bg-orange-500",
        pillBg: "bg-orange-50 dark:bg-orange-500/10",
        pillText: "text-orange-700 dark:text-orange-300",
        pillBorder: "border-orange-200 dark:border-orange-500/30",
        pulse: true,
        label: "I dag",
      }
    : schedule?.dotTone === "bg-amber-500"
    ? {
        rail: "bg-amber-500",
        pillBg: "bg-amber-50 dark:bg-amber-500/10",
        pillText: "text-amber-700 dark:text-amber-300",
        pillBorder: "border-amber-200 dark:border-amber-500/30",
        pulse: false,
        label: "I morgen",
      }
    : schedule?.dotTone === "bg-primary"
    ? {
        rail: "bg-primary",
        pillBg: "bg-primary/10",
        pillText: "text-foreground",
        pillBorder: "border-primary/20",
        pulse: false,
        label: schedule?.dayLabel ?? "Denne uge",
      }
    : {
        rail: "bg-muted-foreground/30",
        pillBg: "bg-secondary",
        pillText: "text-muted-foreground",
        pillBorder: "border-border",
        pulse: false,
        label: schedule?.dayLabel ?? "Ikke planlagt",
      };

  // Interval-info — parsed til en enkelt linje. Vises som integreret chip-row
  // (med subtil tinted bg) i stedet for en separat badge øverst.
  const intervalRaw = items.find((it: any) => it.details?.interval)?.details?.interval;
  const parsedInterval = parseInterval(intervalRaw);
  const isRecurring = !!parsedInterval && !parsedInterval.once;
  const intervalLabel = parsedInterval
    ? (isRecurring
        ? (isFirstOccurrence ? `Opstart · ${formatInterval(intervalRaw)}` : formatInterval(intervalRaw))
        : "Engangsaftale")
    : "Engangsaftale";

  return (
    <div
      ref={setNodeRef}
      {...(isPending ? {} : listeners)}
      {...(isPending ? {} : attributes)}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      aria-label={isPending
        ? `${job.customer_name} — afventer kundens godkendelse`
        : `${job.customer_name} — træk for at planlægge, klik for detaljer`}
      className={cn(
        CARD_BASE,
        "flex",
        isPending ? "" : "cursor-grab active:cursor-grabbing touch-none",
        isDragging && CARD_DRAGGING,
        isPending
          ? "border-amber-300/60"
          : selected
            ? CARD_SELECTED
            : cn(CARD_BORDER, CARD_HOVER),
      )}
    >
      {/* ───────────────────────────────────────────────────────────────────
          1) VENSTRE-RAIL — urgency som farvet stribe (rød/orange/gul/primary).
             Når kortet er valgt, bliver railen accent-farvet.
             Pulserer kun ved akutte tilfælde. Ingen tung header-bånd.
         ─────────────────────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className={`w-1 shrink-0 ${selected ? "bg-accent" : urgency.rail} ${urgency.pulse ? "animate-pulse" : ""}`}
      />

      {/* MULTI-SELECT — stor, altid-synlig dedikeret zone i venstre side.
          22×22px hit-area, opacity-100 når valg-mode er aktiv, ellers
          synlig på hover med tydelig border. Stopper drag-listeners så
          klikket aldrig misforstås som træk. */}
      {!isPending && onToggleSelect && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(e); }}
          aria-label={selected ? "Fravælg aftale" : "Vælg aftale"}
          aria-pressed={selected}
          title={selected ? "Fravælg aftale" : "Vælg flere aftaler"}
          className={`absolute top-2.5 left-2.5 z-10 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:outline-none ${
            selected
              ? "bg-accent border-accent text-accent-foreground opacity-100 shadow-sm"
              : anySelected
                ? "bg-card border-accent/70 hover:bg-accent/10 hover:border-accent opacity-100"
                : "bg-card border-border hover:border-accent hover:bg-accent/5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
        </button>
      )}

      <div className="flex-1 min-w-0 flex flex-col">

      {/* ───────────────────────────────────────────────────────────────────
          2) BODY — klikbart område for at åbne detaljer.
         ─────────────────────────────────────────────────────────────────── */}
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
        className={`${compact ? "p-2.5 pl-8" : "p-3 pl-9"} ${compact ? "space-y-2" : "space-y-2.5"} ${isPending ? "" : "cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent focus-visible:outline-none"}`}
      >
        {/* TOP-LINJE: navn + dato-pille. Navn er stærkeste typografi.
            Dato-pillen ankrer urgency i højre side uden tungt bånd. */}
        <div className="flex items-start justify-between gap-2">
          <h3 className={`${compact ? "text-[14px]" : "text-[15.5px]"} font-bold leading-tight text-foreground truncate capitalize group-hover:text-accent transition-colors min-w-0 flex-1`}>
            {isPending && <Lock className="inline h-3.5 w-3.5 mr-1 text-amber-600 align-[-2px]" />}
            {job.customer_name}
          </h3>
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10.5px] font-bold tracking-wide ${urgency.pillBg} ${urgency.pillText} ${urgency.pillBorder}`}
          >
            {urgency.pulse && <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${urgency.rail} animate-pulse`} />}
            {urgency.label}
          </span>
        </div>

        {/* SERVICE + PRIS — sekundær linje, baseline-justeret. */}
        {itemCount > 0 && (
          <div className="flex items-baseline justify-between gap-3 rounded-md bg-secondary/30 px-2 py-1">
            <p className="text-[12.5px] font-semibold text-foreground/80 truncate leading-snug min-w-0 flex-1">
              {items[0].quantity > 1 && <span>{items[0].quantity}× </span>}
              {items[0].service_name}
              {itemCount > 1 && <span className="text-muted-foreground"> · +{itemCount - 1} mere</span>}
            </p>
            <div className="shrink-0 leading-none">
              <span className={`${compact ? "text-[14px]" : "text-[15px]"} font-bold text-foreground tabular-nums tracking-tight`}>
                {Math.round(Number(displayAmount || 0))}
              </span>
              <span className="ml-0.5 text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">kr</span>
            </div>
          </div>
        )}

        {/* Pending-forklaring */}
        {isPending && (
          <div className="rounded-md bg-amber-50 border border-amber-200/70 px-2.5 py-2 space-y-1">
            <p className="text-[11px] leading-snug text-amber-800">
              Aftalen kan først planlægges når kunden har godkendt tilbuddet.
            </p>
            {onClick && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 hover:text-amber-950 underline underline-offset-2"
              >
                <Info className="h-3 w-3" />
                Se årsag og send påmindelse
              </button>
            )}
          </div>
        )}

        {/* INFO-STAK — adresse + interval-chip. Hver linje har sin egen rolle:
            adresse svarer på HVOR, interval-chip svarer på HVOR OFTE. */}
        {!isPending && (
          <div className="space-y-1.5">
            {fullAddress && (
              <div
                className="flex items-center gap-1.5 text-muted-foreground min-w-0"
                title={hasGps ? "Adressen er fundet på kortet" : "Adressen mangler GPS — ruten kan ikke vises på kort"}
              >
                <MapPin className={`h-3.5 w-3.5 shrink-0 ${hasGps ? "text-muted-foreground/60" : "text-orange-500"}`} />
                <span className="text-[12px] truncate leading-tight">{fullAddress}</span>
              </div>
            )}

            {/* Tid + varighed (kun hvis aftalen har et tidsvindue) */}
            {(job.preferred_time_start || estimatedMin != null) && !compact && (
              <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <span className="text-[12px] tabular-nums leading-tight">
                  {job.preferred_time_start && (
                    <>
                      {job.preferred_time_start.slice(0, 5)}
                      {job.preferred_time_end && `–${job.preferred_time_end.slice(0, 5)}`}
                    </>
                  )}
                  {job.preferred_time_start && estimatedMin != null && <span className="opacity-50"> · </span>}
                  {estimatedMin != null && formatDurationMin(estimatedMin)}
                </span>
              </div>
            )}

            {/* Interval — integreret chip i stedet for løs badge.
                Subtil tintet bg så den læses som metadata, ikke som handling. */}
            {!compact && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border ${
                isRecurring
                  ? "bg-primary/5 border-primary/15"
                  : "bg-secondary/50 border-border/70"
              }`}>
                {isRecurring
                  ? <Repeat className="h-3 w-3 shrink-0 text-primary" />
                  : <Hourglass className="h-3 w-3 shrink-0 text-muted-foreground" />}
                <span className={`text-[11px] font-semibold leading-none truncate ${
                  isRecurring ? "text-foreground/80" : "text-muted-foreground"
                }`}>
                  {intervalLabel}
                </span>
              </div>
            )}

            {/* Foreslået tidligere rute — diskret kun når relevant */}
            {job.preferred_route_name && !compact && (
              <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                <RouteIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <span className="text-[12px] truncate leading-tight">
                  Tidligere på <span className="font-medium text-foreground/80">{job.preferred_route_name}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          3) ACTION-BÅND — "Vælg rute manuelt" åbner dialog hvor brugeren
             selv vælger blandt forslag (modsat header-knappens auto-fordel).
             Diskret styling så den ikke konkurrerer med auto-fordel-flowet.
         ─────────────────────────────────────────────────────────────────── */}
      {!compact && !isPending && (onSuggestRoute || job.customer_phone || itemCount > 1 || job.notes) && (
        <div className="flex border-t border-border/70 divide-x divide-border/70 bg-card">
          {onSuggestRoute && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSuggestRoute(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-bold text-foreground/80 hover:text-foreground hover:bg-secondary/60 transition-colors focus-visible:bg-secondary focus-visible:outline-none"
              title="Se forslag til ruter og vælg selv hvilken aftalen skal lægges på"
            >
              <RouteIcon className="h-3.5 w-3.5" />
              Vælg rute manuelt
            </button>
          )}
          {(job.customer_phone || itemCount > 1 || job.notes) && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-expanded={expanded}
              title={expanded ? "Skjul ydelser, telefon og note" : "Vis ydelser, telefon og note"}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors focus-visible:bg-secondary focus-visible:text-foreground focus-visible:outline-none"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {expanded ? "Skjul" : "Mere info"}
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="px-2.5 pb-2.5 pt-2 space-y-1.5 border-t border-border/70 bg-secondary/25">
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
            <div className="flex items-start gap-1.5 text-[11px] text-foreground/70 italic bg-background rounded-md border border-border/70 px-2 py-1.5">
              <StickyNote className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
              <span className="leading-snug">{job.notes}</span>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
