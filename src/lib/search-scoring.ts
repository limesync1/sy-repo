// ─────────────────────────────────────────────────────────────────────────────
// Søge-scoring — lille, veltestet hjælpemodul til at rangere autocomplete-
// forslag efter match-kvalitet (prefix > word-start > substring > fuzzy) og
// popularitet, med dansk normalisering (æ/ø/å bevares som selvstændige
// bogstaver, accenter fjernes) og tolerance for stavefejl.
// Bruges af SearchSuggest til at ranke virksomheder, byer og kategorier.
// ─────────────────────────────────────────────────────────────────────────────

/** Normaliserer dansk tekst til sammenligning: små bogstaver, trimmet
 *  whitespace, og fjernede diakritiske tegn — men bevarer æ/ø/å som de er
 *  (de må IKKE foldes til a/o/a, da det ville slå fejl-matches sammen med
 *  helt andre ord på dansk, fx "hår" vs "har"). */
export const normalizeDanish = (input: string): string => {
  // NFKD dekomponerer OGSÅ æ/ø/å (å → a + combining ring above), som vi
  // eksplicit IKKE vil folde til a/o/a — de er selvstændige danske bogstaver
  // og skal forblive forskellige fra deres latinske "søskende". Vi beskytter
  // dem derfor med midlertidige placeholders før NFKD-normaliseringen og
  // gendanner dem bagefter.
  const PLACEHOLDERS: Record<string, string> = { "æ": "", "ø": "", "å": "" };
  const RESTORE: Record<string, string> = { "": "æ", "": "ø", "": "å" };
  const protectedInput = input
    .toLowerCase()
    .replace(/[æøå]/g, (ch) => PLACEHOLDERS[ch]);
  return protectedInput
    .normalize("NFKD")
    // Fjern kombinerende accent-tegn (é → e, ü → u …).
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0001\u0002\u0003]/g, (ch) => RESTORE[ch])
    .trim()
    .replace(/\s+/g, " ");
};

/** Damerau-Levenshtein-afstand (tilladt: indsæt, slet, erstat, transponér
 *  nabo-tegn) — bruges til at opfange typiske tastefejl som "kbenhavn"
 *  eller "rendøring" (byttet om på bogstaver). */
export const damerauLevenshtein = (a: string, b: string): number => {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const d: number[][] = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // sletning
        d[i][j - 1] + 1, // indsættelse
        d[i - 1][j - 1] + cost, // erstatning
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost); // transposition
      }
    }
  }
  return d[al][bl];
};

/** Genererer trigrammer (3-tegns n-grammer) af en streng, paddet i
 *  begge ender så korte strenge og kant-bogstaver også vægter. */
const trigrams = (s: string): Set<string> => {
  const padded = `  ${s} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
};

/** Trigram-similaritet (Jaccard over 3-grammer) mellem 0 og 1 — robust
 *  til stavefejl der ligger for langt fra Damerau-Levenshtein-grænsen på
 *  lange ord (fx "rengoering" vs "rengøring"). */
export const trigramSimilarity = (a: string, b: string): number => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ga = trigrams(a);
  const gb = trigrams(b);
  let intersection = 0;
  for (const g of ga) if (gb.has(g)) intersection++;
  const union = ga.size + gb.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

export type MatchKind = "exact" | "prefix" | "word-start" | "substring" | "fuzzy";

export interface MatchResult {
  kind: MatchKind;
  /** Match-kvalitet, 0–100, uafhængig af popularitet. */
  quality: number;
}

/** Maks. tilladt redigeringsafstand for fuzzy-match, skaleret med
 *  ordlængden (korte ord tolererer ingen/få fejl, lange ord op til 2). */
const maxFuzzyDistance = (len: number): number => (len <= 3 ? 0 : len <= 6 ? 1 : 2);

/** Finder det bedste match mellem en (normaliseret) forespørgsel og en
 *  (normaliseret) tekst — prøver i rækkefølge: eksakt, prefix, word-start,
 *  substring, og til sidst fuzzy (Damerau-Levenshtein <= 2 eller trigram
 *  similaritet >= 0.5). Returnerer null hvis intet match findes. */
export const matchText = (queryNorm: string, textNorm: string): MatchResult | null => {
  if (!queryNorm || !textNorm) return null;

  if (textNorm === queryNorm) return { kind: "exact", quality: 100 };
  if (textNorm.startsWith(queryNorm)) return { kind: "prefix", quality: 90 };

  // Word-start: forespørgslen matcher starten af et ord inde i teksten
  // (fx "flyt" i "trappevask og flytterengøring").
  const words = textNorm.split(/[\s/,.-]+/).filter(Boolean);
  if (words.some((w) => w.startsWith(queryNorm))) return { kind: "word-start", quality: 75 };

  if (textNorm.includes(queryNorm)) return { kind: "substring", quality: 60 };

  // Fuzzy — dæk stavefejl. Sammenlign forespørgslen mod hele teksten og
  // mod de enkelte ord (så "rendøring" stadig rammer "rengøring" i en
  // længere virksomhedsbeskrivelse).
  const candidates = [textNorm, ...words];
  let best: { distance: number; sim: number } | null = null;
  for (const c of candidates) {
    const distance = damerauLevenshtein(queryNorm, c);
    const sim = trigramSimilarity(queryNorm, c);
    if (!best || distance < best.distance || (distance === best.distance && sim > best.sim)) {
      best = { distance, sim };
    }
  }
  if (!best) return null;

  const allowedDistance = maxFuzzyDistance(queryNorm.length);
  if (best.distance <= allowedDistance || best.sim >= 0.5) {
    // Jo tættere match, jo højere kvalitet (skala 20–55).
    const distancePenalty = Math.min(best.distance * 10, 30);
    const simBoost = Math.round(best.sim * 15);
    const quality = Math.max(20, 55 - distancePenalty + simBoost);
    return { kind: "fuzzy", quality };
  }

  return null;
};

/** Samlet score for et forslag: match-kvalitet + popularitets-bonus.
 *  `popularity` er en fritvalgt, ikke-negativ værdi (fx antal bookinger,
 *  visninger, eller blot et manuelt "vigtighed"-tal) — den vægtes lavere
 *  end selve match-kvaliteten, så et dårligt match aldrig kan overhale et
 *  præcist match, uanset hvor populært det er. */
export const scoreMatch = (
  query: string,
  text: string,
  popularity = 0,
): (MatchResult & { score: number }) | null => {
  const match = matchText(normalizeDanish(query), normalizeDanish(text));
  if (!match) return null;
  const popularityBonus = Math.min(Math.log10(1 + Math.max(0, popularity)) * 5, 15);
  return { ...match, score: match.quality + popularityBonus };
};

/** Hjælper til at ranke en liste af emner: kører `scoreMatch` mod en
 *  udtrukket søgetekst pr. emne, filtrerer ikke-matches fra, og sorterer
 *  faldende efter score (højeste kvalitet/popularitet først). */
export const rankByQuery = <T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  getPopularity?: (item: T) => number,
): Array<{ item: T; score: number; kind: MatchKind }> => {
  const results: Array<{ item: T; score: number; kind: MatchKind }> = [];
  for (const item of items) {
    const result = scoreMatch(query, getText(item), getPopularity?.(item) ?? 0);
    if (result) results.push({ item, score: result.score, kind: result.kind });
  }
  return results.sort((a, b) => b.score - a.score);
};
