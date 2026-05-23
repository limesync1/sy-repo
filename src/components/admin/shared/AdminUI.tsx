// AdminUI — delte UI-byggeklodser så alle admin-faner (Overblik, Services,
// Aftaler, Kunder, Medarbejdere, Anmeldelser, Indstillinger) deler samme
// visuelle sprog: ens header-typografi, primær-knap, stat-kort, sektion-kort
// og felt-labels. Brug disse i stedet for at re-definere lokale variationer.
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────── PageHeader ─────────
   Standard side-titel + beskrivelse + valgfri primær-knap i højre side.
   Bruges som første element i alle admin-faner. */
export const PageHeader = ({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) => (
  // Stille indgang: hele headeren fader ind sammen — ingen staggered jitter
  // af titel/beskrivelse/action på hver navigation. Det føles roligt.
  <div className={cn("flex items-start justify-between gap-3 flex-wrap", className)}>
    <div className="min-w-0">
      <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {action && <div className="w-full sm:w-auto sm:shrink-0">{action}</div>}
  </div>
);

/* ───────── PrimaryButton ─────────
   Standard primær-handlings-knap (Tilføj kunde, Tilføj medarbejder, Gem osv).
   Sort baggrund, hvid tekst, h-9 — samme på tværs af hele admin. */
export const PrimaryButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
>(({ icon, children, className, ...props }, ref) => (
  <Button
    ref={ref}
    className={cn(
      "h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-sm font-medium px-4 shadow-sm",
      // Holdt simpelt: kun farve-overgang ved hover, lille press-feedback ved klik.
      // Ingen "lift" eller ikon-skalering — det føltes tilfældigt på en CTA.
      "transition-colors duration-150 ease-out active:scale-[0.98]",
      className,
    )}
    {...props}
  >
    {icon && <span className="mr-1.5 inline-flex items-center [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
    {children}
  </Button>
));
PrimaryButton.displayName = "PrimaryButton";

/* ───────── StatCard ─────────
   Standard nøgletal-kort med ikon-badge. Brug i Overblik, Kunder osv.
   Status-toner (danger/warn/ok) tilføjer en svag ring så sundheds- og
   sikkerhedssektioner kan bruge samme komponent som operationelle KPI'er. */
export const StatCard = ({
  label,
  value,
  icon,
  hint,
  tone = "neutral",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "accent" | "emerald" | "amber" | "blue" | "violet" | "danger" | "warn" | "ok";
}) => {
  const tones: Record<string, string> = {
    neutral: "bg-secondary text-foreground",
    accent: "bg-accent/10 text-accent",
    emerald: "bg-feature-cool text-feature-cool-foreground",
    amber: "bg-feature-warm text-feature-warm-foreground",
    blue: "bg-accent/10 text-accent",
    violet: "bg-feature-lilac text-feature-lilac-foreground",
    danger: "bg-destructive/10 text-destructive",
    warn: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  };
  const ring =
    tone === "danger" ? "ring-1 ring-destructive/30"
    : tone === "warn" ? "ring-1 ring-amber-400/30"
    : tone === "ok" ? "ring-1 ring-emerald-400/30"
    : "";
  return (
    // Diskret hover: kun border bliver lidt mørkere. Ingen lift/rotation som
    // ellers fik nøgletals-kortene til at "danse" tilfældigt.
    <Card className={cn("rounded-xl border-border shadow-sm transition-colors duration-150 ease-out hover:border-foreground/15", ring)}>
      <CardContent className="flex items-start gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 sm:h-10 sm:w-10 sm:[&_svg]:h-5 sm:[&_svg]:w-5",
            tones[tone],
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">{label}</p>
          <p className="mt-0.5 break-words text-lg font-bold leading-tight tracking-tight tabular-nums text-foreground sm:mt-1 sm:text-2xl">
            {value}
          </p>
          {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:mt-1 sm:text-xs">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

/* ───────── SectionCard ─────────
   Standard kort med titel + valgfrit ikon + valgfri handling i højre side.
   Brug til at gruppere sektioner i Indstillinger, formularer mv. */
export const SectionCard = React.forwardRef<
  HTMLDivElement,
  {
    title?: React.ReactNode;
    icon?: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }
>(({ title, icon, description, action, children, className }, ref) => (
  // Blød fade-in (ingen translate). Sektion-kort forklarer ikke handlinger,
  // så de skal ikke "flyve ind" — bare ankomme stille.
  <Card ref={ref} className={cn("rounded-xl border-border shadow-sm", className)}>
    <CardContent className="p-5 sm:p-6 space-y-4">
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 pb-1">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground tracking-tight">
                {icon}
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </CardContent>
  </Card>
));
SectionCard.displayName = "SectionCard";

/* ───────── FieldLabel ─────────
   Standard label til input-felter i admin-formularer.
   Lille uppercase-stil, samme på tværs af alle faner. */
export const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  {
    children: React.ReactNode;
    required?: boolean;
    optional?: boolean;
    /** Vis et neutralt informativt mærkat — fx "Vigtigt for at blive fundet" */
    important?: string;
    className?: string;
  }
>(({ children, required, optional, important, className }, ref) => (
  <label ref={ref} className={cn("mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium uppercase tracking-wider", required ? "text-foreground" : "text-muted-foreground", className)}>
    <span>{children}</span>
    {required && (
      <span className="inline-flex items-center rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent normal-case tracking-normal">
        Påkrævet
      </span>
    )}
    {important && (
      <span className="inline-flex items-center rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent normal-case tracking-normal">
        {important}
      </span>
    )}
    {optional && !required && !important && (
      <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground normal-case tracking-normal">
        Behøves ikke
      </span>
    )}
  </label>
));
FieldLabel.displayName = "FieldLabel";

/* ───────── SearchInput ─────────
   Standard søge-felt med ikon. Bruges i Kunder, Aftaler, Services. */
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
  <div className={cn("relative flex-1 min-w-[240px]", className)}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9 rounded-lg h-10"
    />
  </div>
);

/* ───────── EmptyState ─────────
   Standard tom-state kort med ikon + tekst + valgfri handling. */
export const EmptyState = React.forwardRef<
  HTMLDivElement,
  {
    icon: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
  }
>(({ icon, title, description, action }, ref) => (
  <Card ref={ref} className="rounded-xl border-dashed border-border">
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary [&_svg]:h-6 [&_svg]:w-6 [&_svg]:text-muted-foreground/40">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </CardContent>
  </Card>
));
EmptyState.displayName = "EmptyState";