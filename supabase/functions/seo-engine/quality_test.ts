import { assertEquals, assert } from 'jsr:@std/assert@1';
import { validateArticle, slugify } from './quality.ts';

const words = (n: number) => Array.from({ length: n }, () => 'ord').join(' ');
const base = {
  slug: 'ruteplan-for-vinduespudser', title: 'Ruteplan for vinduespudser', description: 'x'.repeat(130), category: 'Ruteplanlægning', keywords: 'a',
  sections: Array.from({ length: 6 }, () => ({ heading: 'H', paragraphs: [words(150)] })),
  faq: [{ q: 'a', a: 'b' }, { q: 'a', a: 'b' }, { q: 'a', a: 'b' }], links: [{ label: 'Tilbud', href: '/tilbud' }],
};

Deno.test('valid article passes', () => assertEquals(validateArticle(base, []), []));
Deno.test('duplicate slug fails', () => assert(validateArticle(base, ['ruteplan-for-vinduespudser']).includes('slug findes allerede')));
Deno.test('exact price fails, range passes', () => {
  const exact = { ...base, sections: [...base.sections, { paragraphs: ['Det koster 450 kr om måneden'] }] };
  assert(validateArticle(exact, []).includes('præcis pris fundet'));
  const range = { ...base, sections: [...base.sections, { paragraphs: ['Typisk 300–500 kr om måneden'] }] };
  assertEquals(validateArticle(range, []), []);
});
Deno.test('unknown internal link fails', () => assert(validateArticle({ ...base, links: [{ label: 'x', href: '/blog/findes-ikke' }] }, []).length === 1));
Deno.test('slugify handles danish letters', () => assertEquals(slugify('Ruteplanlægning på Fyn'), 'ruteplanlaegning-paa-fyn'));
Deno.test('required subtrade parent link cannot be replaced by unrelated trade', () => {
  assert(validateArticle(base, [], 'solcellerens').includes('relevant branchelink mangler'));
  assertEquals(validateArticle({ ...base, links: [{ label: 'Solcellerens', href: '/software/branche/solcellerens' }] }, [], 'solcellerens'), []);
});
