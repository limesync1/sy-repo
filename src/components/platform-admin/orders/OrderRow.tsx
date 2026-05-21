import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, Mail } from "lucide-react";
import { STATUS_OPTIONS, statusColors, fmtKr } from "./shared";

interface Props {
  order: any;
  selected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onOpen: (id: string) => void;
}

export default function OrderRow({ order: o, selected, onToggle, onOpen }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
      <Checkbox checked={selected} onCheckedChange={(c) => onToggle(o.id, !!c)} />
      <button onClick={() => onOpen(o.id)} className="flex flex-1 items-center gap-3 text-left min-w-0">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {o.customer_name} <span className="text-muted-foreground">·</span>{" "}
            <span className="text-muted-foreground">{o.business_name || "—"}</span>
            {o.invoice_external_number && (
              <span className="ml-2 text-xs text-muted-foreground">#{o.invoice_external_number}</span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {o.customer_email} · {new Date(o.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
            {o.due_date && <> · Forfald {new Date(o.due_date).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}</>}
          </p>
        </div>
        <Badge className={`${statusColors[o.status] || ""} text-xs font-medium border px-2 py-0.5`}>
          {STATUS_OPTIONS.find((s) => s.value === o.status)?.label || o.status}
        </Badge>
        <span className="text-sm font-bold text-foreground tabular-nums w-24 text-right">{fmtKr(o.total_amount)}</span>
      </button>
      {o.invoice_external_id && (
        <span className="rounded-md p-1.5 text-muted-foreground" title={`Faktura ${o.invoice_external_number || ""}`}>
          <FileText className="h-3.5 w-3.5" />
        </span>
      )}
      <a href={`mailto:${o.customer_email}`} onClick={(e) => e.stopPropagation()}
         className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Email kunde">
        <Mail className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}