// StatusPill — én konsistent status-visning på tværs af aftaler, ruter,
// kunder, ordrer. Vi mapper alle "domain"-statusser ned i en lille palette
// så brugeren lærer farverne ét sted og kan læse dem alle steder.
import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "neutral"   // grå — kladde / inaktiv
  | "success"   // grøn — aktiv / gennemført
  | "warning"   // gul — afventer / pause
  | "info"      // blå — planlagt / igangværende
  | "danger";   // rød — annulleret / forfalden

const TONE_CLS: Record<StatusTone, string> = {
  neutral: "bg-secondary text-foreground/80 border-border",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20",
  info:    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
  danger:  "bg-destructive/10 text-destructive border-destructive/20",
};

export const StatusPill = ({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) => {
  const dotCls: Record<StatusTone, string> = {
    neutral: "bg-muted-foreground/40",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-sky-500",
    danger: "bg-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none",
        TONE_CLS[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotCls[tone])} />}
      {children}
    </span>
  );
};