// Quality gate for AI-written articles: nothing is stored unless every rule passes.
export const INTERNAL_LINKS = ['/', '/tilbud', '/virksomheder', '/blog', '/priser/rengoering', '/priser/vinduespudser', '/priser/haveservice', '/priser/haandvaerker', '/by'];

export interface ArticleDraft {
  slug: string; title: string; description: string; category: string; keywords: string;
  sections: { heading?: string; paragraphs?: string[]; list?: string[]; table?: { headers: string[]; rows: string[][] } }[];
  links?: { label: string; href: string }[];
  faq: { q: string; a: string }[];
}

export const slugify = (s: string) => s.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
  .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

const PRICE = /\b\d{2,6}\s?(kr\.?|kroner)(?!\s*[–-])/i;

export function validateArticle(a: ArticleDraft, existing: string[]): string[] {
  const p: string[] = [];
  if (!a.slug || a.slug.length < 6) p.push('slug mangler');
  if (existing.includes(a.slug)) p.push('slug findes allerede');
  if (!a.title || a.title.length > 70) p.push('titel mangler eller er for lang');
  if (!a.description || a.description.length < 90 || a.description.length > 175) p.push('beskrivelse har forkert længde');
  if (!Array.isArray(a.sections) || a.sections.length < 5) p.push('for få sektioner');
  const text = JSON.stringify(a.sections ?? []);
  const words = text.split(/\s+/).length;
  if (words < 700) p.push(`for kort (${words} ord)`);
  if (!Array.isArray(a.faq) || a.faq.length < 3) p.push('for få FAQ');
  for (const l of a.links ?? []) {
    const ok = INTERNAL_LINKS.includes(l.href) || (/^\/blog\/[a-z0-9-]+$/.test(l.href) && existing.includes(l.href.slice(6)));
    if (!ok) p.push(`ugyldigt link ${l.href}`);
  }
  // Only price ranges are allowed; a lone exact amount without a following range fails.
  for (const m of text.matchAll(new RegExp(PRICE, 'gi'))) {
    const around = text.slice(Math.max(0, (m.index ?? 0) - 12), (m.index ?? 0) + m[0].length);
    if (!/[–-]/.test(around)) { p.push('præcis pris fundet'); break; }
  }
  return p;
}
