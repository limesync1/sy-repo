import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
  loading?: boolean;
};

export const StopDetailsSheetShell = forwardRef<HTMLDivElement, Props>(({ open, onOpenChange, children, loading = false }, ref) => {
  const isCompact = useIsBelowBreakpoint(1024);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={ref}
        side={isCompact ? "bottom" : "right"}
        className={
          isCompact
            ? "planner-overlay h-[88dvh] w-full !inset-x-0 !bottom-0 !rounded-t-md !rounded-b-none !border-x-0 !border-b-0 p-0 flex flex-col shadow-premium"
            : "planner-overlay w-full p-0 flex flex-col shadow-premium sm:max-w-2xl"
        }
      >
        <SheetTitle className="sr-only">Aftalens oplysninger</SheetTitle>
        <SheetDescription className="sr-only">Detaljer for den valgte aftale på ruten.</SheetDescription>
        {loading ? (
          <div className="flex-1 space-y-5 overflow-hidden bg-secondary/20 p-4 sm:p-5" aria-busy="true">
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-md" />
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : children}
      </SheetContent>
    </Sheet>
  );
});
StopDetailsSheetShell.displayName = "StopDetailsSheetShell";

export default StopDetailsSheetShell;