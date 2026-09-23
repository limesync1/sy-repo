// Delte stilarter for alle "aftalekort" i ruteplanlæggeren, så pool-kort,
// stops-på-ruten og dag-detalje deler præcis samme radius, kant, skygge og
// hover-opførsel. Ét sted at justere → ens design overalt.

/* Aftalekort-aliasser (bagudkompatibilitet). Pege på de fælles PILL-tokens
 * herunder — så ALT kører på samme design-token-pakke. */
export const CARD_BORDER = "border-border/55";
export const CARD_HOVER =
  "hover:border-foreground/20 hover:bg-card " +
  "hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.16)]";
export const CARD_SELECTED =
  "border-accent ring-2 ring-accent/30 shadow-[0_0_0_1px_hsl(var(--accent)/0.15),0_4px_14px_-6px_hsl(var(--accent)/0.35)]";
export const CARD_DRAGGING = "ring-1 ring-accent opacity-95";
/** Bredde på venstre-accent-stribe — ens på tværs af alle kort. */
export const CARD_RAIL_WIDTH = "w-[3px]";

/** Basis-container for et aftalekort — bygget oven på de fælles PILL-tokens
 *  så aftalekort og rute-piller deler præcis samme radius, kant, skygge og
 *  transition. */
export const CARD_BASE =
  `group relative ${"rounded-md"} border bg-card overflow-hidden ` +
  "shadow-[0_1px_2px_-1px_hsl(var(--foreground)/0.08)] " +
  "transition-[background-color,border-color,box-shadow] duration-150 ease-out";

/* ─────────────────────────────────────────────────────────────────────────
   FÆLLES PILL/CARD DESIGN-TOKENS

   Ét og kun ÉT sted definerer vi radius, kant, skygge og hover for ALLE
   rute-piller og aftalekort i planneren — kalenderens rute-pille,
   pool-kortene (UnassignedJobCard), stop-rækkerne i RouteStopsPanel og
   dag-detalje. Skift en token her → ens look hele vejen igennem.
   ───────────────────────────────────────────────────────────────────────── */

/** Fælles radius for alle piller/kort i planneren. */
export const PILL_RADIUS = "rounded-md";
/** Mindre radius (bruges hvor rounded-xl er for kraftigt, fx kalender-celler). */
export const PILL_RADIUS_SM = "rounded-md";
/** Standard kant. */
export const PILL_BORDER = "border border-border/55";
/** Standard skygge — multi-layer, blød elevation. */
export const PILL_SHADOW =
  "shadow-[0_1px_0_0_hsl(var(--foreground)/0.02),0_1px_3px_-1px_hsl(var(--foreground)/0.08)]";
/** Hover-skygge — dybere elevation. */
export const PILL_SHADOW_HOVER =
  "hover:shadow-[0_2px_4px_-2px_hsl(var(--foreground)/0.08),0_8px_24px_-10px_hsl(var(--foreground)/0.22)]";
/** Standard transition for pille/kort-stilarter. */
export const PILL_TRANSITION =
  "transition-[background-color,border-color,opacity,box-shadow,transform] duration-200 ease-out";
/** Standard hover-løft. */
export const PILL_HOVER_LIFT = "hover:border-foreground/25";
/** Bredde på venstre farve-rail (fælles for rute-pille og stop-kort). */
export const PILL_RAIL_WIDTH = "w-[3px]";
/** Aktiv multi-select-tilstand for piller (samme som kort, lille variant). */
export const PILL_SELECTED = "ring-1 ring-accent border-accent";

/** Komplet base-klassesæt for en pille (kalender-rute-pille). Brug som
 *  første argument til `cn(...)` så alle piller deler nøjagtigt samme
 *  fundamental-stil. */
export const PILL_BASE = `group relative ${PILL_RADIUS_SM} cursor-pointer overflow-hidden bg-card ${PILL_BORDER} ${PILL_SHADOW} ${PILL_TRANSITION} ${PILL_SHADOW_HOVER} ${PILL_HOVER_LIFT}`;

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
