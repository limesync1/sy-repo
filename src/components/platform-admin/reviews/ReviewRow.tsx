import { Button } from "@/components/ui/button";
import { Star, Flag, EyeOff, Eye, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  review: any;
  onFlag: (r: any) => void;
  onUnflag: (id: string) => void;
  onToggleHide: (id: string, hide: boolean) => void;
  onDelete: (id: string) => void;
}

export default function ReviewRow({ review: r, onFlag, onUnflag, onToggleHide, onDelete }: Props) {
  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 hover:bg-secondary/30",
      r.flagged_at && "bg-amber-500/5",
      r.hidden_at && "opacity-60",
    )}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{r.reviewer_name}</p>
          <span className="text-xs text-muted-foreground">→ {r.businesses?.name || "—"}</span>
          {r.flagged_at && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              <Flag className="h-2.5 w-2.5" /> {r.flagged_reason || "flagget"}
            </span>
          )}
          {r.hidden_at && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
              <EyeOff className="h-2.5 w-2.5" /> skjult
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          ))}
          <span className="ml-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("da-DK")}</span>
        </div>
        {r.comment && <p className="mt-1 text-sm text-foreground/80">{r.comment}</p>}
        {r.admin_note && (
          <p className="mt-1 text-xs text-muted-foreground italic flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> Admin-note: {r.admin_note}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {r.flagged_at ? (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Fjern flag" onClick={() => onUnflag(r.id)}>
            <Flag className="h-3.5 w-3.5 text-amber-600" />
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Flag som problem" onClick={() => onFlag(r)}>
            <Flag className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
          title={r.hidden_at ? "Vis igen" : "Skjul fra offentlig"}
          onClick={() => onToggleHide(r.id, !r.hidden_at)}>
          {r.hidden_at ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => { if (confirm("Slet anmeldelse?")) onDelete(r.id); }}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}