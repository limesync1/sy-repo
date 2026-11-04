import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';

// Fixed recipient and template; the month-based idempotency key means repeated calls send at most once per month.
const RECIPIENT = 'william@adely.dk';
const SITE = 'https://serviceydere.dk/';
const GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console';
const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const reply = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const iso = (d: Date) => d.toISOString().slice(0, 10);
const nf = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 1 });

function pct(cur: number, prev: number) {
  if (!prev) return { change: cur ? 'ny' : '—', up: cur ? true : null };
  const p = ((cur - prev) / prev) * 100;
  return { change: `${p >= 0 ? '+' : ''}${nf.format(p)} %`, up: Math.abs(p) < 1 ? null : p > 0 };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const lk = Deno.env.get('LOVABLE_API_KEY'); const ck = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');
    if (!lk || !ck) return reply({ error: 'Search Console er ikke forbundet.' }, 503);
    const headers = { Authorization: `Bearer ${lk}`, 'X-Connection-Api-Key': ck, 'Content-Type': 'application/json' };

    const sitesRes = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
    if (!sitesRes.ok) return reply({ error: 'sites', status: sitesRes.status, details: await sitesRes.text() }, 502);
    const { siteEntry = [] } = await sitesRes.json();
    const target = new URL(SITE);
    const matches = (siteEntry as { siteUrl: string; permissionLevel?: string }[]).filter((e) => e.permissionLevel !== 'siteUnverifiedUser' && (e.siteUrl.startsWith('sc-domain:') ? target.hostname.endsWith(e.siteUrl.slice(10)) : target.href.startsWith(e.siteUrl)));
    const exact = matches.find((e) => e.siteUrl === SITE) ?? matches[0];
    if (!exact) return reply({ error: 'Ingen verificeret ejendom dækker serviceydere.dk' }, 404);
    const siteUrl = exact.siteUrl;

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    const pStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
    const pEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 0));
    const q = async (body: Record<string, unknown>) => {
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`[${r.status}] ${await r.text()}`);
      return (await r.json()).rows ?? [];
    };
    const [cur] = await q({ startDate: iso(start), endDate: iso(end) });
    const [prev] = await q({ startDate: iso(pStart), endDate: iso(pEnd) });
    const queries = await q({ startDate: iso(start), endDate: iso(end), dimensions: ['query'], rowLimit: 8 });
    const pages = await q({ startDate: iso(start), endDate: iso(end), dimensions: ['page'], rowLimit: 8 });
    const c = cur ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const p = prev ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const pos = p.position && c.position ? { change: `${c.position <= p.position ? '↑' : '↓'} ${nf.format(Math.abs(p.position - c.position))}`, up: Math.abs(p.position - c.position) < 0.1 ? null : c.position < p.position } : { change: '—', up: null };
    const clickTrend = pct(c.clicks, p.clicks);
    const period = `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
    const summary = clickTrend.up === true ? `Det går fremad: ${nf.format(c.clicks)} klik fra Google i ${period}, mod ${nf.format(p.clicks)} måneden før.`
      : clickTrend.up === false ? `Klikkene faldt til ${nf.format(c.clicks)} i ${period} fra ${nf.format(p.clicks)} måneden før. Se hvilke sider der har mistet klik i Search Console.`
      : `Klikkene lå stabilt på ${nf.format(c.clicks)} i ${period}.`;

    let notes: string[] = [];
    try {
      // Searches just below page 1 (position 8–20) with real demand are the cheapest wins.
      const near = (await q({ startDate: iso(start), endDate: iso(end), dimensions: ['query'], rowLimit: 250 }))
        .filter((r: any) => r.position >= 8 && r.position <= 20 && r.impressions >= 20)
        .sort((a: any, b: any) => b.impressions - a.impressions).slice(0, 5);
      if (near.length) notes.push(`Tæt på side 1: ${near.map((r: any) => `«${r.keys[0]}» (plads ${nf.format(r.position)}, ${nf.format(r.impressions)} visninger)`).join(', ')}.`);
      // Pages that gained or lost the most clicks versus the previous month.
      const pg = async (s: Date, e: Date) => new Map((await q({ startDate: iso(s), endDate: iso(e), dimensions: ['page'], rowLimit: 250 })).map((r: any) => [r.keys[0].replace('https://serviceydere.dk', '') || '/', r.clicks as number]));
      const [nowP, prevP] = await Promise.all([pg(start, end), pg(pStart, pEnd)]);
      const diffs = [...new Set([...nowP.keys(), ...prevP.keys()])].map((k) => ({ k, d: (nowP.get(k) ?? 0) - (prevP.get(k) ?? 0) }));
      const up = diffs.filter((x) => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 3);
      const down = diffs.filter((x) => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 3);
      if (up.length) notes.push(`Flest nye klik: ${up.map((x) => `${x.k} (+${x.d})`).join(', ')}.`);
      if (down.length) notes.push(`Mistede flest klik: ${down.map((x) => `${x.k} (${x.d})`).join(', ')}.`);
    } catch (e) { console.warn('[seo-monthly-report] movers', e); }
    const sm = await fetch(`${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`, { headers });
    if (sm.ok) {
      const list = (await sm.json()).sitemap ?? [];
      const errs = list.reduce((n: number, s: any) => n + Number(s.errors || 0), 0);
      notes.push(`Sitemaps i Google: ${list.length}${errs ? `, med ${errs} fejl der bør tjekkes` : ', uden fejl'}.`);
    }

    try {
      const { createClient } = await import('npm:@supabase/supabase-js@2');
      const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: arts } = await db.from('seo_articles').select('status, published_at, index_status, needs_improvement').eq('status', 'published');
      const all = arts ?? [];
      const month = all.filter((a: any) => a.published_at >= start.toISOString() && a.published_at <= new Date(end.getTime() + 864e5).toISOString()).length;
      const indexed = all.filter((a: any) => /indexed/i.test(a.index_status ?? '') && !/not/i.test(a.index_status ?? '')).length;
      notes.push(`SEO-motoren udgav ${month} nye artikler i ${period}; ${indexed} af ${all.length} automatiske artikler er bekræftet indekseret.`);
      const weak = all.filter((a: any) => a.needs_improvement).length;
      if (weak) notes.push(`${weak} artikler er ikke indekseret efter 3 uger og er markeret til forbedring i adminpanelet.`);
    } catch (e) { console.warn('[seo-monthly-report] article stats', e); }

    const result = await sendTemplateEmail('seo-monthly-report', RECIPIENT, {
      idempotencyKey: `seo-monthly-report-${iso(start).slice(0, 7)}`,
      templateData: {
        period, summary, notes,
        metrics: [
          { label: 'Klik fra Google', value: nf.format(c.clicks), ...clickTrend },
          { label: 'Visninger i Google', value: nf.format(c.impressions), ...pct(c.impressions, p.impressions) },
          { label: 'Klikrate', value: `${nf.format(c.ctr * 100)} %`, ...pct(c.ctr, p.ctr) },
          { label: 'Gennemsnitlig placering', value: nf.format(c.position), ...pos },
        ],
        queries: queries.map((r: any) => ({ name: r.keys[0], value: `${nf.format(r.clicks)} klik, ${nf.format(r.impressions)} visninger` })),
        pages: pages.map((r: any) => ({ name: r.keys[0].replace('https://serviceydere.dk', '') || '/', value: `${nf.format(r.clicks)} klik` })),
      },
    });
    return reply({ ok: true, sent: result.sent, period });
  } catch (e) {
    console.error('[seo-monthly-report]', e instanceof Error ? e.message : e);
    return reply({ error: 'Rapporten kunne ikke laves', details: e instanceof Error ? e.message : String(e) }, 500);
  }
});
