import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  GripVertical, MapPin, Clock, Phone,
  StickyNote, ChevronDown, ChevronRight, Route as RouteIcon, Lock, Sparkles,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { da } from "date-fns/locale";
import { formatDurationMin } from "@/lib/duration-format";
import { relativeFromNow } from "@/lib/relative-time";
import { IntervalBadge } from "./IntervalBadge";

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
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={`group rounded-lg border bg-card transition-all overflow-hidden ${
        isPending
          ? "border-amber-300 bg-amber-50/40"
          : "hover:shadow-sm hover:border-foreground/20"
      } ${selected ? "ring-2 ring-accent border-accent shadow-sm" : ""}`}
    >
      {/* Top row: drag handle + clickable content */}
      <div className={`flex items-start gap-2 ${compact ? "p-2" : "p-3"}`}>
        {onToggleSelect && !isPending && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSelect(e); }}
            aria-label={selected ? "Fravælg aftale" : "Vælg aftale"}
            aria-pressed={selected}
            title={selected ? "Fravælg" : "Vælg"}
            className={`shrink-0 mt-1 h-4 w-4 rounded border flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
              selected
                ? "bg-accent border-accent text-accent-foreground"
                : anySelected
                  ? "border-accent/60 hover:bg-accent/10"
                  : "border-border opacity-0 group-hover:opacity-100 hover:bg-secondary"
            }`}
          >
            {selected && <span className="text-[10px] leading-none">✓</span>}
          </button>
        )}
        {/* Kun grip-håndtaget initierer drag — så kortet selv kan klikkes */}
        <button
          type="button"
          {...(isPending ? {} : listeners)}
          {...(isPending ? {} : attributes)}
          aria-label={isPending
            ? `${job.customer_name} skal godkendes før den kan flyttes`
            : `Træk ${job.customer_name} ind på en rute eller dag i kalenderen`}
          title={isPending ? "Aftalen skal godkendes før den kan lægges på en rute" : "Træk ind i kalenderen for at planlægge"}
          disabled={isPending}
          className={`shrink-0 mt-0.5 h-6 w-5 inline-flex items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
            isPending
              ? "text-amber-500 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary cursor-grab active:cursor-grabbing"
          }`}
        >
          {isPending ? <Lock className="h-3.5 w-3.5" /> : <GripVertical className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onClick}
          aria-label={`Åbn detaljer for ${job.customer_name}`}
          className={`flex-1 min-w-0 text-left cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${compact ? "space-y-1" : "space-y-2"}`}
        >
          {/* Header: navn + første ydelse som sub-label + pris. Ingen ikon foran
              navnet — kortet er allerede tydeligt en kunde, og ikonet stjal plads. */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight truncate text-foreground">
                {job.customer_name}
              </p>
              {itemCount > 0 && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {items[0].quantity > 1 && <span>{items[0].quantity}× </span>}
                  {items[0].service_name}
                  {itemCount > 1 && <span> · +{itemCount - 1} mere</span>}
                </p>
              )}
            </div>
            <span className="text-xs font-semibold text-muted-foreground shrink-0 tabular-nums">
              {Math.round(Number(displayAmount || 0))} kr
            </span>
          </div>

          {/* Pending-banner — gør tydeligt hvorfor aftalen ikke kan trækkes */}
          {isPending && (
            <div className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100/60 px-2 h-6 text-[11px] font-medium text-amber-800">
              <Lock className="h-3 w-3 shrink-0" />
              <span>Afventer godkendelse — kan ikke lægges på rute endnu</span>
            </div>
          )}

          {/* Adresse — emerald prik = vi har koordinater, orange = mangler */}
          {fullAddress && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
              <MapPin className={`h-3 w-3 shrink-0 ${hasGps ? "text-emerald-500" : "text-orange-400"}`} />
              <span className="truncate">{fullAddress}</span>
            </p>
          )}

          {/* Diskret meta-linje: dato-prik + dag + (tid) + (varighed).
              Erstatter de tidligere store farvede bannere — kortet bliver roligere
              og hierarkiet klarere: navn → ydelse → hvornår. */}
          {(schedule || job.preferred_time_start || estimatedMin != null) && (
            <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[11px] min-w-0">
              {schedule && (
                <span className={`inline-flex items-center gap-1.5 font-medium min-w-0 ${schedule.tone}`}>
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${schedule.dotTone}`} />
                  <span className="truncate">{schedule.dayLabel}</span>
                  {schedule.relative && !compact && (
                    <span className="opacity-70 truncate">· {schedule.relative}</span>
                  )}
                </span>
              )}
              {job.preferred_time_start && (
                <span className="text-muted-foreground tabular-nums">
                  {job.preferred_time_start.slice(0, 5)}
                  {job.preferred_time_end && `–${job.preferred_time_end.slice(0, 5)}`}
                </span>
              )}
              {!compact && estimatedMin != null && (
                <span className="text-muted-foreground inline-flex items-center gap-1">
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

      {onSuggestRoute && !isPending && !compact && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSuggestRoute(); }}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-foreground hover:bg-accent/10 border-t border-border/50 transition-colors focus-visible:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
          title="Foreslå bedste rute baseret på afstand, kapacitet og færdigheder"
        >
          <Sparkles className="h-3 w-3 text-accent" />
          Foreslå bedste rute
        </button>
      )}

      {/* Expandable details */}
      {!compact && (job.customer_phone || itemCount > 1 || job.notes) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 border-t border-border/50 transition-colors focus-visible:bg-secondary focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {expanded ? "Skjul detaljer" : "Vis detaljer"}
        </button>
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
