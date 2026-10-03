import { AlertTriangle, MapPinOff, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DriveIssue } from "./useDriveSafety";

/** Compact white card shown over the map; only the most important issue plus offline. */
export function DriveIssueBanner({ issues, onRetry }: { issues: DriveIssue[]; onRetry: () => void }) {
  if (!issues.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-[1005] flex flex-col gap-2 sm:inset-x-auto sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2">
      {issues.slice(0, 2).map((issue) => {
        const Icon = issue.id === "offline" ? WifiOff : issue.tone === "error" ? MapPinOff : AlertTriangle;
        return (
          <div key={issue.id} role="alert" className={cn("pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-3 shadow-lg", issue.tone === "error" ? "border-destructive/30" : "border-warning/40")}>
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", issue.tone === "error" ? "text-destructive" : "text-warning")} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{issue.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{issue.body}</p>
            </div>
            {issue.action && (
              <Button size="sm" variant="outline" className="h-9 shrink-0 gap-1.5 text-xs" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5" /> Prøv igen
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
