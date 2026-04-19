import { useDraggable } from "@dnd-kit/core";
import { GripVertical, MapPin, Calendar as CalendarIcon, Clock } from "lucide-react";
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

  const itemCount = job.order_items?.length || 0;
  const firstService = job.order_items?.[0]?.service_name;
  const fullAddress = [job.address, [job.zip_code, job.city].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");

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
        <div className="flex-1 min-w-0 space-y-1">
          {/* Customer name + price */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold truncate flex-1">{job.customer_name}</p>
            <span className="text-xs font-bold text-foreground shrink-0">
              {Math.round(Number(job.total_amount || 0))} kr
            </span>
          </div>

          {/* Service */}
          {firstService && (
            <p className="text-xs text-foreground/80 truncate">
              {firstService}
              {itemCount > 1 && <span className="text-muted-foreground"> +{itemCount - 1}</span>}
            </p>
          )}

          {/* Address */}
          {fullAddress && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />{fullAddress}
            </p>
          )}

          {/* Preferred date / time window */}
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
          </div>
        </div>
      </div>
    </div>
  );
};
