// SheetSection — delte UI-byggeklodser så StopDetailSheet, RouteEditSheet
// og CreateManualOrderDialog har 100% ens visuelt sprog:
//   • Header med farvet/ikonisk badge + titel + beskrivelse
//   • Sektion-kort med ikon + UPPERCASE-titel + valgfri hint
//   • Field med lille muted label
//   • Footer-stribe med to knapper (slet/gem)
import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
  const bg = accent || "hsl(var(--primary))";
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-md text-white text-sm font-bold shrink-0 shadow-sm"
        style={{ background: bg }}
        aria-hidden={!badge}
      >
        {badge ?? icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold leading-tight text-left truncate">
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
}: {
  icon: React.ReactNode;
  title: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("bg-background rounded-lg border p-3.5", className)}>
    <div className="flex items-center gap-1.5 mb-2.5">
      <span className="text-muted-foreground inline-flex items-center justify-center h-4 w-4">
        {icon}
      </span>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
        {title}
      </h3>
      {required && <span className="text-[10px] text-destructive">*</span>}
      {hint && <span className="ml-auto text-[10px] text-muted-foreground">{hint}</span>}
    </div>
    {children}
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
    <div className={cn("bg-background rounded-lg border", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-secondary/40 active:bg-secondary/60 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="text-muted-foreground inline-flex items-center justify-center h-4 w-4">
          {icon}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
        {hint && <span className="ml-auto text-[10px] text-muted-foreground">{hint}</span>}
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
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <Label className="text-[11px] text-muted-foreground font-medium">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
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