import { INDUSTRY_CONTEXT } from './industry-context.ts';
import { slugify } from './quality.ts';

export interface TopicCandidate { id: string; keyword: string; score: number; target_path?: string | null }
export function topicIndustry(topic: Pick<TopicCandidate, 'keyword' | 'target_path'>): string | undefined {
  const explicit = INDUSTRY_CONTEXT.find(i => topic.target_path === `/software/branche/${i.slug}`);
  if (explicit) return explicit.slug;
  const key = `-${slugify(topic.keyword)}-`;
  const matches = INDUSTRY_CONTEXT.flatMap(i => [...i.terms, i.slug].map(term => ({ slug: i.slug, term: slugify(term) })))
    .filter(m => key.includes(`-${m.term}-`)).sort((a, b) => b.term.length - a.term.length);
  return matches[0]?.slug;
}

/** Reserve the last existing daily slot for least-covered trades; do not add AI calls. */
export function selectTopic(topics: TopicCandidate[], written: TopicCandidate[], coverage: boolean): TopicCandidate | undefined {
  const counts = new Map<string, number>();
  for (const t of written) {
    const slug = topicIndustry(t);
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const eligible = coverage ? topics.filter(t => topicIndustry(t)) : topics;
  return [...(eligible.length ? eligible : topics)].sort((a, b) => {
    const aSlug = topicIndustry(a); const bSlug = topicIndustry(b);
    const diff = coverage ? (counts.get(aSlug ?? '') ?? 0) - (counts.get(bSlug ?? '') ?? 0) : 0;
    return diff || Number(b.score) - Number(a.score) || a.id.localeCompare(b.id);
  })[0];
}