// SheetSection — delte UI-byggeklodser så StopDetailSheet, RouteEditSheet
// og CreateManualOrderDialog har 100% ens visuelt sprog:
//   • Header med farvet/ikonisk badge + titel + beskrivelse
//   • Sektion-kort med ikon + UPPERCASE-titel + valgfri hint
//   • Field med lille muted label
//   • Footer-stribe med to knapper (slet/gem)
import * as React from "react";
import { cn, readableTextOn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

/* ───────── Header ─────────
   Bruges som indhold i SheetHeader/DialogHeader.
   `accent` kan være en hex-farve (rute-farve) eller ingen → primary. */
export const SheetHeaderBlock = ({
  icon,
  badge,
  accent,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  /** Tekst i rund badge (fx sekvensnummer). Vises i stedet for ikon hvis sat. */
  badge?: React.ReactNode;
  accent?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Ekstra indhold under description (fx status-badges). */
  children?: React.ReactNode;
}) => {
  // Når der ikke er angivet en eksplicit accent-farve falder vi tilbage
  // på primary-tokenet. I light mode er det næsten sort (hvid ikon = ✓)
  // — i dark mode er det næsten hvidt, så vi skal pege på
  // primary-foreground for at undgå hvid-på-hvid.
  const hasAccent = !!accent;
  const bg = accent || "hsl(var(--primary))";
  const iconColor = hasAccent ? readableTextOn(accent!) : "hsl(var(--primary-foreground))";
  const hasBadge = badge != null || icon != null;
  return (
    <div className="flex items-start gap-3">
      {hasBadge && (
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold shrink-0 shadow-sm"
          style={{ background: bg, color: iconColor }}
          aria-hidden={!badge}
        >
          {badge ?? icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-lg font-bold leading-tight text-left truncate text-foreground">
          {title}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5 text-left">
            {description}
          </div>
        )}
        {children && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">{children}</div>
        )}
      </div>
    </div>
  );
};

/* ───────── Section ─────────
   Boxed kort med ikon + uppercase titel + valgfri hint i højre side. */
export const Section = ({
  icon,
  title,
  hint,
  required,
  children,
  className,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  /**
   * Valgfri farve-tone for header-ikonet (giver visuelt anker så man hurtigt
   * kan scanne sektionerne). Bruges fx i StopDetailSheet hvor brugeren ellers
   * havde svært ved at se hvor man først skulle kigge.
   */
  tone?: "primary" | "accent" | "amber" | "emerald" | "sky" | "muted";
}) => (
  // Matcher kunde-detalje-sheetet (rounded-xl border-border bg-card, h4 uppercase
  // tracking-wider) så de to paneler ser ud som ét designsystem.
  <div className={cn("space-y-1", className)}>
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center justify-center h-5 w-5 rounded-md shrink-0",
          tone === "primary"  && "bg-primary/10 text-primary",
          tone === "accent"   && "bg-accent/15 text-accent",
          tone === "amber"    && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
          tone === "emerald"  && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
          tone === "sky"      && "bg-sky-500/15 text-sky-700 dark:text-sky-400",
          (!tone || tone === "muted") && "text-muted-foreground h-3.5 w-3.5 bg-transparent",
        )}
      >
        <span className="[&>svg]:h-3 [&>svg]:w-3 inline-flex">{icon}</span>
      </span>
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {required && null}
      {hint && <span className="ml-auto text-[10px] text-muted-foreground">{hint}</span>}
    </div>
    <div className="rounded-xl border border-border/60 bg-card p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {children}
    </div>
  </div>
);

/* ───────── CollapsibleSection ─────────
   Samme look som <Section>, men hele headeren er en knap der folder
   indholdet ud/ind.  Bruges til sekundære oplysninger (beløb, rute-info,
   noter…) i mobile sheets hvor vi vil holde modalen kompakt. */
export const CollapsibleSection = ({
  icon,
  title,
  hint,
  defaultOpen = false,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={cn("bg-card rounded-xl border border-border", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-secondary/40 active:bg-secondary/60 transition-colors rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="text-muted-foreground inline-flex items-center justify-center h-4 w-4">
          {icon}
        </span>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        {hint && <span className="ml-auto min-w-0 truncate text-right text-[10px] text-muted-foreground">{hint}</span>}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            hint ? "ml-1.5" : "ml-auto",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="px-3.5 pb-3.5 pt-0.5">{children}</div>}
    </div>
  );
};

/* ───────── Field ───────── */
export const Field = ({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <label className={cn("flex flex-wrap items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider", required ? "text-foreground" : "text-muted-foreground")}>
      <span>{label}</span>
      {required && (
        <span className="inline-flex items-center rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-accent">
          Påkrævet
        </span>
      )}
      {!required && optional ? (
        <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-muted-foreground">
          Behøves ikke
        </span>
      ) : null}
    </label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

/* ───────── SheetFooterBar ─────────
   Standard sticky footer-stribe.
   Børn lægges i en flex-row; brug `<div className="flex-1" />` for at adskille. */
export const SheetFooterBar = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("border-t p-4 shrink-0 bg-card", className)}>{children}</div>
);