import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  MapPin, Phone,
  StickyNote, ChevronDown, ChevronRight, Route as RouteIcon, Lock,
  Info, Check, Repeat,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { da } from "date-fns/locale";
import { relativeFromNow } from "@/lib/relative-time";
import { parseInterval, formatInterval } from "@/lib/interval";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CARD_BASE, CARD_BORDER, CARD_HOVER, CARD_SELECTED, SEGMENT_BTN } from "./lib/card-styles";
import { IndustryIcon } from "@/components/IndustryIcon";

/** Skeleton-version af kortet — bruges mens aftaler/GPS-status indlæses.
 *  Matcher kortets højde og indre struktur så listen ikke "hopper" når
 *  rigtige kort kommer ind. */
export const UnassignedJobCardSkeleton = ({ compact = false }: { compact?: boolean }) => (
  <div className="relative rounded-[5px] border border-border/60 bg-card overflow-hidden flex">
    <div className="w-[3px] bg-secondary shrink-0" />
    <div className={`flex-1 ${compact ? "p-2 pl-7" : "p-2.5 pl-8"} space-y-1.5`}>
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
  /** Kompakt visning til den smalle aftalepool. */
  compact?: boolean;
};

/** Vis datoen uden at udlede et planlagt klokkeslæt eller en timebaseret forsinkelse. */
const getSchedule = (d?: string | null) => {
  if (!d) return null;
  const date = parseISO(d);
  const diff = differenceInDays(date, new Date());
  let relative: string | null;
  if (isPast(date) && !isToday(date)) {
    relative = Math.abs(diff) === 1 ? "1 dag forsinket" : `${Math.abs(diff)} dage forsinket`;
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
        pillBg: "bg-transparent",
        pillText: "text-amber-700 dark:text-amber-300",
        pillBorder: "border-transparent",
        pulse: false,
        label: "Afventer kunde",
      }
    : schedule?.dotTone === "bg-destructive"
    ? {
        rail: "bg-destructive",
        pillBg: "bg-transparent",
        pillText: "text-destructive",
        pillBorder: "border-transparent",
        pulse: false,
        label: schedule?.relative ? schedule.relative.charAt(0).toUpperCase() + schedule.relative.slice(1) : "Forsinket",
      }
    : schedule?.dotTone === "bg-orange-500"
    ? {
        rail: "bg-orange-500",
        pillBg: "bg-transparent",
        pillText: "text-orange-700 dark:text-orange-300",
        pillBorder: "border-transparent",
        pulse: false,
        label: "I dag",
      }
    : schedule?.dotTone === "bg-amber-500"
    ? {
        rail: "bg-amber-500",
        pillBg: "bg-transparent",
        pillText: "text-amber-700 dark:text-amber-300",
        pillBorder: "border-transparent",
        pulse: false,
        label: "I morgen",
      }
    : schedule?.dotTone === "bg-primary"
    ? {
        rail: "bg-foreground/40",
        pillBg: "bg-transparent",
        pillText: "text-foreground/70",
        pillBorder: "border-transparent",
        pulse: false,
        label: schedule?.dayLabel ?? "Denne uge",
      }
    : {
        rail: "bg-muted-foreground/25",
        pillBg: "bg-transparent",
        pillText: "text-muted-foreground",
        pillBorder: "border-transparent",
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
      style={isDragging ? { opacity: 0.62 } : undefined}
      aria-label={isPending
        ? `${job.customer_name} — afventer kundens godkendelse`
        : `${job.customer_name} — træk for at planlægge, klik for detaljer`}
      aria-roledescription={isPending ? undefined : "Aftalekort — kan trækkes"}
      aria-describedby={isPending ? undefined : "unassigned-drag-instructions"}
      className={cn(
        CARD_BASE,
        "flex min-h-[76px] 2xl:min-h-[84px]",
        isPending ? "" : "cursor-grab active:cursor-grabbing touch-none",
        isPending ? "" : "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:outline-none",
        isDragging
          ? "border-dashed border-accent bg-accent/[0.06] shadow-lg ring-2 ring-accent/20"
          : isPending
          ? "border-amber-300/60 dark:border-amber-500/35"
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
        className={`w-[3px] shrink-0 ${selected ? "bg-accent" : urgency.rail}`}
      />

      {/* Multi-select er altid synlig. Handlinger må ikke afhænge af panelbredde eller hover. */}
      {!isPending && onToggleSelect && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(e); }}
          aria-label={selected ? "Fravælg aftale" : "Vælg aftale"}
          aria-pressed={selected}
          title={selected ? "Fravælg aftale" : "Vælg flere aftaler"}
          className={`absolute top-1.5 left-1.5 z-10 h-6 w-6 rounded-[4px] border flex items-center justify-center transition-colors cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:outline-none ${
            selected
              ? "bg-accent border-accent text-accent-foreground opacity-100"
              : anySelected
                ? "bg-card border-accent/70 hover:bg-accent/10 hover:border-accent opacity-100"
                : "bg-card border-border hover:border-accent hover:bg-accent/5 opacity-100"
          }`}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3.5} />}
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
        className={`${compact ? "px-2 py-1.5 pl-9" : "px-2.5 py-2 pl-9"} space-y-1.5 ${isPending ? "" : "cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent focus-visible:outline-none"}`}
      >
        {/* TOP-LINJE: navn + dato-pille. Navn er stærkeste typografi.
            Dato-pillen ankrer urgency i højre side uden tungt bånd. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Stor, tintet branche-ikon-tile foran kundenavnet — gør det
                muligt at scanne aftalens type (rengøring/vinduer/have/...)
                uden at læse teksten. Bruger samme ikon-pakke som services
                og ordrer. */}
            {!isPending && items[0]?.service_name && (
              <span
                aria-hidden
                title={items[0].service_name}
                className={cn(
                  "shrink-0 inline-flex items-center justify-center rounded-md bg-secondary/70 ring-1 ring-border/60",
                  compact ? "h-6 w-6 p-1" : "h-7 w-7 p-1.5",
                )}
              >
                <IndustryIcon
                  name={items[0].service_name}
                  className="h-full w-full object-contain"
                  alt=""
                />
              </span>
            )}
            <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold capitalize leading-tight text-foreground">
              {isPending && <Lock className="inline h-3 w-3 mr-1 text-amber-600 align-[-1px]" />}
              {job.customer_name}
            </h3>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums leading-none ${urgency.pillText}`}>
            <span aria-hidden className={`h-1 w-1 rounded-full ${urgency.rail}`} />
            {urgency.label}
          </span>
        </div>

        {/* SERVICE + PRIS — flad baseline-linje, ingen tinted bg-blok. */}
        {itemCount > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs text-muted-foreground truncate leading-snug min-w-0 flex-1">
              {items[0].quantity > 1 && <span className="tabular-nums">{items[0].quantity}× </span>}
              <span className="text-foreground/80 font-medium">{items[0].service_name}</span>
              {itemCount > 1 && <span> · +{itemCount - 1}</span>}
            </p>
            {displayAmount != null && (
              <span className="shrink-0 text-[13px] font-bold text-foreground tabular-nums tracking-tight leading-none">
                {Math.round(Number(displayAmount || 0))}
                <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">kr</span>
              </span>
            )}
          </div>
        )}

        {/* Pending-forklaring */}
        {isPending && (
          <div className="rounded-md border border-amber-200/60 px-2 py-1.5 space-y-1 dark:border-amber-500/25">
            <p className="text-[10.5px] leading-snug text-amber-800 dark:text-amber-200">
              Aftalen kan først planlægges når kunden har godkendt tilbuddet.
            </p>
            {onClick && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-900 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-100 underline underline-offset-2"
              >
                <Info className="h-2.5 w-2.5" />
                Se årsag og send påmindelse
              </button>
            )}
          </div>
        )}

        {/* INFO-LINJE — én samlet metadata-linje: adresse · interval · tid */}
        {!isPending && (
          <div className="flex flex-nowrap items-center gap-x-2 overflow-hidden text-[10.5px] text-muted-foreground leading-tight tabular-nums">
            {fullAddress && (
              <span
                className="inline-flex items-center gap-1 min-w-0 max-w-full"
                title={hasGps ? "Adressen er fundet på kortet" : "Adressen mangler GPS — ruten kan ikke vises på kort"}
              >
                <MapPin className={`h-3 w-3 shrink-0 ${hasGps ? "text-muted-foreground/50" : "text-orange-500"}`} />
                <span className="truncate">{fullAddress}</span>
              </span>
            )}

            {!compact && (
              <span className="inline-flex items-center gap-1">
                {isRecurring && <Repeat className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
                <span className="truncate">{intervalLabel}</span>
              </span>
            )}

            {job.preferred_route_name && !compact && (
              <span className="inline-flex items-center gap-1 min-w-0">
                <RouteIcon className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                <span className="truncate">{job.preferred_route_name}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          3) ACTION-BÅND — "Vælg rute" åbner dialog hvor brugeren
             selv vælger blandt forslag (modsat header-knappens auto-fordel).
             Diskret styling så den ikke konkurrerer med auto-fordel-flowet.
         ─────────────────────────────────────────────────────────────────── */}
      {!compact && !isPending && (onSuggestRoute || job.customer_phone || itemCount > 1 || job.notes) && (
        <div className="flex border-t border-border divide-x divide-border bg-secondary/20">
          {onSuggestRoute && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSuggestRoute(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`flex-1 px-2 py-1.5 text-[10.5px] font-semibold ${SEGMENT_BTN}`}
              title="Se forslag til ruter og vælg selv hvilken aftalen skal lægges på"
            >
              <RouteIcon className="h-3 w-3" />
              Vælg rute
            </button>
          )}
          {(job.customer_phone || itemCount > 1 || job.notes) && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-expanded={expanded}
              title={expanded ? "Skjul ydelser, telefon og note" : "Vis ydelser, telefon og note"}
              className={`flex-1 px-2 py-1.5 text-[10.5px] font-semibold ${SEGMENT_BTN}`}
            >
              {expanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
              {expanded ? "Skjul" : "Mere info"}
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="px-2.5 pb-2 pt-1.5 space-y-1 border-t border-border/60 bg-secondary/20">
          {job.customer_phone && (
            <a
              href={`tel:${job.customer_phone}`}
              className="text-[11px] text-foreground hover:text-foreground/70 flex items-center gap-1.5 tabular-nums"
            >
              <Phone className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
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
