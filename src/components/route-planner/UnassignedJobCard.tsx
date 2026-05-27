import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  MapPin, Clock, Phone,
  StickyNote, ChevronDown, ChevronRight, Route as RouteIcon, Lock, Sparkles,
  Info, Check, Repeat, Hourglass,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { da } from "date-fns/locale";
import { formatDurationMin } from "@/lib/duration-format";
import { relativeFromNow } from "@/lib/relative-time";
import { parseInterval, formatInterval } from "@/lib/interval";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton-version af kortet — bruges mens aftaler/GPS-status indlæses.
 *  Matcher kortets højde og indre struktur så listen ikke "hopper" når
 *  rigtige kort kommer ind. */
export const UnassignedJobCardSkeleton = ({ compact = false }: { compact?: boolean }) => (
  <div className="relative rounded-xl border border-border/70 bg-card overflow-hidden flex">
    <div className="w-1 bg-secondary shrink-0" />
    <div className={`flex-1 ${compact ? "p-2.5" : "p-3"} space-y-2`}>
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

  // Status-tema for header-båndet øverst på kortet. Hver urgency-niveau har sin
  // egen bg/border/tekst/dot-farve, så ejeren scanner status før alt andet.
  // Det stærke bånd erstatter den gamle venstre-stribe — synligt selv i en lang liste.
  type StatusTheme = {
    headerBg: string;
    headerBorder: string;
    headerText: string;
    metaText: string;
    dot: string;
    pulse: boolean;
    label: string;
  };
  const statusTheme: StatusTheme = isPending
    ? {
        headerBg: "bg-amber-50",
        headerBorder: "border-amber-200",
        headerText: "text-amber-700",
        metaText: "text-amber-600",
        dot: "bg-amber-500",
        pulse: false,
        label: "Afventer kunde",
      }
    : schedule?.dotTone === "bg-destructive"
    ? {
        headerBg: "bg-destructive/10",
        headerBorder: "border-destructive/30",
        headerText: "text-destructive",
        metaText: "text-destructive/80",
        dot: "bg-destructive",
        pulse: true,
        label: "Forsinket",
      }
    : schedule?.dotTone === "bg-orange-500"
    ? {
        headerBg: "bg-orange-50 dark:bg-orange-500/10",
        headerBorder: "border-orange-200 dark:border-orange-500/30",
        headerText: "text-orange-700 dark:text-orange-400",
        metaText: "text-orange-600 dark:text-orange-400/80",
        dot: "bg-orange-500",
        pulse: true,
        label: "I dag",
      }
    : schedule?.dotTone === "bg-amber-500"
    ? {
        headerBg: "bg-amber-50 dark:bg-amber-500/10",
        headerBorder: "border-amber-200 dark:border-amber-500/30",
        headerText: "text-amber-700 dark:text-amber-400",
        metaText: "text-amber-600 dark:text-amber-400/80",
        dot: "bg-amber-500",
        pulse: false,
        label: "I morgen",
      }
    : schedule?.dotTone === "bg-primary"
    ? {
        headerBg: "bg-primary/8",
        headerBorder: "border-primary/20",
        headerText: "text-foreground",
        metaText: "text-muted-foreground",
        dot: "bg-primary",
        pulse: false,
        label: "Denne uge",
      }
    : {
        headerBg: "bg-secondary/60",
        headerBorder: "border-border",
        headerText: "text-foreground/80",
        metaText: "text-muted-foreground",
        dot: "bg-muted-foreground/60",
        pulse: false,
        label: schedule?.relative ? schedule.relative.charAt(0).toUpperCase() + schedule.relative.slice(1) : "Ikke planlagt",
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
      className={`group relative rounded-xl border bg-card transition-all duration-200 overflow-hidden ${
        isPending ? "" : "cursor-grab active:cursor-grabbing touch-none"
      } ${
        isPending
          ? "border-amber-300/60"
          : selected
            ? "border-accent ring-2 ring-accent/30 shadow-md"
            : "border-border/70 hover:border-foreground/30 hover:shadow-md hover:-translate-y-px"
      }`}
    >
      {/* ───────────────────────────────────────────────────────────────────
          1) STATUS-BÅND øverst — kortets identitet. Farvekodet på urgency:
             rød=forsinket, orange=i dag (pulserer), gul=i morgen,
             primary=denne uge, neutral=senere, amber=afventer kunde.
             Brugeren ved status før noget andet.
         ─────────────────────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between gap-2 px-3 py-1.5 border-b ${statusTheme.headerBg} ${statusTheme.headerBorder}`}>
        <div className={`flex items-center gap-1.5 min-w-0 ${statusTheme.headerText}`}>
          {isPending ? (
            <Lock className="h-3 w-3 shrink-0" />
          ) : (
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full shrink-0 ${statusTheme.dot} ${statusTheme.pulse ? "animate-pulse" : ""}`}
            />
          )}
          <span className="text-[10.5px] font-bold uppercase tracking-wider truncate">
            {statusTheme.label}
          </span>
        </div>
        {schedule && (
          <span className={`shrink-0 text-[10.5px] font-medium tabular-nums ${statusTheme.metaText}`}>
            {schedule.dayLabel}
          </span>
        )}
      </div>

      {/* Multi-select knap — overlay i top-venstre hjørne på header-båndet.
          Vises permanent når valgt/bulk-mode, ellers kun på hover. */}
      {!isPending && onToggleSelect && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(e); }}
          aria-label={selected ? "Fravælg aftale" : "Vælg aftale"}
          aria-pressed={selected}
          title={selected ? "Fravælg" : "Vælg flere aftaler"}
          className={`absolute top-1.5 right-2 z-10 h-4 w-4 rounded border flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
            selected
              ? "bg-accent border-accent text-accent-foreground opacity-100"
              : anySelected
                ? "bg-card border-accent/60 hover:bg-accent/10 opacity-100"
                : "bg-card/80 backdrop-blur border-border hover:border-accent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </button>
      )}

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
        className={`${compact ? "p-2.5" : "p-3"} ${compact ? "space-y-2" : "space-y-2.5"} ${isPending ? "" : "cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent focus-visible:outline-none"}`}
      >
        {/* WHO + PRICE — den primære identitet på kortet.
            Navn er kortets stærkeste typografi; pris ankrer højre side.
            Hover-tint på navn antyder at kortet er klikbart. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className={`${compact ? "text-[14px]" : "text-[15px]"} font-bold leading-tight text-foreground truncate capitalize group-hover:text-accent transition-colors`}>
              {job.customer_name}
            </h3>
            {itemCount > 0 && (
              <p className="mt-0.5 text-[12px] font-medium text-muted-foreground truncate leading-snug">
                {items[0].quantity > 1 && <span>{items[0].quantity}× </span>}
                {items[0].service_name}
                {itemCount > 1 && <span className="opacity-70"> · +{itemCount - 1} mere</span>}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right leading-none">
            <span className={`${compact ? "text-[14px]" : "text-[15px]"} font-bold text-foreground tabular-nums tracking-tight`}>
              {Math.round(Number(displayAmount || 0))}
            </span>
            <span className="ml-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">kr</span>
          </div>
        </div>

        {/* Pending-forklaring */}
        {isPending && (
          <div className="rounded-md bg-amber-50 border border-amber-200/70 px-2 py-1.5 space-y-1">
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
                className="flex items-center gap-1.5 text-muted-foreground"
                title={hasGps ? "Adressen er fundet på kortet" : "Adressen mangler GPS — ruten kan ikke vises på kort"}
              >
                <MapPin className={`h-3.5 w-3.5 shrink-0 ${hasGps ? "text-muted-foreground/60" : "text-orange-500"}`} />
                <span className="text-[12px] truncate leading-tight">{fullAddress}</span>
              </div>
            )}

            {/* Tid + varighed (kun hvis aftalen har et tidsvindue) */}
            {(job.preferred_time_start || estimatedMin != null) && !compact && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
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
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                isRecurring
                  ? "bg-primary/5 border-primary/15"
                  : "bg-secondary/50 border-border/60"
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
              <div className="flex items-center gap-1.5 text-muted-foreground">
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
          3) ACTION-BÅND — "Foreslå rute" som primær handling i accent,
             sekundær "Mere info" som diskret toggle hvis der er data at vise.
         ─────────────────────────────────────────────────────────────────── */}
      {!compact && !isPending && (onSuggestRoute || job.customer_phone || itemCount > 1 || job.notes) && (
        <div className="flex border-t border-border/50 divide-x divide-border/50">
          {onSuggestRoute && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSuggestRoute(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-accent hover:bg-accent/8 transition-colors focus-visible:bg-accent/10 focus-visible:outline-none"
              title="Foreslå bedste rute baseret på afstand, kapacitet og færdigheder"
            >
              <Sparkles className="h-3.5 w-3.5" />
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
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors focus-visible:bg-secondary focus-visible:text-foreground focus-visible:outline-none"
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {expanded ? "Skjul" : "Mere info"}
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
