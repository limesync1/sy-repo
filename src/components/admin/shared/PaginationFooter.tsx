/**
 * PaginationFooter — genbrugelig "Forrige / Næste"-bjælke til admin-lister.
 * Skjuler sig selv hvis der kun er én side, og viser "X–Y af Z" så brugeren
 * altid ved hvor i listen de er.
 */
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationFooterProps {
  page: number;          // 0-baseret
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  label?: string;        // fx "kunder", "aftaler"
  className?: string;
}

export function PaginationFooter({
  page, pageSize, total, onPageChange, label = "emner", className,
}: PaginationFooterProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 ${className ?? ""}`}>
      <p className="text-xs text-muted-foreground tabular-nums">
        Viser <span className="font-medium text-foreground">{from.toLocaleString("da-DK")}–{to.toLocaleString("da-DK")}</span>
        {" af "}<span className="font-medium text-foreground">{total.toLocaleString("da-DK")}</span> {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
          className="h-8"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Forrige
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          Side {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          className="h-8"
        >
          Næste <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}