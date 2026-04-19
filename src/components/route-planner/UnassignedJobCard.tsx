import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = {
  job: {
    id: string;
    customer_name: string;
    address?: string | null;
    city?: string | null;
    zip_code?: string | null;
    total_amount?: number | null;
    latitude?: number | null;
    longitude?: number | null;
  };
};

export const UnassignedJobCard = ({ job }: Props) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `job-${job.id}`,
    data: { type: "job", job },
  });

  const hasCoords = job.latitude != null && job.longitude != null;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="rounded-md border bg-background p-2.5 cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{job.customer_name}</p>
          {(job.address || job.city) && (
            <p className="text-xs text-muted-foreground truncate">
              {[job.address, [job.zip_code, job.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
            </p>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-xs font-semibold">{Math.round(Number(job.total_amount || 0))} kr</span>
            {!hasCoords && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">Ingen GPS</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
