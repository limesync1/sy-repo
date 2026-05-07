// Dansk relativ tid — vælger automatisk minut/time/dag afhængigt af afstand.
// Bruges til at vise "om 6 min", "om 3 timer", "om 2 dage" osv. i stedet for
// at runde op til "om 1 dag" når næste begivenhed er om få minutter.

export type RelativeOpts = { short?: boolean };

export const relativeFromNow = (date: Date | string | null | undefined, opts: RelativeOpts = {}): string => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const ms = d.getTime() - Date.now();
  const minutes = Math.round(ms / 60000);
  if (minutes <= 0) return opts.short ? "nu" : "I dag!";
  if (minutes < 60) return opts.short ? `${minutes}m` : `om ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return opts.short ? `${hours}t` : `om ${hours} time${hours !== 1 ? "r" : ""}`;
  // Beregn dage fra midnat-til-midnat så "i morgen" er korrekt uanset klokkeslæt.
  const a = new Date(); a.setHours(0,0,0,0);
  const b = new Date(d); b.setHours(0,0,0,0);
  const days = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (opts.short) return `${days}d`;
  if (days === 1) return "i morgen";
  return `om ${days} dage`;
};

/** Returnerer minutter til (positivt) eller fra (negativt) en dato. */
export const minutesUntil = (date: Date | string | null | undefined): number | null => {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / 60000);
};
