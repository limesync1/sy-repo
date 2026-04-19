import { useDraggable } from "@dnd-kit/core";
import { GripVertical, MapPin, Calendar as CalendarIcon, Clock, Phone, StickyNote, Package, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { da } from "date-fns/locale";

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
    notes?: string | null;
    order_items?: { service_name: string; quantity: number; total_price: number }[] | null;
  };
};

const formatPreferredDate = (d: string) => {
  const date = parseISO(d);
  if (isToday(date)) return "I dag";
  if (isTomorrow(date)) return "I morgen";
  return format(date, "EEE d. MMM", { locale: da });
};

export const UnassignedJobCard = ({ job }: Props) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `job-${job.id}`,
    data: { type: "job", job },
  });

  const items = job.order_items || [];
  const itemCount = items.length;
  const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const fullAddress = [job.address, [job.zip_code, job.city].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");

  // Estimer varighed: 30 min/stop som default, eller fra preferred window
  let estimatedMin = 30;
  if (job.preferred_time_start && job.preferred_time_end) {
    const [sh, sm] = job.preferred_time_start.split(":").map(Number);
    const [eh, em] = job.preferred_time_end.split(":").map(Number);
    estimatedMin = (eh * 60 + em) - (sh * 60 + sm);
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="rounded-lg border bg-background p-2.5 cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Customer name + price */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold truncate flex-1">{job.customer_name}</p>
            <span className="text-xs font-bold text-foreground shrink-0">
              {Math.round(Number(job.total_amount || 0))} kr
            </span>
          </div>

          {/* Phone */}
          {job.customer_phone && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{job.customer_phone}</span>
            </p>
          )}

          {/* All services as small list */}
          {itemCount > 0 && (
            <div className="space-y-0.5">
              {items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-foreground/80 truncate flex items-center gap-1">
                    <Package className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                    {item.quantity > 1 && <span className="text-muted-foreground">{item.quantity}× </span>}
                    {item.service_name}
                  </span>
                </div>
              ))}
              {itemCount > 3 && (
                <p className="text-[10px] text-muted-foreground pl-3.5">+{itemCount - 3} flere ydelser</p>
              )}
            </div>
          )}

          {/* Address */}
          {fullAddress && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />{fullAddress}
            </p>
          )}

          {/* Notes */}
          {job.notes && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1 italic">
              <StickyNote className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{job.notes}</span>
            </p>
          )}

          {/* Badges row: date, time window, estimated duration, item count */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {job.preferred_date && (
              <Badge variant="outline" className="h-4 text-[10px] px-1.5 gap-0.5 border-amber-300 text-amber-700 bg-amber-50">
                <CalendarIcon className="h-2.5 w-2.5" />
                {formatPreferredDate(job.preferred_date)}
              </Badge>
            )}
            {job.preferred_time_start && (
              <Badge variant="outline" className="h-4 text-[10px] px-1.5 gap-0.5 border-amber-300 text-amber-700 bg-amber-50">
                <Clock className="h-2.5 w-2.5" />
                {job.preferred_time_start.slice(0, 5)}
                {job.preferred_time_end && `–${job.preferred_time_end.slice(0, 5)}`}
              </Badge>
            )}
            <Badge variant="secondary" className="h-4 text-[10px] px-1.5 gap-0.5">
              <Hourglass className="h-2.5 w-2.5" />
              ~{estimatedMin} min
            </Badge>
            {totalQty > 1 && (
              <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                {totalQty} stk
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
