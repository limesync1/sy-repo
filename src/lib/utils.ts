import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returnerer en læsbar tekstfarve (sort eller hvid) til en given hex-baggrund.
 * Bruges når en badge får en bruger-defineret farve (rute/medarbejder) så
 * teksten ikke bliver hvid-på-hvid i dark mode eller når brugeren vælger
 * en lys farve som baggrund.
 */
export function readableTextOn(bg?: string | null): string {
  if (!bg) return "hsl(var(--primary-foreground))";
  const m = bg.trim().match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i);
  if (!m) return "#fff";
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#0b0f1a" : "#fff";
}
