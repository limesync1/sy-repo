// findNearestFreeDate — finder den nærmeste dato (alternerer +1/-1/+2/-2 …)
// hvor `isOccupied(date)` returnerer false. Bruges af "Flyt projiceret
// forekomst"-dialogen til at foreslå en ledig dato når mål-datoen har
// konflikter (medarbejdere dobbeltbooket, helligdag, eksisterende rute osv.).
import { addDays, format, parseISO } from "date-fns";

export function findNearestFreeDate(
  isoDate: string,
  isOccupied: (iso: string) => boolean,
  opts: { maxRadius?: number; minIsoDate?: string } = {},
): string | null {
  const maxRadius = opts.maxRadius ?? 21;
  const minIso = opts.minIsoDate ?? format(new Date(), "yyyy-MM-dd");
  let base: Date;
  try { base = parseISO(isoDate); } catch { return null; }
  for (let r = 1; r <= maxRadius; r++) {
    for (const sign of [1, -1] as const) {
      const cand = format(addDays(base, sign * r), "yyyy-MM-dd");
      if (cand < minIso) continue;
      if (!isOccupied(cand)) return cand;
    }
  }
  return null;
}