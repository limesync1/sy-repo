/**
 * Medarbejderens foretrukne måde at køre en rute på.
 *
 *  "list"  — simpel tjekliste: stoppene i rækkefølge, tryk "Udført".
 *            Intet kort, ingen løbende GPS → nærmest intet strømforbrug.
 *  "guide" — kørselsguide med kort, rutelinje og talte manøvrer.
 *
 * Valget huskes pr. enhed, så man kun bliver spurgt første gang (og kan
 * skifte undervejs eller nulstille valget).
 */
export type RouteRunMode = "list" | "guide";

const KEY = "serviceydere:employee-route:run-mode";

export const readRunMode = (): RouteRunMode | null => {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "list" || v === "guide" ? v : null;
  } catch {
    return null;
  }
};

export const writeRunMode = (mode: RouteRunMode, remember: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    if (remember) window.localStorage.setItem(KEY, mode);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* privacy mode — ikke kritisk */
  }
};

export const clearRunMode = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignorér */
  }
};

/** Kort vibration som kvittering — findes ikke på alle enheder. */
export const buzz = (pattern: number | number[] = 18): void => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as Navigator).vibrate(pattern);
    }
  } catch {
    /* ignorér */
  }
};
