// Picks existing engine articles worth improving: "almost page 1" pages first, then the oldest unrefreshed ones.
export interface BoostArticle { slug: string; updated_at: string }
export interface PageStat { slug: string; position: number; impressions: number }

export const BOOST_MIN_POSITION = 8;
export const BOOST_MAX_POSITION = 20;
export const BOOST_MIN_IMPRESSIONS = 30;
export const STALE_DAYS = 180;
export const MIN_DAYS_BETWEEN_BOOSTS = 30;

export function selectBoost(articles: BoostArticle[], stats: PageStat[], now: number, limit = 2): { slug: string; reason: 'side2' | 'gammel' }[] {
  const day = 864e5;
  const age = (a: BoostArticle) => (now - new Date(a.updated_at).getTime()) / day;
  const eligible = new Map(articles.filter((a) => age(a) >= MIN_DAYS_BETWEEN_BOOSTS).map((a) => [a.slug, a]));
  const out: { slug: string; reason: 'side2' | 'gammel' }[] = [];
  const near = stats
    .filter((s) => eligible.has(s.slug) && s.position >= BOOST_MIN_POSITION && s.position <= BOOST_MAX_POSITION && s.impressions >= BOOST_MIN_IMPRESSIONS)
    .sort((a, b) => b.impressions - a.impressions);
  for (const s of near) { if (out.length < limit) { out.push({ slug: s.slug, reason: 'side2' }); eligible.delete(s.slug); } }
  const old = [...eligible.values()].filter((a) => age(a) >= STALE_DAYS).sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  for (const a of old) if (out.length < limit) out.push({ slug: a.slug, reason: 'gammel' });
  return out;
}
