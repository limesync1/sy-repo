/**
 * Deterministisk kulør pr. branche/service-navn.
 *
 * Samme princip som "Find den rette branche" på forsiden: en stabil hash af
 * strengen spredes ud over farvecirklen med det gyldne snit, så to naboer
 * aldrig får samme nuance. Værdien bruges som CSS-variabel `--ind` og indgår
 * i HSL-udtryk, så farverne følger lys/mørk tilstand.
 */
export const hueForString = (input?: string | null): number => {
  const s = (input || "").trim().toLowerCase();
  if (!s) return 190;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return Math.round((h * 137.508 + 168) % 360);
};

/** Style-objekt der sætter `--ind` til brug i `hsl(var(--ind) ...)`-udtryk. */
export const industryStyle = (input?: string | null) =>
  ({ ["--ind" as string]: `${hueForString(input)}` }) as React.CSSProperties;
