// KpiBar — kompakt række af nøgletal i toppen af alle admin-sider.
// Et minimum af visuel støj: lille label, stort tal, ikon i farve-puk.
// Bruges på Aftaler, Kunder, Ruter for at give samme overblik-rytme.
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "success" | "warning" | "info" | "accent" | "danger";

const TONE_CLS: Record<KpiTone, string> = {
  neutral: "bg-secondary text-foreground",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200",
  info:    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  accent:  "bg-accent/10 text-accent",
  danger:  "bg-destructive/10 text-destructive",
};

export type KpiItem = {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: KpiTone;
};

export const KpiBar = ({ items, className }: { items: KpiItem[]; className?: string }) => (
  <div
    className={cn(
      "grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3",
      className,
    )}
  >
    {items.map((it, i) => (
      <Card
        key={i}
        className="rounded-xl border-border shadow-sm transition-colors duration-150 ease-out hover:border-foreground/15"
      >
        <CardContent className="flex items-center gap-3 p-3 sm:p-4">
          {it.icon && (
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 sm:h-10 sm:w-10 sm:[&_svg]:h-5 sm:[&_svg]:w-5",
                TONE_CLS[it.tone ?? "neutral"],
              )}
            >
              {it.icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {it.label}
            </p>
            <p className="mt-0.5 break-words text-xl font-bold leading-tight tracking-tight tabular-nums text-foreground sm:text-2xl">
              {it.value}
            </p>
            {it.hint && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{it.hint}</p>
            )}
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);