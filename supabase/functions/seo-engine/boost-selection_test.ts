import { assertEquals } from 'jsr:@std/assert@1';
import { selectBoost } from './boost-selection.ts';
const now = Date.parse('2026-11-04T00:00:00Z');
const daysAgo = (d: number) => new Date(now - d * 864e5).toISOString();
const arts = [
  { slug: 'a', updated_at: daysAgo(60) },
  { slug: 'b', updated_at: daysAgo(60) },
  { slug: 'fresh', updated_at: daysAgo(5) },
  { slug: 'old', updated_at: daysAgo(200) },
];
Deno.test('position 8-20 with 30+ impressions is boosted first', () =>
  assertEquals(selectBoost(arts, [{ slug: 'a', position: 12, impressions: 80 }], now, 1), [{ slug: 'a', reason: 'side2' }]));
Deno.test('position 7 is not boosted', () =>
  assertEquals(selectBoost(arts.slice(0, 2), [{ slug: 'a', position: 7, impressions: 500 }], now), []));
Deno.test('position 21 is not boosted', () =>
  assertEquals(selectBoost(arts.slice(0, 2), [{ slug: 'a', position: 21, impressions: 500 }], now), []));
Deno.test('fewer than 30 impressions is not boosted', () =>
  assertEquals(selectBoost(arts.slice(0, 2), [{ slug: 'a', position: 10, impressions: 29 }], now), []));
Deno.test('articles updated within 30 days are skipped', () =>
  assertEquals(selectBoost(arts, [{ slug: 'fresh', position: 10, impressions: 900 }], now).map((x) => x.slug), ['old']));
Deno.test('articles older than 180 days are refreshed', () =>
  assertEquals(selectBoost(arts, [], now), [{ slug: 'old', reason: 'gammel' }]));
