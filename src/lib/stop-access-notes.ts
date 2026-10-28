// Finder vigtige adgangsforhold (koder, husdyr, parkering, nøgler) i kundens
// bemærkninger, så medarbejderen ser dem øverst på stoppet.
export type AccessHint = { kind: "code" | "pet" | "parking" | "key" | "gate" | "alarm"; label: string; text: string };

const RULES: Array<{ kind: AccessHint["kind"]; label: string; re: RegExp }> = [
  { kind: "code", label: "Kode", re: /(?:dørkode|portkode|adgangskode|nøgleboks|kode)\s*[:=–-]?\s*[\dA-Za-z#*]{3,12}/i },
  { kind: "pet", label: "Dyr", re: /\b(hund|hunde|kat|katte|hest)\w*/i },
  { kind: "parking", label: "Parkering", re: /\b(parkér|parker|parkering|holdeplads)\w*/i },
  { kind: "key", label: "Nøgle", re: /\b(nøgle|nøgler)\w*/i },
  { kind: "gate", label: "Låge/port", re: /\b(låge|port|bagdør|baggård|indkørsel)\w*/i },
  { kind: "alarm", label: "Alarm", re: /\balarm\w*/i },
];

/** Returnerer de sætninger i noten, der indeholder adgangsinfo (højst én pr. type). */
export function extractAccessHints(note: string | null | undefined): AccessHint[] {
  if (!note?.trim()) return [];
  const sentences = note.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const out: AccessHint[] = [];
  for (const rule of RULES) {
    const hit = sentences.find((s) => rule.re.test(s));
    if (hit && !out.some((h) => h.text === hit)) out.push({ kind: rule.kind, label: rule.label, text: hit });
  }
  return out;
}
