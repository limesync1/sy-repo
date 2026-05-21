import { cn } from "@/lib/utils";
import { ChevronRight, History, Star, StarOff } from "lucide-react";
import { ACTION_LABELS, renderDiff } from "./shared";

export function AuditRow({
  e, openId, setOpenId, watch, toggleWatch,
}: {
  e: any;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  watch: string[];
  toggleWatch: (email: string) => void;
}) {
  const open = openId === e.id;
  const hasDetails = e.details && Object.keys(e.details).length > 0;
  const hasDiff = hasDetails && e.details.before && e.details.after && typeof e.details.before === "object" && typeof e.details.after === "object";
  const watched = e.admin_email && watch.includes(e.admin_email);
  return (
    <div className="border-b border-border last:border-b-0">
      <div className={cn("flex w-full items-center gap-2 px-4 py-3 transition-colors", watched && "bg-primary/5", hasDetails && "hover:bg-secondary/30")}>
        <button
          type="button"
          onClick={() => e.admin_email && toggleWatch(e.admin_email)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title={watched ? "Fjern fra watch-listen" : "Tilføj til watch-listen"}
        >
          {watched ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : <StarOff className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => hasDetails && setOpenId(open ? null : e.id)}
          className={cn("flex flex-1 items-start gap-3 text-left", hasDetails ? "cursor-pointer" : "cursor-default")}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
            {hasDetails ? (
              <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
            ) : (
              <History className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold text-foreground">{e.admin_email || "Admin"}</span>{" "}
              <span className="text-muted-foreground">{ACTION_LABELS[e.action] || e.action}</span>{" "}
              {e.target_label && <span className="font-medium text-foreground">{e.target_label}</span>}
            </p>
            {hasDetails && !open && (
              <p className="text-xs text-muted-foreground truncate">
                {Object.entries(e.details).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(" · ")}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {new Date(e.created_at).toLocaleString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </button>
      </div>
      {open && hasDetails && (
        <div className="bg-secondary/40 px-4 py-3 border-t border-border space-y-2">
          {hasDiff && renderDiff(e.details.before, e.details.after)}
          <pre className="overflow-x-auto rounded-md bg-background p-3 text-[11px] leading-relaxed text-foreground border border-border">
{JSON.stringify(e.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}