// Håndværksmodul: materialer på opgaver, grossistprisfiler og kvalitetssikring.
// Slås til pr. virksomhed i Indstillinger (businesses.settings.trade_modules),
// og tilbydes kun brancher, hvor det giver mening.

export type TradeModules = { materials: boolean; wholesaler: boolean; quality: boolean };

export function readTradeModules(settings: unknown): TradeModules {
  const t = ((settings as any)?.trade_modules ?? {}) as Partial<TradeModules>;
  const materials = !!t.materials;
  return { materials, wholesaler: materials && !!t.wholesaler, quality: !!t.quality };
}

// Brancher (labels fra service-taksonomien) hvor materialer og KS giver mening.
const CRAFT_KEYWORDS = [
  "elektriker", "vvs", "varmepumpe", "køleteknik", "tømrer", "snedker", "maler", "murer",
  "tagdækker", "gulvlægger", "låsesmed", "glarmester", "handyman", "solcelleinstallation",
  "kloak", "skorstensfejer", "ventilation", "fugt og skimmel", "brandsikring", "skadeservice",
  "anlægsgartner", "hvidevarereparation", "servicetekniker", "vicevært", "forrudeskift",
  "vandingsanlæg", "pool",
];

export function isCraftBusiness(categories: (string | null | undefined)[]): boolean {
  return categories.some((c) => {
    const l = (c ?? "").toLowerCase();
    return !!l && CRAFT_KEYWORDS.some((k) => l.includes(k));
  });
}

export const WHOLESALERS = ["Solar", "Sanistål", "Brødrene Dahl", "Ahlsell", "Lemvigh-Müller", "Davidsen", "Stark", "XL-Byg", "Egen"] as const;

/* ── Kvalitetssikring ─────────────────────────────────────────── */
export type QualityItemType = "check" | "number" | "text";
export type QualityItem = { id: string; label: string; type: QualityItemType; unit?: string; required?: boolean };
export type QualityAnswer = QualityItem & { value?: string };
export const CHECK_VALUES = [
  { value: "ja", label: "OK" },
  { value: "nej", label: "Fejl" },
  { value: "ikke_relevant", label: "Ikke relevant" },
] as const;

/** Returnerer de påkrævede punkter, der mangler svar (tom liste = kan afsluttes). */
export function checklistProblems(items: QualityAnswer[]): string[] {
  return items
    .filter((i) => i.required && !(i.value ?? "").toString().trim())
    .map((i) => i.label);
}

export function checklistHasDeviation(items: QualityAnswer[]): boolean {
  return items.some((i) => i.type === "check" && i.value === "nej");
}

let seq = 0;
export const newItemId = () => `i${Date.now().toString(36)}${(seq++).toString(36)}`;
const it = (label: string, type: QualityItemType = "check", unit?: string, required = true): QualityItem =>
  ({ id: label.toLowerCase().replace(/[^a-zæøå0-9]+/g, "-"), label, type, unit, required });

export const STANDARD_TEMPLATES: { key: string; trades: string[]; name: string; description: string; items: QualityItem[] }[] = [
  {
    key: "el", trades: ["elektriker", "solcelle", "brandsikring"], name: "Eftersyn af elinstallation",
    description: "Målinger og afprøvning efter udført el-arbejde.",
    items: [
      it("Isolationsmodstand", "number", "MΩ"), it("Jordingsmodstand", "number", "Ω"),
      it("Fejlstrømsafbryder (HPFI/RCD) afprøvet"), it("Overbelastningsbeskyttelse korrekt dimensioneret"),
      it("Tavle og grupper mærket"), it("Polaritet og funktion kontrolleret"), it("Kunden instrueret i brug"),
      it("Bemærkninger", "text", undefined, false),
    ],
  },
  {
    key: "vvs", trades: ["vvs", "varmepumpe", "kloak", "vandingsanlæg"], name: "Trykprøvning og VVS-aflevering",
    description: "Trykprøve, tæthed og afprøvning af installationen.",
    items: [
      it("Prøvetryk", "number", "bar"), it("Prøvetid", "number", "min"), it("Ingen utætheder konstateret"),
      it("Afspærringsventiler afprøvet"), it("Vådrumsmembran udført efter anvisning"),
      it("Afløb gennemskyllet og frit"), it("Bemærkninger", "text", undefined, false),
    ],
  },
  {
    key: "byg", trades: ["tømrer", "snedker", "murer", "tagdækker", "gulvlægger", "maler", "glarmester"], name: "Aflevering af byggearbejde",
    description: "Kontrol af udførelse, fastgørelse og finish.",
    items: [
      it("Materialer som aftalt"), it("Fastgørelse og lod/vater kontrolleret"), it("Tæthed (vand/vind) kontrolleret"),
      it("Overflader uden synlige fejl"), it("Byggeaffald fjernet"), it("Fugt målt (hvis relevant)", "number", "%", false),
      it("Bemærkninger", "text", undefined, false),
    ],
  },
  {
    key: "generel", trades: [], name: "Aflevering af opgave",
    description: "Kort tjekliste, der passer til alle opgaver.",
    items: [
      it("Arbejdet udført som aftalt"), it("Området ryddet op"), it("Kunden har set arbejdet"),
      it("Fejl eller mangler", "text", undefined, false),
    ],
  },
];

export function suggestedTemplates(categories: string[]) {
  const l = categories.map((c) => c.toLowerCase());
  return STANDARD_TEMPLATES.filter((t) => t.trades.length === 0 || t.trades.some((k) => l.some((c) => c.includes(k))));
}

/* ── Prisfil fra grossist ─────────────────────────────────────── */
export type PriceRow = { sku: string; name: string; unit: string; cost_price: number; sale_price: number };

export function parseDanishNumber(raw: string): number | null {
  let s = (raw ?? "").replace(/kr\.?|dkk|\s/gi, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function splitLine(line: string, d: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === d && !q) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Læser en CSV-prisfil (;/,/tab). Salgspris = filens salgspris, ellers kostpris + avance. */
export function parsePriceFile(text: string, markupPct: number): { rows: PriceRow[]; skipped: number; error?: string } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], skipped: 0, error: "Filen skal have en overskriftslinje og mindst én vare." };
  const first = lines[0];
  const d = ["\t", ";", ","].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const head = splitLine(first, d).map((h) => h.toLowerCase());
  const find = (re: RegExp, not?: RegExp) => head.findIndex((h) => re.test(h) && !(not && not.test(h)));
  const iSale = find(/salgspris|udsalg|vejl/);
  const iSku = find(/varenr|vare nr|varenummer|sku|artikel|item|nr\.?$/);
  const iName = find(/beskrivelse|navn|tekst|description|name|betegnelse/);
  const iUnit = find(/enhed|unit/);
  const iCost = find(/netto|kostpris|indkøb|pris|price/, /salgs|udsalg|vejl/);
  if (iName < 0 || (iCost < 0 && iSale < 0)) {
    return { rows: [], skipped: 0, error: "Kunne ikke finde kolonner for varenavn og pris. Brug fx: Varenr;Beskrivelse;Enhed;Nettopris" };
  }
  const rows: PriceRow[] = []; let skipped = 0;
  for (const line of lines.slice(1)) {
    const c = splitLine(line, d);
    const name = c[iName]?.trim();
    const cost = iCost >= 0 ? parseDanishNumber(c[iCost]) : null;
    const saleFile = iSale >= 0 ? parseDanishNumber(c[iSale]) : null;
    if (!name || (cost == null && saleFile == null) || (cost ?? 0) < 0 || (saleFile ?? 0) < 0) { skipped++; continue; }
    const costPrice = round2(cost ?? 0);
    rows.push({
      sku: (iSku >= 0 ? c[iSku] : "")?.trim() ?? "",
      name: name.slice(0, 200),
      unit: (iUnit >= 0 ? c[iUnit]?.trim() : "") || "stk",
      cost_price: costPrice,
      sale_price: round2(saleFile ?? costPrice * (1 + Math.max(0, markupPct) / 100)),
    });
  }
  return { rows, skipped };
}

export const formatKr = (n: number) =>
  `${n.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr.`;
