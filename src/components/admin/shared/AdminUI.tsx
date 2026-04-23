import * as React from "react";
import { ArrowRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const PageHeader = ({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-end sm:justify-between", className)}>
    <div className="min-w-0 space-y-2">
      {eyebrow && (
        <div className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </div>
      )}
      <div className="space-y-1.5">
        <h2 className="text-[20px] font-semibold leading-none text-foreground">{title}</h2>
        {description && <p className="max-w-2xl text-[12px] leading-5 text-muted-foreground">{description}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const PrimaryButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
>(({ icon, children, className, ...props }, ref) => (
  <Button
    ref={ref}
    className={cn(
      "h-8 rounded-md bg-foreground px-3 text-xs font-medium text-background shadow-sm shadow-foreground/10 hover:bg-foreground/92",
      className,
    )}
    {...props}
  >
    {icon && <span className="mr-1.5 inline-flex items-center [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
    {children}
  </Button>
));
PrimaryButton.displayName = "PrimaryButton";

export const ActionTile = ({
  title,
  description,
  icon,
  meta,
  onClick,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-secondary/30",
        onClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {icon && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
        {description && <p className="text-[11px] leading-4.5 text-muted-foreground">{description}</p>}
        {meta && <div className="pt-0.5 text-[11px] font-medium text-muted-foreground">{meta}</div>}
      </div>
    </Comp>
  );
};

export const StatCard = ({
  label,
  value,
  icon,
  hint,
  tone = "neutral",
  emphasis = "default",
  trend,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "accent" | "emerald" | "amber" | "blue" | "violet";
  emphasis?: "default" | "primary";
  trend?: React.ReactNode;
}) => {
  const tones: Record<string, string> = {
    neutral: "bg-secondary text-foreground",
    accent: "bg-accent-soft text-accent",
    emerald: "bg-feature-cool text-feature-cool-foreground",
    amber: "bg-feature-warm text-feature-warm-foreground",
    blue: "bg-feature-cool text-feature-cool-foreground",
    violet: "bg-feature-lilac text-feature-lilac-foreground",
  };

  return (
    <Card className={cn("admin-panel border-border shadow-none", emphasis === "primary" && "bg-card") }>
      <CardContent className="flex items-start gap-3 p-3">
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5", tones[tone])}>
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            {trend && <div className="shrink-0 text-[10px] font-medium text-muted-foreground">{trend}</div>}
          </div>
          <p className={cn("font-semibold tabular-nums text-foreground", emphasis === "primary" ? "text-[22px]" : "text-[18px]")}>{value}</p>
          {hint && <p className="text-[11px] leading-4.5 text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export const PriorityBanner = ({
  eyebrow,
  title,
  description,
  icon,
  meta,
  action,
  secondaryAction,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}) => (
  <Card className={cn("admin-panel border-border shadow-none", className)}>
    <CardContent className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
              {icon}
            </div>
          )}
          <div className="min-w-0 space-y-1">
            {eyebrow && <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</div>}
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="max-w-xl text-[12px] leading-5 text-muted-foreground">{description}</p>}
          </div>
        </div>
        {meta && <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">{meta}</div>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-col gap-2 sm:items-end">
          {action}
          {secondaryAction}
        </div>
      )}
    </CardContent>
  </Card>
);

export const SectionCard = ({
  title,
  icon,
  description,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
    <Card className={cn("admin-panel border-border shadow-none", className)}>
      <CardContent className="space-y-3 p-4">
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-3">
          <div className="min-w-0">
            {title && (
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-muted-foreground">
                {icon}
                {title}
              </h3>
            )}
            {description && <p className="mt-1 text-[11px] leading-4.5 text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </CardContent>
  </Card>
);

export const FieldLabel = ({
  children,
  required,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) => (
  <label className={cn("mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground", className)}>
    {children}
    {required && <span className="ml-0.5 text-destructive">*</span>}
  </label>
);

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Søg...",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) => (
  <div className={cn("relative min-w-[220px] flex-1", className)}>
    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 rounded-md border-border bg-background pl-8 text-xs shadow-none" />
  </div>
);

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <Card className="admin-panel border-dashed border-border shadow-none">
    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[11px] leading-5 text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </CardContent>
  </Card>
);

export const InsightPill = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground", className)}>
    {children}
  </span>
);

export const AppList = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("overflow-hidden rounded-md border border-border bg-card", className)}>{children}</div>
);

export const AppListRow = ({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: React.HTMLAttributes<HTMLButtonElement>["onClick"];
}) => {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick as any}
      className={cn(
        "group flex w-full items-center gap-3 border-b border-border/80 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary/40",
        onClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
      {onClick && <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />}
    </Comp>
  );
};
