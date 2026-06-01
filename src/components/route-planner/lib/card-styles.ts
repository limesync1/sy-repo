// Delte stilarter for alle "aftalekort" i ruteplanlæggeren, så pool-kort,
// stops-på-ruten og dag-detalje deler præcis samme radius, kant, skygge og
// hover-opførsel. Ét sted at justere → ens design overalt.

/** Basis-container for et aftalekort (kant-farve sættes separat, se nedenfor). */
export const CARD_BASE =
  "group relative rounded-lg border bg-card overflow-hidden " +
  "shadow-[0_1px_2px_-1px_hsl(var(--foreground)/0.06)] " +
  "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out";

/** Standard kant-farve for et hvilende kort. */
export const CARD_BORDER = "border-border/70";

/** Hover-løft — ens på alle kort (kun når kortet ikke er valgt/disabled). */
export const CARD_HOVER =
  "hover:border-foreground/25 hover:bg-secondary/30 " +
  "hover:shadow-[0_4px_14px_-6px_hsl(var(--foreground)/0.18)] hover:-translate-y-[1px]";

/** Valgt tilstand (multi-select). */
export const CARD_SELECTED =
  "border-accent ring-1 ring-accent/40";

/** Aktiv drag-tilstand. */
export const CARD_DRAGGING =
  "ring-1 ring-accent opacity-95";

/** Bredde på venstre-accent-stribe — ens på tværs af alle kort. */
export const CARD_RAIL_WIDTH = "w-[3px]";

/* ─────────────────────────────────────────────────────────────────────────
   Delte knap-stilarter — ét sted at definere hover/active/focus så alle
   interaktive knapper i ruteplanlæggeren føles ens og moderne.
   ───────────────────────────────────────────────────────────────────────── */

/** Fritstående ikon-knap (firkantet hit-area). Blød hover-flade + tydeligt
 *  tryk-feedback (active:scale) og synligt fokus-ring kun ved tastatur. */
export const ICON_BTN =
  "inline-flex items-center justify-center rounded-md text-muted-foreground " +
  "transition-[background-color,color,transform] duration-150 " +
  "hover:bg-secondary hover:text-foreground " +
  "active:scale-[0.92] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-card " +
  "disabled:opacity-40 disabled:pointer-events-none";

/** Accent-variant af ikon-knappen (fx tildel/aktiv-handling). */
export const ICON_BTN_ACCENT =
  "inline-flex items-center justify-center rounded-md text-muted-foreground " +
  "transition-[background-color,color,transform] duration-150 " +
  "hover:bg-accent/10 hover:text-accent " +
  "active:scale-[0.92] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-card " +
  "disabled:opacity-40 disabled:pointer-events-none";

/** Destruktiv variant (fjern/slet). */
export const ICON_BTN_DESTRUCTIVE =
  "inline-flex items-center justify-center rounded-md text-muted-foreground " +
  "transition-[background-color,color,transform] duration-150 " +
  "hover:bg-destructive/10 hover:text-destructive " +
  "active:scale-[0.92] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-1 focus-visible:ring-offset-card " +
  "disabled:opacity-40 disabled:pointer-events-none";

/** Segment-knap i en delt række (fx kort-footer). Ingen scale (fuld-bredde),
 *  blød hover-flade og fokus uden hård outline. */
export const SEGMENT_BTN =
  "inline-flex items-center justify-center gap-1.5 transition-colors duration-150 " +
  "text-muted-foreground hover:text-foreground hover:bg-secondary/70 " +
  "focus-visible:outline-none focus-visible:bg-secondary focus-visible:text-foreground " +
  "active:bg-secondary";
