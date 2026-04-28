// LoadingScreen — fælles "indlæser"-tilstand brugt i alle paneler.
// To varianter:
//   • <LoadingScreen full /> — hele viewportet (auth-/role-load).
//   • <LoadingScreen />      — i en panel-main (lazy tab Suspense fallback).
// Bruger samme spinner + tone som PrimaryButton, så det føles som en del af UI'et.
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const LoadingScreen = ({
  full = false,
  label = "Indlæser…",
  /** Antal skeleton-kort vist nedenunder spinneren (kun i ikke-full variant). */
  skeletons = 3,
  className,
}: {
  full?: boolean;
  label?: string;
  skeletons?: number;
  className?: string;
}) => {
  if (full) {
    return (
      <div
        className={cn(
          "flex min-h-screen items-center justify-center bg-secondary/50 text-muted-foreground",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/70" />
          <span className="text-sm">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 animate-fade-in", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-foreground/70" />
        {label}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: skeletons }).map((_, i) => (
          <Card key={i} className="rounded-xl border-border shadow-sm">
            <CardContent className="p-4">
              <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
              <div className="mt-3 h-6 w-32 rounded bg-secondary animate-pulse" />
              <div className="mt-3 h-3 w-40 rounded bg-secondary/70 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;