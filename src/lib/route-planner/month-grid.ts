import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from "date-fns";

/** Dage tilbage i måneden, hvor månedsvisningen begynder at vise næste måned med. */
export const LOOKAHEAD_DAYS_LEFT = 10;
/** Antal ekstra uger, der vises ind i næste måned sent på måneden. */
export const LOOKAHEAD_WEEKS = 2;

/**
 * Månedsgitterets dage. Når den viste måned er den aktuelle, og der er
 * højst 10 dage tilbage, vises de første uger af næste måned også — så
 * man ikke står den 27. og ikke kan se de kommende ruter.
 */
export function monthGridRange(anchor: Date, today: Date = new Date()): { start: Date; end: Date; extended: boolean } {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const baseEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const extended = isSameMonth(anchor, today) && differenceInCalendarDays(endOfMonth(today), today) <= LOOKAHEAD_DAYS_LEFT;
  return { start, end: extended ? addDays(baseEnd, LOOKAHEAD_WEEKS * 7) : baseEnd, extended };
}
