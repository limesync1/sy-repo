import { useState } from "react";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
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
import { CalendarPlus } from "lucide-react";

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
  onChooseRoute?: () => void;
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
  job, onClick, onChooseRoute, onFindFreeSlot,
  selected, anySelected, onToggleSelect, compact = false,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const isCompact = useIsBelowBreakpoint(1024);
  const isPending = job.status === "pending";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `job-${job.id}`,
    data: { type: "job", job },
    disabled: isPending || isCompact,
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

  const canSelect = !isPending && !!onToggleSelect;
  const serviceLine = itemCount > 0
    ? `${items[0].quantity > 1 ? `${items[0].quantity}× ` : ""}${items[0].service_name}${itemCount > 1 ? ` +${itemCount - 1}` : ""}`
    : null;

  return (
    <div
      ref={setNodeRef}
      {...(isPending || isCompact ? {} : listeners)}
      {...(isPending || isCompact ? {} : attributes)}
      style={isDragging ? { opacity: 0.62 } : undefined}
      aria-label={isPending
        ? `${job.customer_name} — afventer kundens godkendelse`
        : isCompact
          ? `${job.customer_name} — tryk for detaljer eller vælg Læg på rute`
          : `${job.customer_name} — træk for at planlægge, klik for detaljer`}
      aria-roledescription={isPending ? undefined : isCompact ? "Aftalekort" : "Aftalekort — kan trækkes"}
      aria-describedby={isPending || isCompact ? undefined : "unassigned-drag-instructions"}
      className={cn(
        CARD_BASE,
        "planner-job-card group flex",
        isPending || isCompact ? "touch-pan-y" : "cursor-grab active:cursor-grabbing touch-none",
        isDragging
          ? "border-dashed border-accent bg-accent/[0.06] shadow-lg ring-2 ring-accent/20"
          : isPending
          ? "border-amber-300/60 dark:border-amber-500/35"
          : selected
            ? CARD_SELECTED
            : cn(CARD_BORDER, CARD_HOVER),
      )}
    >
      <div aria-hidden className={cn("w-[3px] shrink-0", selected ? "bg-accent" : urgency.rail)} />

      {canSelect && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleSelect!(e); }}
          aria-label={selected ? `Fravælg ${job.customer_name}` : `Vælg ${job.customer_name}`}
          aria-pressed={selected}
          title={selected ? "Fravælg" : "Vælg flere aftaler"}
          className="flex w-10 shrink-0 items-center justify-center border-0 bg-transparent p-0 !shadow-none outline-none ring-0 touch-manipulation group/check"
        >
          <span
            className={cn(
              "flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-[1.5px] transition-colors group-focus-visible/check:ring-2 group-focus-visible/check:ring-accent",
              selected
                ? "border-accent bg-accent text-accent-foreground"
                : anySelected
                  ? "border-accent/60 bg-card group-hover/check:bg-accent/10"
                  : "border-muted-foreground/40 bg-card group-hover/check:border-accent",
            )}
          >
            {selected && <Check className="h-3 w-3" strokeWidth={3.5} />}
          </span>
        </button>
      )}

      <div className="min-w-0 flex-1 flex flex-col">
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
          className={cn(
            "flex-1 py-2.5 pr-3 space-y-1",
            canSelect ? "pl-0" : "pl-3",
            !isPending && "cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent focus-visible:outline-none",
          )}
        >
          {/* Linje 1: navn + pris */}
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-foreground">
              {isPending && <Lock className="inline h-3 w-3 mr-1 text-amber-600 align-[-1px]" />}
              {job.customer_name}
            </h3>
            {displayAmount != null && (
              <span className="shrink-0 text-sm font-bold leading-5 tabular-nums text-foreground">
                {Math.round(Number(displayAmount || 0)).toLocaleString("da-DK")}
                <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">kr</span>
              </span>
            )}
          </div>

          {/* Linje 2: ydelse */}
          {serviceLine && (
            <p className="truncate text-xs leading-4 text-foreground/75">{serviceLine}</p>
          )}

          {/* Linje 3: adresse */}
          {!isPending && fullAddress && (
            <p
              className="flex items-center gap-1 text-xs leading-4 text-muted-foreground"
              title={hasGps ? fullAddress : `${fullAddress} — adressen kunne ikke placeres på kortet`}
            >
              <MapPin className={cn("h-3 w-3 shrink-0", hasGps ? "text-muted-foreground/60" : "text-orange-500")} />
              <span className="truncate">{fullAddress}</span>
            </p>
          )}

          {/* Linje 4: dato + interval */}
          {!isPending && (
            <div className="flex items-center gap-2 pt-0.5 text-[11px] leading-4">
              <span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold tabular-nums", urgency.pillText)}>
                <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", urgency.rail)} />
                {urgency.label}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                {isRecurring && <Repeat className="h-3 w-3 shrink-0 opacity-60" />}
                <span className="truncate">{intervalLabel}</span>
              </span>
              {job.notes && (
                <span title={job.notes} className="ml-auto inline-flex shrink-0 items-center text-muted-foreground">
                  <StickyNote className="h-3 w-3" aria-label="Har note" />
                </span>
              )}
            </div>
          )}

          {isPending && (
            <div className="space-y-1 pt-0.5">
              <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                Kan planlægges, når kunden har godkendt tilbuddet.
              </p>
              {onClick && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClick(); }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 underline underline-offset-2 dark:text-amber-200"
                >
                  <Info className="h-3 w-3" />
                  Se årsag og send påmindelse
                </button>
              )}
            </div>
          )}
        </div>

        {/* På touch/mobil kan kort ikke trækkes — derfor en tydelig knap. */}
        {isCompact && !isPending && onChooseRoute && (
          <div className="px-3 pb-2.5" style={{ paddingLeft: canSelect ? 0 : undefined }}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onChooseRoute(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="h-9 w-full gap-1.5 text-xs font-semibold"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Læg på rute
            </Button>
          </div>
        )}
      </div>

      {/* Desktop: diskret "Læg på rute" ved hover/fokus — træk virker også. */}
      {!isCompact && !isPending && onChooseRoute && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onChooseRoute(); }}
          title="Læg på rute"
          aria-label={`Læg ${job.customer_name} på rute`}
          className="flex w-9 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground opacity-60 transition hover:bg-secondary hover:text-foreground hover:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          <CalendarPlus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
