// Hjælpere til billedbevis: miniaturesti, filkontrol og forståelige fejltekster.
export const MAX_PHOTO_BYTES = 30 * 1024 * 1024;

/** Miniaturen ligger ved siden af originalen: `abc.jpg` → `abc_t.jpg`. */
export function thumbPathFor(path: string): string {
  return path.replace(/\.jpg$/i, "_t.jpg");
}

export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (file.type && !file.type.startsWith("image/")) return "Filen er ikke et billede. Vælg et foto.";
  if (file.size > MAX_PHOTO_BYTES) return "Billedet er for stort (over 30 MB). Tag et nyt billede.";
  return null;
}

export function photoErrorMessage(e: unknown): string {
  const msg = String((e as any)?.message ?? e ?? "").toLowerCase();
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "Forbindelsen blev afbrudt. Prøv igen, når du har dækning.";
  if (/failed to fetch|network|timeout|load failed/.test(msg)) return "Forbindelsen er ustabil. Prøv igen om lidt.";
  if (/row-level|permission|not authorized|403|unauthorized|jwt/.test(msg)) return "Du har ikke adgang til at gemme billeder på denne aftale.";
  if (/not authenticated/.test(msg)) return "Du er blevet logget ud. Log ind igen.";
  if (/compress|decode|bitmap/.test(msg)) return "Billedet kunne ikke læses. Prøv at tage det igen.";
  if (/payload too large|413|exceeded/.test(msg)) return "Billedet er for stort. Tag et nyt billede.";
  return "Prøv igen om lidt.";
}
