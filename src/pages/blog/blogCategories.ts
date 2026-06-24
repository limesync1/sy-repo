// Kategori-registret bag /blog/kategori/:slug. Slugs er æøå-rensede
// og bruges i URL, lookup og sitemap. Vi normaliserer enkelte
// synonymer (Skadedyr/Skadedyrsbekæmpelse, Vinduespudser/-pudsning)
// så artikler ikke spreder sig over flere kategori-sider med samme
// emne.

import { BLOG_POSTS } from "./blogPosts";

/** Slug → kanonisk kategori-navn (matcher post.category). */
const SLUG_TO_NAME: Record<string, string> = {
  "rengoering": "Rengøring",
  "flytning": "Flyttehjælp",
  "haandvaerker": "Håndværker",
  "haveservice": "Haveservice",
  "anlaegsgartner": "Anlægsgartner",
  "tomrer": "Tømrer",
  "murer": "Murer",
  "maler": "Maler",
  "elektriker": "Elektriker",
  "vvs": "VVS",
  "gulvlaegger": "Gulvlægger",
  "vinduespudsning": "Vinduespudsning",
  "skorstensfejer": "Skorstensfejer",
  "algebehandling": "Algebehandling",
  "skadedyr": "Skadedyrsbekæmpelse",
  "sikkerhed": "Sikkerhed",
  "tagrenovering": "Tagrenovering",
  "glarmester": "Glarmester",
  "laasesmed": "Låsesmed",
  "oekonomi": "Økonomi",
};

/** Aliasser → kanonisk navn (i tilfælde af inkonsistente posts). */
const ALIAS: Record<string, string> = {
  "Skadedyr": "Skadedyrsbekæmpelse",
  "Vinduespudser": "Vinduespudsning",
  "Guides": "Økonomi",
};

export const normalizeCategory = (raw: string): string => ALIAS[raw] ?? raw;

export const categoryNameBySlug = (slug: string): string | undefined =>
  SLUG_TO_NAME[slug];

const NAME_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_NAME).map(([s, n]) => [n, s]),
);

/** Liste over kategorier med mindst 1 artikel — sorteret efter antal desc. */
export const BLOG_CATEGORIES: { slug: string; name: string; count: number }[] = (() => {
  const counts = new Map<string, number>();
  for (const p of BLOG_POSTS) {
    const name = normalizeCategory(p.category);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, slug: NAME_TO_SLUG[name], count }))
    .filter((c) => c.slug)
    .sort((a, b) => b.count - a.count);
})();