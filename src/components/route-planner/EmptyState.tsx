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
};

export default function EmptyState({ icon, title, description, action, className, compact }: Props) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-6 px-3 gap-2" : "py-10 px-6 gap-3",
      className,
    )}>
      {icon && (
        <div className={cn(
          "rounded-full bg-secondary/60 text-muted-foreground flex items-center justify-center",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}>
          {icon}
        </div>
      )}
      <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
      {description && (
        <p className={cn("text-muted-foreground max-w-sm", compact ? "text-xs" : "text-sm")}>{description}</p>
      )}
      {action && (
        <Button size={compact ? "sm" : "default"} variant="default" className="mt-1" onClick={action.onClick}>
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}