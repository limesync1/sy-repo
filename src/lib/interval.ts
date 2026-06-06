/**
 * Central interval-bibliotek.
 *
 * Understøtter to formater:
 *   1) Legacy enum-værdier: "engangskøb", "ugentlig", "hver_14_dag", ...
 *   2) Nyt fleksibelt format: "every_<N>_<unit>" hvor unit ∈ {day,week,month,year}
 *      Eksempler: "every_1_day", "every_6_day", "every_3_week", "every_2_month".
 *
 * Formålet er at have ét sted som forstår alle intervaller, formaterer dem
 * grammatisk korrekt på dansk, og kan oversætte dem til antal dage til brug
 * i kalender-projektioner og næste-dato-beregninger.
 */

export type IntervalUnit = "day" | "week" | "month" | "year";

export type ParsedInterval = {
  /** Antal enheder; 0 betyder engangskøb. */
  n: number;
  /** Enhed; for engangskøb er den irrelevant (default day). */
  unit: IntervalUnit;
  /** True for engangskøb. */
  once: boolean;
  /** Den oprindelige nøgle, så vi kan slå farver/legacy-mapping op. */
  raw: string;
};

/** Konstanter til UI-dropdowns. */
export const INTERVAL_UNITS: { value: IntervalUnit; singular: string; plural: string; ordinalSingular: string }[] = [
  { value: "day",   singular: "dag",   plural: "dage",    ordinalSingular: "dag" },
  { value: "week",  singular: "uge",   plural: "uger",    ordinalSingular: "uge" },
  { value: "month", singular: "måned", plural: "måneder", ordinalSingular: "måned" },
  { value: "year",  singular: "år",    plural: "år",      ordinalSingular: "år" },
];

/** Tilbagefald for legacy-nøgler → {n, unit}. */
const LEGACY_MAP: Record<string, { n: number; unit: IntervalUnit }> = {
  "10_min":      { n: 1,  unit: "day" }, // teknisk test-værdi; vi behandler den som "daglig" for projektion
  daglig:        { n: 1,  unit: "day" },
  hver_2_dag:    { n: 2,  unit: "day" },
  ugentlig:      { n: 1,  unit: "week" },
  hver_14_dag:   { n: 2,  unit: "week" },
  hver_3_uge:    { n: 3,  unit: "week" },
  hver_4_uge:    { n: 4,  unit: "week" },
  hver_8_uge:    { n: 8,  unit: "week" },
  månedlig:      { n: 1,  unit: "month" },
  kvartalsvis:   { n: 3,  unit: "month" },
  halvårlig:     { n: 6,  unit: "month" },
  årlig:         { n: 1,  unit: "year" },
};

const unitFromAnyLabel = (raw: string): IntervalUnit | null => {
  const u = raw.toLowerCase().trim();
  if (["day", "days", "dag", "dage"].includes(u)) return "day";
  if (["week", "weeks", "uge", "uger"].includes(u)) return "week";
  if (["month", "months", "måned", "maaned", "månedlig", "måneder", "maaneder"].includes(u)) return "month";
  if (["year", "years", "år", "aar"].includes(u)) return "year";
  return null;
};

/** Parser et hvilket som helst interval-string til en kanonisk form. */
export function parseInterval(value: string | null | undefined): ParsedInterval | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v || v === "engangskøb" || v === "engangskob" || v === "once") {
    return { n: 0, unit: "day", once: true, raw: v };
  }
  // Nyt format: every_<N>_<unit>
  const m = v.match(/^every[_:](\d+)[_:](day|week|month|year)s?$/i);
  if (m) {
    const n = Math.max(1, parseInt(m[1], 10) || 1);
    const unit = m[2].toLowerCase() as IntervalUnit;
    return { n, unit, once: false, raw: v };
  }
  const legacy = LEGACY_MAP[v];
  if (legacy) return { n: legacy.n, unit: legacy.unit, once: false, raw: v };

  // Defensive parser for older/handwritten Danish keys and labels that may
  // already exist in service/order details, e.g. "hver_8_uge", "Hver 2. uge",
  // "hvert 2. år" or "every-3-months". Projection must understand the
  // cadence even if storage used a non-enum/custom representation.
  const flexible = v
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[_:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const fm = flexible.match(/^(?:hver|hvert|every)\s+(\d+)\s+(day|days|dag|dage|week|weeks|uge|uger|month|months|måned|maaned|måneder|maaneder|year|years|år|aar)$/i);
  if (fm) {
    const n = Math.max(1, parseInt(fm[1], 10) || 1);
    const unit = unitFromAnyLabel(fm[2]);
    if (unit) return { n, unit, once: false, raw: v };
  }
  return null;
}

/** Bygger den nye kanoniske string-repræsentation. */
export function buildInterval(n: number, unit: IntervalUnit): string {
  if (!n || n <= 0) return "engangskøb";
  return `every_${Math.round(n)}_${unit}`;
}

/**
 * Formaterer et interval grammatisk korrekt på dansk.
 * - n=1: "Dagligt" / "Ugentligt" / "Månedligt" / "Årligt"
 * - n>1: "Hver N. dag" / "Hver N. uge" / "Hver N. måned" / "Hvert N. år"
 * - 0:   "Engangskøb"
 */
export function formatInterval(value: string | null | undefined): string {
  // Special-case: minut-baserede test-/teknisk-intervaller (fx "10_min").
  // Vi understøtter dem ikke i kalender-projektionen (behandles som
  // "daglig" dér), men i UI skal de vises korrekt så ejeren ikke bliver
  // forvirret af et "Dagligt"-label på et 10-minutters interval.
  if (value) {
    const mm = String(value).trim().match(/^(\d+)[_ ]?min(?:ut(?:ter)?)?$/i);
    if (mm) {
      const n = Math.max(1, parseInt(mm[1], 10) || 1);
      return n === 1 ? "Hvert minut" : `Hvert ${n}. minut`;
    }
  }
  const p = parseInterval(value);
  if (!p) return value ? String(value) : "Engangskøb";
  if (p.once) return "Engangskøb";
  if (p.n === 1) {
    switch (p.unit) {
      case "day":   return "Dagligt";
      case "week":  return "Ugentligt";
      case "month": return "Månedligt";
      case "year":  return "Årligt";
    }
  }
  // "Hver" for fælleskøn (dag, uge, måned), "Hvert" for intetkøn (år).
  const det = p.unit === "year" ? "Hvert" : "Hver";
  const unitWord = INTERVAL_UNITS.find((u) => u.value === p.unit)!.ordinalSingular;
  return `${det} ${p.n}. ${unitWord}`;
}

/** Kort variant til kompakte badges (samme som formatInterval pt., men adskilt API for fremtidssikring). */
export function formatIntervalShort(value: string | null | undefined): string {
  return formatInterval(value);
}

/** "Per ugentligt" → "/ugentligt", brugt fx i pris-suffixer. */
export function formatIntervalSuffix(value: string | null | undefined): string {
  const p = parseInterval(value);
  if (!p || p.once) return "";
  return `/${formatInterval(value).toLowerCase()}`;
}

/** Returnerer "dag/uge/måned/år" eller "dage/uger/måneder/år" baseret på antal. */
export function unitLabel(n: number, unit: IntervalUnit): string {
  const meta = INTERVAL_UNITS.find((u) => u.value === unit)!;
  return n === 1 ? meta.singular : meta.plural;
}

/** Konverterer et interval til antal dage (bruges i kalender-projektion). */
export function intervalToDays(value: string | null | undefined): number | null {
  const p = parseInterval(value);
  if (!p || p.once) return null;
  switch (p.unit) {
    case "day":   return p.n;
    case "week":  return p.n * 7;
    case "month": return p.n * 30;   // tilnærmet — DB bruger interval_to_duration for præcision
    case "year":  return p.n * 365;
  }
}

/**
 * Returnerer den præcise kalender-cadence for et interval. For legacy/custom
 * values der kun gemmer `interval_days`, forsøger vi først at løfte klassiske
 * dagstal tilbage til uge/måned/år, så projektioner ikke driver som 30/31 dage.
 */
export function intervalToCadence(
  value: string | null | undefined,
  intervalDays?: number | null,
): { n: number; unit: IntervalUnit } | null {
  const p = parseInterval(value);
  if (p && !p.once) return { n: p.n, unit: p.unit };

  const days = Number(intervalDays ?? 0);
  if (!Number.isFinite(days) || days <= 0) return null;
  const rounded = Math.round(days);
  if (rounded === 365) return { n: 1, unit: "year" };
  const dayToMonth: Record<number, number> = { 30: 1, 60: 2, 90: 3, 120: 4, 150: 5, 180: 6, 210: 7, 240: 8, 270: 9, 300: 10, 330: 11 };
  if (dayToMonth[rounded]) return { n: dayToMonth[rounded], unit: "month" };
  if (rounded % 7 === 0) return { n: rounded / 7, unit: "week" };
  return { n: rounded, unit: "day" };
}

/**
 * Smart-normalisering: tager (antal, enhed) og returnerer den "pæneste"
 * ækvivalente repræsentation. Eksempler:
 *   - 7 dage   → 1 uge
 *   - 14 dage  → 2 uger
 *   - 30 dage  → 1 måned
 *   - 90 dage  → 3 måneder
 *   - 365 dage → 1 år
 *   - 12 mdr   → 1 år
 *   - 4 uger   → 4 uger (vi rører IKKE ved uger→måned, da 4 uger ≠ 1 måned)
 */
export function normalizeInterval(n: number, unit: IntervalUnit): { n: number; unit: IntervalUnit } {
  if (!n || n <= 0) return { n: 1, unit };
  // Måneder → år
  if (unit === "month" && n % 12 === 0) {
    return { n: n / 12, unit: "year" };
  }
  // Dage → uger / måneder / år
  if (unit === "day") {
    if (n === 365) return { n: 1, unit: "year" };
    // Foretræk måneder for klassiske månedslængder
    const dayToMonth: Record<number, number> = { 30: 1, 60: 2, 90: 3, 120: 4, 150: 5, 180: 6, 270: 9 };
    if (dayToMonth[n]) return { n: dayToMonth[n], unit: "month" };
    if (n % 7 === 0 && n <= 56) return { n: n / 7, unit: "week" };
  }
  // Uger → år (52 uger ≈ 1 år, men kun ved nøjagtigt match)
  if (unit === "week" && n === 52) return { n: 1, unit: "year" };
  return { n, unit };
}

/** Returnerer den tilsvarende legacy-enum hvis intervallet matcher en af dem. */
export function toLegacyEnum(value: string | null | undefined): string | null {
  const p = parseInterval(value);
  if (!p) return null;
  if (p.once) return "engangskøb";
  for (const [key, meta] of Object.entries(LEGACY_MAP)) {
    if (meta.n === p.n && meta.unit === p.unit) return key;
  }
  return null;
}

/**
 * Returnerer altid en gyldig agreement_interval enum-værdi til DB-storage.
 * Hvis intervallet ikke kan udtrykkes som en kendt enum, returnerer vi "custom"
 * (kalderen skal så også gemme `interval_days`).
 */
export function toAgreementEnum(value: string | null | undefined): { interval: string; interval_days: number | null } {
  const p = parseInterval(value);
  if (!p) return { interval: "engangskøb", interval_days: null };
  if (p.once) return { interval: "engangskøb", interval_days: null };
  const legacy = toLegacyEnum(value);
  if (legacy && legacy !== "10_min") {
    return { interval: legacy, interval_days: null };
  }
  return { interval: "custom", interval_days: intervalToDays(value) };
}

/** Tailwind farve-klasse til badge — fordeler farver på unit + n. */
export function intervalBadgeClass(value: string | null | undefined): string {
  const p = parseInterval(value);
  if (!p) return "bg-secondary text-foreground border-border";
  if (p.once) return "bg-secondary text-foreground border-border";
  switch (p.unit) {
    case "day":   return p.n === 1 ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-amber-50 text-amber-700 border-amber-200";
    case "week":  {
      if (p.n <= 1) return "bg-blue-50 text-blue-700 border-blue-200";
      if (p.n <= 2) return "bg-cyan-50 text-cyan-700 border-cyan-200";
      if (p.n <= 4) return "bg-indigo-50 text-indigo-700 border-indigo-200";
      return "bg-violet-50 text-violet-700 border-violet-200";
    }
    case "month": {
      if (p.n === 1) return "bg-pink-50 text-pink-700 border-pink-200";
      if (p.n <= 3) return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    case "year":  return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
}

/**
 * Validerer én interval-nøgle. Returnerer null hvis ok, ellers en
 * brugervenlig dansk fejlbesked. Bruges af `validateServiceIntervals`
 * og af UI-komponenter (IntervalBuilder) til at vise fejl med det samme.
 */
export function validateIntervalKey(value: string | null | undefined): string | null {
  if (!value) return "Tomt interval";
  const v = String(value).trim();
  if (!v) return "Tomt interval";
  if (v === "engangskøb" || v === "engangskob" || v === "once") return null;
  const p = parseInterval(v);
  if (!p) return `Ukendt interval "${v}" — kan ikke beregnes`;
  if (p.once) return null;
  if (!Number.isFinite(p.n) || p.n < 1) return "Antallet skal være mindst 1";
  if (p.n > 999) return "Antallet er for stort (maks 999)";
  if (!["day", "week", "month", "year"].includes(p.unit)) {
    return `Ugyldig enhed "${p.unit}"`;
  }
  // Strikse, meningsfulde grænser pr. enhed — undgår fx "hver 90. dag"
  // (brug 3 måneder), "hver 60. uge" (brug år) eller andre kombinationer
  // der ville give forvirrende projektioner og bør udtrykkes pænere.
  const norm = normalizeInterval(p.n, p.unit);
  if (norm.n !== p.n || norm.unit !== p.unit) {
    return `Brug "${formatInterval(buildInterval(norm.n, norm.unit))}" i stedet`;
  }
  switch (p.unit) {
    case "day":
      if (p.n > 30) return "Brug uger eller måneder i stedet for mere end 30 dage";
      break;
    case "week":
      if (p.n > 12) return "Brug måneder i stedet for mere end 12 uger";
      break;
    case "month":
      if (p.n > 12) return "Brug år i stedet for mere end 12 måneder";
      break;
    case "year":
      if (p.n > 10) return "Maks 10 år mellem forekomster";
      break;
  }
  return null;
}

export type ServiceIntervalValidation = {
  ok: boolean;
  /** Fejl pr. interval (key → besked). */
  errors: Record<string, string>;
  /** Generel fejlbesked (hvis listen som helhed er ugyldig). */
  message: string | null;
};

/**
 * Validerer en services valgte intervaller. Reglerne:
 *  - Mindst ét interval skal være valgt (engangskøb tæller med).
 *  - Hvert interval skal være parseable og inden for fornuftige grænser.
 *  - Ingen dubletter (samme key må ikke optræde to gange).
 *  - Hvis kunden vil kunne booke abonnement, skal mindst ét tilbagevendende
 *    interval (ikke engangskøb) være valgt.
 */
export function validateServiceIntervals(values: string[] | null | undefined): ServiceIntervalValidation {
  const errors: Record<string, string> = {};
  const list = Array.isArray(values) ? values : [];
  if (list.length === 0) {
    return { ok: false, errors, message: "Vælg mindst ét interval" };
  }
  const seen = new Set<string>();
  for (const v of list) {
    if (seen.has(v)) {
      errors[v] = "Dette interval er valgt flere gange";
      continue;
    }
    seen.add(v);
    const err = validateIntervalKey(v);
    if (err) errors[v] = err;
  }
  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    message: ok ? null : "Et eller flere intervaller kan ikke beregnes korrekt",
  };
}
