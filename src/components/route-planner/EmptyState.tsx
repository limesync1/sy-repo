// Genbrugelig tom-tilstand for ruteplanlæggeren.
// Erstatter spredte "Ingen X" tekster med en pænere illustration + CTA.
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: ReactNode };
  className?: string;
  compact?: boolean;
  animated?: boolean;
};

export default function EmptyState({ icon, title, description, action, className, compact, animated = true }: Props) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      animated && "animate-fade-in",
      compact ? "py-6 px-3 gap-2" : "py-10 px-6 gap-3",
      className,
    )}>
      {icon && (
        <div className={cn(
          "relative flex items-center justify-center",
          compact ? "mb-0.5" : "mb-1",
        )}>
          <div className={cn(
            "relative flex items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-muted-foreground shadow-sm [&_img]:h-full [&_img]:w-full [&_img]:object-contain",
            compact
              ? "h-11 w-11 p-2"
              : "h-16 w-16 p-2.5",
          )}>
            {icon}
          </div>
        </div>
      )}
      <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
      {description && (
        <p className={cn("text-muted-foreground max-w-sm leading-relaxed", compact ? "text-xs" : "text-sm")}>{description}</p>
      )}
      {action && (
        <Button size={compact ? "sm" : "default"} variant="default" className="mt-1 hover-scale" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}