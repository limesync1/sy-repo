import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  GripVertical, MapPin, CalendarClock, Clock, Phone,
  StickyNote, Hourglass, ChevronDown, ChevronRight, User, Repeat, Route as RouteIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import { da } from "date-fns/locale";
import { formatDurationMin } from "@/lib/duration-format";

type OrderItem = {
  service_name: string;
  quantity: number;
  total_price: number;
  details?: { interval?: string } | null;
};

type Props = {
  job: {
    id: string;
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
  };
  onClick?: () => void;
};

const INTERVAL_LABELS: Record<string, string> = {
  ugentlig: "Ugentlig",
  hver_14_dag: "Hver 14. dag",
  månedlig: "Månedlig",
  kvartalsvis: "Kvartalsvis",
  halvårlig: "Halvårlig",
  årlig: "Årlig",
  engangskøb: "Engangs",
};

/** Beregn tydeligt label for hvornår jobbet skal udføres næste gang.
 *  Viser ugedag + dato + relativ tid, så ejeren hurtigt kan se hvilken
 *  rute / dag aftalen hører hjemme på. */
const getSchedule = (d?: string | null) => {
  if (!d) return null;
  const date = parseISO(d);
  const diff = differenceInDays(date, new Date());
  let relative: string;
  if (isPast(date) && !isToday(date)) relative = `${Math.abs(diff)} dage forsinket`;
  else if (isToday(date)) relative = "i dag";
  else if (isTomorrow(date)) relative = "i morgen";
  else if (diff > 0 && diff < 7) relative = `om ${diff} dage`;
  else relative = `om ${diff} dage`;

  const dayLabel = isToday(date) ? "I dag"
    : isTomorrow(date) ? "I morgen"
    : format(date, "EEE d. MMM", { locale: da });

  const tone =
    isPast(date) && !isToday(date)
      ? "border-destructive/40 text-destructive bg-destructive/5"
      : isToday(date)
      ? "border-orange-300 text-orange-700 bg-orange-50"
      : isTomorrow(date)
      ? "border-amber-300 text-amber-700 bg-amber-50"
      : diff <= 7
      ? "border-primary/30 text-primary bg-primary/5"
      : "border-border text-foreground bg-secondary/60";

  return { dayLabel, relative, tone };
};

export const UnassignedJobCard = ({ job, onClick }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `job-${job.id}`,
    data: { type: "job", job },
  });

  const items = job.order_items || [];
  const itemCount = items.length;
  // Vis hele adressen: gade, postnummer og by samlet
  const cityLine = [job.zip_code, job.city].filter(Boolean).join(" ");
  const fullAddress = [job.address, cityLine].filter(Boolean).join(", ");

  // Foretrukken kilde til varighed: eksplicit estimeret felt fra ordren.
  // Falder tilbage til tidsvindue, derefter 30 min default.
  let estimatedMin = 30;
  if (job.estimated_duration_minutes && job.estimated_duration_minutes > 0) {
    estimatedMin = job.estimated_duration_minutes;
  } else if (job.preferred_time_start && job.preferred_time_end) {
    const [sh, sm] = job.preferred_time_start.split(":").map(Number);
    const [eh, em] = job.preferred_time_end.split(":").map(Number);
    estimatedMin = (eh * 60 + em) - (sh * 60 + sm);
  }

  // Foretrukken dato — recurring abonnementer bruger next_service_date som "skal udføres senest".
  // For engangs aftaler bruges kundens preferred_date.
  const scheduleDate = job.next_service_date || job.preferred_date || null;
  const schedule = getSchedule(scheduleDate);
  const hasGps = job.latitude != null && job.longitude != null;

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="group rounded-lg border bg-card hover:border-primary/60 hover:shadow-md transition-all overflow-hidden"
    >
      {/* Top row: drag handle + clickable content */}
      <div className="flex items-start gap-2 p-2.5">
        {/* Kun grip-håndtaget initierer drag — så kortet selv kan klikkes */}
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label="Træk for at flytte"
          className="shrink-0 mt-0.5 text-muted-foreground/50 hover:text-primary/70 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClick}
          className="flex-1 min-w-0 space-y-1.5 text-left cursor-pointer"
        >
          {/* Header: name + price */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <User className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-sm font-semibold truncate">{job.customer_name}</p>
            </div>
            <span className="text-xs font-bold text-primary shrink-0 tabular-nums">
              {Math.round(Number(job.total_amount || 0))} kr
            </span>
          </div>

          {/* First service inline */}
          {itemCount > 0 && (
            <p className="text-[11px] text-foreground/70 truncate">
              {items[0].quantity > 1 && <span className="text-muted-foreground">{items[0].quantity}× </span>}
              {items[0].service_name}
              {itemCount > 1 && <span className="text-muted-foreground"> · +{itemCount - 1} mere</span>}
            </p>
          )}

          {/* Address */}
          {fullAddress && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <MapPin className={`h-3 w-3 shrink-0 ${hasGps ? "text-emerald-500" : "text-orange-400"}`} />
              <span className="truncate">{fullAddress}</span>
            </p>
          )}

          {/* Tydeligt skema-banner — viser hvornår aftalen skal udføres næste gang.
              Hjælper ejeren med at se hvilken rute / dag aftalen hører hjemme på. */}
          {schedule && (
            <div className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium ${schedule.tone}`}>
              <CalendarClock className="h-3 w-3 shrink-0" />
              <span className="font-semibold">{schedule.dayLabel}</span>
              <span className="opacity-80">· {schedule.relative}</span>
              {job.preferred_time_start && (
                <span className="opacity-80 ml-auto">
                  {job.preferred_time_start.slice(0, 5)}
                  {job.preferred_time_end && `–${job.preferred_time_end.slice(0, 5)}`}
                </span>
              )}
            </div>
          )}

          {/* Foreslået rute — vises tydeligt så ejeren kan se hvilken rute aftalen
              normalt hører hjemme på (baseret på abonnementets preferred_route). */}
          {job.preferred_route_name && (
            <div className="flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/5 px-2 py-1 text-[11px] font-medium text-accent">
              <RouteIcon className="h-3 w-3 shrink-0" />
              <span>Læg på rute:</span>
              <span className="font-semibold truncate">{job.preferred_route_name}</span>
            </div>
          )}

          {/* Compact badge row — interval, varighed osv. */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Interval badge — viser engangs vs abonnement */}
            {(() => {
              const interval = items.find((it: any) => it.details?.interval)?.details?.interval;
              if (!interval) return null;
              const isRecurring = interval !== "engangskøb";
              return (
                <Badge
                  variant="outline"
                  className={`h-4 text-[10px] px-1.5 gap-0.5 ${
                    isRecurring
                      ? "border-primary/40 text-primary bg-primary/5"
                      : "border-border text-muted-foreground bg-secondary/40"
                  }`}
                >
                  {isRecurring ? <Repeat className="h-2.5 w-2.5" /> : <Hourglass className="h-2.5 w-2.5" />}
                  {INTERVAL_LABELS[interval] || interval}
                </Badge>
              );
            })()}
            {/* Tidsvindue vises kun her hvis der ikke er nogen schedule-banner ovenfor */}
            {!schedule && job.preferred_time_start && (
              <Badge variant="outline" className="h-4 text-[10px] px-1.5 gap-0.5 border-border text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {job.preferred_time_start.slice(0, 5)}
                {job.preferred_time_end && `–${job.preferred_time_end.slice(0, 5)}`}
              </Badge>
            )}
            <Badge variant="secondary" className="h-4 text-[10px] px-1.5 gap-0.5">
              <Hourglass className="h-2.5 w-2.5" />
              ~{formatDurationMin(estimatedMin, { short: true })}
            </Badge>
          </div>
        </button>
      </div>

      {/* Expandable details */}
      {(job.customer_phone || itemCount > 1 || job.notes) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/60 border-t border-border/50 transition-colors"
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
