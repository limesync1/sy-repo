import { AlertTriangle, MapPinOff, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DriveIssue } from "./useDriveSafety";

/** Location issues overlay the map; recoverable map-style failures stay in normal flow. */
export function DriveIssueBanner({ issues, onRetry, placement = "overlay" }: { issues: DriveIssue[]; onRetry: () => void; placement?: "overlay" | "inline" }) {
  if (!issues.length) return null;
  if (placement === "inline") {
    return (
      <div className="drive-map-notice shrink-0 border-b border-warning/40 bg-card px-3 py-1.5 text-foreground">
        {issues.slice(0, 1).map((issue) => (
          <div key={issue.id} role="alert" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{issue.title}</p>
              <p className="text-xs text-muted-foreground">{issue.body}</p>
            </div>
            {issue.action && (
              <Button size="icon" variant="outline" className="h-11 w-11 shrink-0" onClick={onRetry} aria-label="Prøv at hente natkortet igen" title="Prøv at hente natkortet igen">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="drive-issue-banner pointer-events-none absolute inset-x-2 top-2 z-[1005] flex flex-col gap-2 sm:inset-x-auto sm:left-1/2 sm:w-[420px] sm:-translate-x-1/2">
      {issues.slice(0, 2).map((issue) => {
        const Icon = issue.id === "offline" ? WifiOff : issue.tone === "error" ? MapPinOff : AlertTriangle;
        return (
          <div key={issue.id} role="alert" className={cn("pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-card px-3 py-2.5 shadow-md", issue.tone === "error" ? "border-destructive/30" : "border-warning/40")}>
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", issue.tone === "error" ? "text-destructive" : "text-warning")} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{issue.title}</p>
              <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{issue.body}</p>
              {issue.action && (
                <Button size="sm" variant="outline" className="mt-2 h-9 gap-1.5 text-xs" onClick={onRetry}>
                  <RefreshCw className="h-3.5 w-3.5" /> Prøv igen
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
