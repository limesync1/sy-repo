// Verificerede kommunetal fra Danmarks Statistik (statistikbanken.dk).
// Befolkning: FOLK1A (2026K3). Boliger: BOL101 (2026), beboede boliger,
// fordelt på parcel-/stuehuse, række-/kæde-/dobbelthuse og etageboliger.
// Tal gælder hele kommunen. Opdatér årligt med samme tabeller.

export interface CityStat {
  slug: string;
  municipality: string;
  population: number;
  dwellings: number;
  /** Andele i procent af beboede boliger (parcel, række, etage). */
  house: number;
  row: number;
  flat: number;
  /** Andel opført før 1950 og fra 2000 og frem. */
  pre1950: number;
  post2000: number;
}

export const CITY_STATS_SOURCE = {
  label: "Danmarks Statistik, tabel FOLK1A (3. kvt. 2026) og BOL101 (2026)",
  url: "https://www.statistikbanken.dk/BOL101",
  updated: "2026-11-04",
};

export const CITY_STATS: CityStat[] = [
  { slug: "koebenhavn", municipality: "Københavns Kommune", population: 670389, dwellings: 321816, house: 5, row: 3, flat: 92, pre1950: 64, post2000: 17 },
  { slug: "frederiksberg", municipality: "Frederiksberg Kommune", population: 105947, dwellings: 52657, house: 2, row: 1, flat: 97, pre1950: 71, post2000: 4 },
  { slug: "aarhus", municipality: "Aarhus Kommune", population: 378270, dwellings: 177727, house: 23, row: 17, flat: 60, pre1950: 26, post2000: 28 },
  { slug: "odense", municipality: "Odense Kommune", population: 213140, dwellings: 101658, house: 31, row: 23, flat: 46, pre1950: 31, post2000: 17 },
  { slug: "aalborg", municipality: "Aalborg Kommune", population: 226404, dwellings: 112783, house: 34, row: 15, flat: 51, pre1950: 28, post2000: 24 },
  { slug: "esbjerg", municipality: "Esbjerg Kommune", population: 114824, dwellings: 55968, house: 49, row: 15, flat: 35, pre1950: 27, post2000: 12 },
  { slug: "randers", municipality: "Randers Kommune", population: 100921, dwellings: 49499, house: 46, row: 13, flat: 40, pre1950: 33, post2000: 18 },
  { slug: "kolding", municipality: "Kolding Kommune", population: 96140, dwellings: 45096, house: 49, row: 17, flat: 34, pre1950: 28, post2000: 21 },
  { slug: "vejle", municipality: "Vejle Kommune", population: 123947, dwellings: 55790, house: 51, row: 15, flat: 33, pre1950: 28, post2000: 24 },
  { slug: "horsens", municipality: "Horsens Kommune", population: 98999, dwellings: 44920, house: 50, row: 12, flat: 38, pre1950: 30, post2000: 28 },
];

export const findCityStat = (slug?: string) => CITY_STATS.find((s) => s.slug === slug);

/** Konklusioner der følger direkte af tallene — ingen opfundne fakta. */
export function cityStatInsights(s: CityStat): string[] {
  const out: string[] = [];
  if (s.flat >= 60) out.push(`${s.flat} % af boligerne er etageboliger, så mange opgaver handler om lejligheder med trapper, fælles gårde og aftaler med ejer- eller andelsforeningen.`);
  else if (s.house >= 40) out.push(`${s.house} % af boligerne er parcel- eller stuehuse, så have, tag, facade, vinduer og indkørsel fylder meget i de typiske opgaver.`);
  else out.push(`Boligerne er blandede: ${s.house} % parcelhuse, ${s.row} % rækkehuse og ${s.flat} % etageboliger, så udbyderne skal kunne håndtere både huse og lejligheder.`);
  if (s.pre1950 >= 50) out.push(`${s.pre1950} % af boligerne er opført før 1950. Ældre bygninger kræver ofte ekstra omhu med gamle installationer, vinduer og overflader.`);
  else out.push(`${s.pre1950} % af boligerne er opført før 1950, mens ${s.post2000} % er fra år 2000 eller senere.`);
  return out;
}
