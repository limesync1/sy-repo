import noItemsIcon from "@/assets/content-icons/ingen-emner-generel.svg.asset.json";
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
import BlueFlowBackground from "@/components/landing/BlueFlowBackground";

/* ───────── PageHeader ─────────
   Standard side-titel + beskrivelse + valgfri primær-knap i højre side.
   Bruges som første element i alle admin-faner. */
export const PageHeader = ({
  title,
  description,
  action,
  className,
  variant = "hero",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** "plain" giver en rolig header uden blå flade — til arbejdssider som Min dag. */
  variant?: "hero" | "plain";
}) => (
  // Stille indgang: hele headeren fader ind sammen — ingen staggered jitter
  // af titel/beskrivelse/action på hver navigation. Det føles roligt.
  <div className={cn(variant === "hero" ? "panel-page-hero" : "pb-1", "flex items-center justify-between gap-3 flex-wrap", className)}>
    {/* Samme bevægelige havblå baggrund som forsidens hero og sektioner. */}
    {variant === "hero" && <BlueFlowBackground variant="hero" />}
    <div className="relative min-w-0">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm opacity-80">{description}</p>
      )}
    </div>
    {action && <div className="relative w-full sm:w-auto sm:shrink-0">{action}</div>}
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
      "brand-blue-action min-h-11 rounded-[4px] text-sm font-semibold px-4",
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

/* ───────── StatIconTile ─────────
   Den ene fælles ikonflade til nøgletal på begge paneler: fast størrelse,
   altid samme baggrund og illustrationer i fast størrelse indeni. */
export const StatIconTile = ({
  children,
  className,
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg";
}) => (
  <div
    className={cn(
      "flex aspect-square shrink-0 items-center justify-center rounded-md border border-border/80 bg-secondary/70",
      size === "lg" ? "h-16 w-16 p-1 sm:h-[4.5rem] sm:w-[4.5rem] sm:p-1.5" : "h-[3.25rem] w-[3.25rem] p-1 sm:h-14 sm:w-14",
      size === "lg"
        ? "[&_img]:h-14 [&_img]:w-14 sm:[&_img]:h-16 sm:[&_img]:w-16 [&_svg]:h-9 [&_svg]:w-9"
        : "[&_img]:h-11 [&_img]:w-11 [&_svg]:h-7 [&_svg]:w-7",
      "[&_img]:max-h-full [&_img]:max-w-full [&_img]:object-contain",
      className,
    )}
  >
    {children}
  </div>
);

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
  // Ikonfladen er ens på alle kort (samme størrelse, samme baggrund), så
  // nøgletal aldrig ser rodede ud. Status vises kun som en svag ring + farvet
  // Lucide-ikon — illustrationer beholder deres egne farver.
  const iconTone: Record<string, string> = {
    neutral: "text-foreground",
    accent: "text-accent",
    emerald: "text-feature-cool-foreground",
    amber: "text-feature-warm-foreground",
    blue: "text-accent",
    violet: "text-feature-lilac-foreground",
    danger: "text-destructive",
    warn: "text-warning-foreground dark:text-warning",
    ok: "text-success",
  };
  const ring =
    tone === "danger" ? "ring-1 ring-destructive/30"
    : tone === "warn" ? "ring-1 ring-warning/30"
    : tone === "ok" ? "ring-1 ring-success/30"
    : "";
  return (
    <Card className={cn("service-panel-card rounded-[5px] border-border shadow-sm transition-colors duration-150 ease-out hover:border-accent/35", ring)}>
      <CardContent className="flex items-start gap-3 p-3">
        <StatIconTile className={iconTone[tone]}>
          {icon}
        </StatIconTile>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">{label}</p>
          <p className="mt-0.5 break-words text-lg font-bold leading-tight tracking-normal tabular-nums text-foreground sm:text-xl">
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
  <Card ref={ref} className={cn("service-panel-card rounded-[5px] border-border shadow-sm", className)}>
    <CardContent className="p-3.5 sm:p-4 space-y-3">
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
    /** Knyt labelen til et felt via dets id (tilgængelighed). */
    htmlFor?: string;
  }
>(({ children, required, optional, important, className, htmlFor }, ref) => (
  <label ref={ref} htmlFor={htmlFor} className={cn("mb-1.5 flex flex-wrap items-center gap-1.5 text-sm font-medium", required ? "text-foreground" : "text-muted-foreground", className)}>
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
  <div className={cn("relative w-full min-w-0 flex-1", className)}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder || "Søg"}
      className="pl-9 rounded-[4px] min-h-11"
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
  <Card ref={ref} className="service-panel-card rounded-[5px] border-dashed border-border">
    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
      <img src={noItemsIcon.url} alt="" aria-hidden="true" className="mb-3 h-14 w-14 object-contain" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </CardContent>
  </Card>
));
EmptyState.displayName = "EmptyState";