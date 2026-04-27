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
   Standard nøgletal-kort med ikon-badge. Brug i Overblik, Kunder osv. */
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
  tone?: "neutral" | "accent" | "emerald" | "amber" | "blue" | "violet";
}) => {
  const tones: Record<string, string> = {
    neutral: "bg-secondary text-foreground",
    accent: "bg-accent/10 text-accent",
    emerald: "bg-feature-cool text-feature-cool-foreground",
    amber: "bg-feature-warm text-feature-warm-foreground",
    blue: "bg-accent/10 text-accent",
    violet: "bg-feature-lilac text-feature-lilac-foreground",
  };
  return (
    // Diskret hover: kun border bliver lidt mørkere. Ingen lift/rotation som
    // ellers fik nøgletals-kortene til at "danse" tilfældigt.
    <Card className="rounded-xl border-border shadow-sm transition-colors duration-150 ease-out hover:border-foreground/15">
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
  // Blød fade-in (ingen translate). Sektion-kort forklarer ikke handlinger,
  // så de skal ikke "flyve ind" — bare ankomme stille.
  <Card className={cn("rounded-xl border-border shadow-sm", className)}>
    <CardContent className="p-5 space-y-4">
      {(title || action) && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground">
                {icon}
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </CardContent>
  </Card>
);

/* ───────── FieldLabel ─────────
   Standard label til input-felter i admin-formularer.
   Lille uppercase-stil, samme på tværs af alle faner. */
export const FieldLabel = ({
  children,
  required,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) => (
  <label className={cn("mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider", className)}>
    {children}
    {required && <span className="text-destructive ml-0.5">*</span>}
  </label>
);

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
  <Card className="rounded-xl border-dashed border-border">
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
);