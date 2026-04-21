/**
 * Format a duration in minutes as a human-readable Danish string.
 *
 *   30  → "30 min"
 *   60  → "1 time"
 *   90  → "1 t 30 min"
 *   180 → "3 timer"
 *   195 → "3 t 15 min"
 */
export const formatDurationMin = (
  totalMinutes: number | null | undefined,
  opts: { short?: boolean } = {},
): string => {
  const min = Math.max(0, Math.round(Number(totalMinutes ?? 0)));
  if (min === 0) return opts.short ? "0m" : "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return opts.short ? `${m}m` : `${m} min`;
  if (m === 0) {
    if (opts.short) return `${h}t`;
    return h === 1 ? "1 time" : `${h} timer`;
  }
  if (opts.short) return `${h}t ${m}m`;
  return `${h} t ${m} min`;
};