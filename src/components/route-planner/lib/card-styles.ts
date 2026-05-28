// Delte stilarter for alle "aftalekort" i ruteplanlæggeren, så pool-kort,
// stops-på-ruten og dag-detalje deler præcis samme radius, kant, skygge og
// hover-opførsel. Ét sted at justere → ens design overalt.

/** Basis-container for et aftalekort (uden venstre-accent). */
export const CARD_BASE =
  "group relative rounded-xl border border-border/70 bg-card overflow-hidden " +
  "shadow-[0_1px_2px_hsl(var(--foreground)/0.05)] " +
  "transition-[transform,box-shadow,border-color] duration-200 ease-out";

/** Hover-løft — ens på alle kort (kun når kortet ikke er valgt/disabled). */
export const CARD_HOVER =
  "hover:-translate-y-px hover:border-foreground/25 " +
  "hover:shadow-[0_8px_18px_-8px_hsl(var(--foreground)/0.2)]";

/** Valgt tilstand (multi-select). */
export const CARD_SELECTED =
  "border-accent ring-2 ring-accent/25 shadow-[0_6px_18px_-6px_hsl(var(--accent)/0.45)]";

/** Aktiv drag-tilstand. */
export const CARD_DRAGGING =
  "shadow-[0_12px_28px_-10px_hsl(var(--foreground)/0.28)] ring-2 ring-accent scale-[1.01] opacity-95";

/** Bredde på venstre-accent-stribe — ens på tværs af alle kort. */
export const CARD_RAIL_WIDTH = "w-1";

/** Venstre-padding på kort-indhold så det matcher accent-striben. */
export const CARD_CONTENT_PAD_LEFT = "pl-1";
