// Lærte opgavetider: median af faktisk registreret tid på tidligere besøg
// i samme faste aftale. Kun med nok historik, og begrænset til 0,5–2× den
// planlagte tid, så en enkelt glemt stopknap ikke ødelægger planen.
export function learnedDuration(planned: number, samples: number[]): number {
  const clean = samples.filter((m) => Number.isFinite(m) && m >= 5 && m <= 600).sort((a, b) => a - b);
  if (clean.length < 3) return planned;
  const mid = Math.floor(clean.length / 2);
  const median = clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
  return Math.round(Math.min(planned * 2, Math.max(planned * 0.5, median)));
}
