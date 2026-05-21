import { ArrowUp, ArrowDown, Minus, ChevronRight } from "lucide-react";
import type { ComponentType } from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/admin/shared/AdminUI";
import { cn } from "@/lib/utils";

export const TrendBadge = ({ pct }: { pct: number }) => {
  const Icon = pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : Minus;
  const tone = pct > 0
    ? "text-emerald-600 bg-emerald-500/10"
    : pct < 0
      ? "text-red-600 bg-red-500/10"
      : "text-muted-foreground bg-secondary";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      <Icon className="h-2.5 w-2.5" strokeWidth={3} />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
};

/**
 * KPI-kort — bygger ovenpå StatCard fra AdminUI så vi har 100% samme ramme/typografi
 * som virksomhedspanelet, men tilføjer trend-badge + sparkline i bund.
 */
export const KpiCard = ({
  label, value, icon: Icon, tone, sub, trend, spark,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: "emerald" | "blue" | "violet" | "amber";
  sub?: string;
  trend?: number;
  spark?: { v: number }[];
}) => (
  <div className="relative">
    <StatCard
      label={label}
      value={
        <span className="inline-flex items-baseline gap-2">
          {value}
          {trend !== undefined && <TrendBadge pct={trend} />}
        </span>
      }
      icon={<Icon />}
      tone={tone}
      hint={sub}
    />
    {spark && spark.length > 1 && (
      <div className="pointer-events-none absolute inset-x-3 bottom-2 h-6 opacity-70">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark}>
            <Line type="monotone" dataKey="v" stroke={`hsl(var(--accent))`} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

/* Pulse-strip — kompakte live-tal øverst. Tone="dot" giver kun en lille
   farvet prik i venstre kant så stripen ikke konkurrerer med KPI-rækken. */
export const PulseCard = ({
  label, value, icon: Icon, dot,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  dot: "emerald" | "blue" | "violet" | "amber" | "muted";
}) => {
  const dots: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-accent",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    muted: "bg-muted-foreground/40",
  };
  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardContent className="flex items-center gap-2.5 p-3">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dots[dot])} />
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-tight text-muted-foreground">{label}</p>
          <p className="text-base font-bold tabular-nums leading-tight text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

/* ActionCard — operationel arbejdskø. Klik navigerer til den relevante fane. */
export const ActionCard = ({
  count, label, hint, icon: Icon, tone, onClick,
}: {
  count: number;
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  tone: "danger" | "warn" | "info";
  onClick?: () => void;
}) => {
  const tones: Record<string, string> = {
    danger: "border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive",
    warn: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700",
    info: "border-accent/30 bg-accent/5 hover:bg-accent/10 text-accent",
  };
  const disabled = count === 0;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors w-full",
        disabled ? "border-border bg-secondary/30 text-muted-foreground cursor-default" : tones[tone],
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        disabled ? "bg-secondary" : "bg-background/80")}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-2xl font-bold leading-none tabular-nums text-foreground">
          {count}
          {!disabled && <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />}
        </p>
        <p className="mt-1 text-sm font-semibold leading-tight text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{hint}</p>
      </div>
    </button>
  );
};

/* BarList — genbrugelig liste-visning med progress-bar bag tekst.
   Bruges i Top-lister tabs så kategorier/byer ser ens ud. */
export function BarList({ items, tone, empty }: { items: { label: string; value: number }[]; tone: "accent" | "foreground"; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground truncate">{it.label}</span>
            <span className="tabular-nums font-medium text-muted-foreground">{it.value}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className={cn("h-full", tone === "accent" ? "bg-accent" : "bg-foreground")} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}