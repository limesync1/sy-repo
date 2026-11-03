import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateChatCompletion, GatewayError, PaymentRequiredError, PermissionDeniedError, RateLimitError } from 'npm:@lovable.dev/ai-gateway@0.1.11';
import { validateArticle, slugify, INTERNAL_LINKS, INDUSTRY_SLUGS, type ArticleDraft } from './quality.ts';

// Automatic SEO engine. One daily cron "tick" decides the work for the day; admins can trigger single steps.
// Every step is bounded, guarded by a unique run key (single-flight + idempotent) and stops on credit/policy errors.
const SITE = 'https://serviceydere.dk/';
const GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console';
const SITEMAPS = ['https://serviceydere.dk/sitemap-index.xml', 'https://gkectsellkpltrxvusot.supabase.co/functions/v1/sitemap'];
const SEEDS = ['ruteplanlægning servicefirma', 'program til rengøringsfirma', 'software til vinduespudser', 'planlægningsværktøj håndværker', 'fakturering servicevirksomhed', 'medarbejder app timeregistrering', 'kørselsliste program', 'faste kunder abonnement service', 'app til havemand', 'e-conomic integration servicefirma'];
const WRITE_DAYS = [2, 4, 6, 1, 3, 5, 0];

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const reply = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function gsc() {
  const lk = Deno.env.get('LOVABLE_API_KEY'); const ck = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');
  if (!lk || !ck) throw new Error('Search Console er ikke forbundet');
  const headers = { Authorization: `Bearer ${lk}`, 'X-Connection-Api-Key': ck, 'Content-Type': 'application/json' };
  const r = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
  if (!r.ok) throw new Error(`Search Console [${r.status}]: ${await r.text()}`);
  const { siteEntry = [] } = await r.json();
  const t = new URL(SITE);
  const m = (siteEntry as { siteUrl: string; permissionLevel?: string }[]).filter((e) => e.permissionLevel !== 'siteUnverifiedUser' && (e.siteUrl.startsWith('sc-domain:') ? t.hostname.endsWith(e.siteUrl.slice(10)) : t.href.startsWith(e.siteUrl)));
  const site = (m.find((e) => e.siteUrl === SITE) ?? m[0])?.siteUrl;
  if (!site) throw new Error('Ingen verificeret Search Console-ejendom dækker serviceydere.dk');
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${GATEWAY}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 403) throw new Error('Search Console nægtede adgang (403)');
    if (!res.ok) throw new Error(`Search Console [${res.status}]: ${await res.text()}`);
    const txt = await res.text(); return txt ? JSON.parse(txt) : {};
  };
  return { site, call, query: async (body: unknown) => (await call('POST', `/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, body)).rows ?? [] };
}

async function existingSlugs(): Promise<string[]> {
  const out: string[] = [];
  try { const xml = await (await fetch('https://serviceydere.dk/sitemap-blog.xml')).text(); for (const m of xml.matchAll(/\/blog\/([a-z0-9-]+)</g)) out.push(m[1]); } catch { /* sitemap optional */ }
  const { data } = await db.from('seo_articles').select('slug');
  return [...out, ...(data ?? []).map((a) => a.slug)];
}

async function ai(prompt: string, system: string) {
  const res = await generateChatCompletion({ model: 'openai/gpt-6-astra', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], response_format: { type: 'json_object' } });
  const content = (res as any).choices?.[0]?.message?.content;
  if (!content) throw new Error('AI returnerede intet indhold');
  return JSON.parse(content);
}

async function discover() {
  const g = await gsc();
  const end = new Date(Date.now() - 3 * 864e5); const start = new Date(end.getTime() - 28 * 864e5);
  const rows = await g.query({ startDate: iso(start), endDate: iso(end), dimensions: ['query'], rowLimit: 500 });
  const slugs = (await existingSlugs()).join(' ');
  const cands = rows.filter((r: any) => r.position >= 6 && r.position <= 40 && r.impressions >= 15 && r.keys[0].length > 8)
    .map((r: any) => ({ keyword: r.keys[0].toLowerCase(), source: 'gsc', impressions: Math.round(r.impressions), clicks: Math.round(r.clicks), position: r.position, score: r.impressions / r.position }))
    .filter((c: any) => !slugs.includes(slugify(c.keyword)));
  const sem = Deno.env.get('SEMRUSH_API_KEY');
  if (sem && Deno.env.get('LOVABLE_API_KEY')) {
    for (const seed of SEEDS.slice(0, 3)) {
      const r = await fetch(`https://connector-gateway.lovable.dev/semrush/keywords/phrase_related?phrase=${encodeURIComponent(seed)}&database=dk&export_columns=Ph,Nq,Kd&display_limit=10`, { headers: { Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`, 'X-Connection-Api-Key': sem } });
      if (!r.ok) break;
      const j = await r.json();
      for (const row of j?.data?.rows ?? []) cands.push({ keyword: String(row[0]).toLowerCase(), source: 'semrush', impressions: Number(row[1]) || 0, clicks: 0, position: null, score: (Number(row[1]) || 0) / Math.max(10, Number(row[2]) || 50) });
    }
  }
  const { count } = await db.from('seo_topics').select('id', { count: 'exact', head: true }).eq('status', 'queued').eq('kind', 'new');
  if ((count ?? 0) < 5) for (const s of SEEDS) cands.push({ keyword: s, source: 'seed', impressions: 0, clicks: 0, position: null, score: 1 });
  const top = cands.sort((a: any, b: any) => b.score - a.score).slice(0, 20);
  if (top.length) await db.from('seo_topics').upsert(top, { onConflict: 'kind,keyword', ignoreDuplicates: true });
  return { found: top.length };
}

const SYSTEM = `Du er senior SEO-skribent for Serviceydere.dk – dansk software til servicevirksomheder (ruteplanlægning, medarbejder-app med manuel tidsregistrering, faste aftaler med intervaller, samlet fakturering med fakturainterval, e-conomic/Dinero-integration, kundeportal, før/efter-billeder, SMS/e-mail-påmindelser) og en markedsplads hvor private får tilbud fra serviceudbydere. 14 dages gratis prøveperiode uden kreditkort.
Regler: Skriv naturligt, konkret og hjælpsomt dansk. Opfind aldrig statistik, kunder, citater eller funktioner. Angiv aldrig præcise priser – kun brede intervaller med forbehold. Ingen keyword stuffing. Svar KUN med JSON.`;

async function write(manualTopicId?: string) {
  let q = db.from('seo_topics').select('*').eq('kind', 'new');
  q = manualTopicId ? q.eq('id', manualTopicId) : q.eq('status', 'queued').order('score', { ascending: false });
  const { data: topic } = await q.limit(1).maybeSingle();
  if (!topic) return { written: 0, reason: 'Ingen emner i køen' };
  await db.from('seo_topics').update({ status: 'writing' }).eq('id', topic.id);
  const slugs = await existingSlugs();
  const prompt = `Skriv en dybdegående artikel målrettet søgningen "${topic.keyword}".
Eksisterende artikler (undgå overlap, link gerne til relevante): ${slugs.slice(0, 120).join(', ')}
Tilladte interne links (brug 3-6 relevante): ${INTERNAL_LINKS.join(', ')} samt /blog/<eksisterende-slug> og branchesider /software/branche/<slug> for: ${INDUSTRY_SLUGS.join(', ')}. Link altid til den mest relevante brancheside.
JSON-format: {"slug":"kort-dansk-slug-uden-æøå","title":"maks 65 tegn, indeholder søgeordet","description":"120-160 tegn","category":"Ruteplanlægning|Rengøring|Haveservice|Økonomi|Vinduespudsning|Håndværker","keywords":"komma, separeret","sections":[{"heading":"H2","paragraphs":["..."],"list":["valgfri"],"table":{"headers":["..."],"rows":[["..."]]}}],"links":[{"label":"ankertekst","href":"/sti"}],"faq":[{"q":"...","a":"..."}]}
Krav: 6-9 sektioner, i alt 900-1500 ord, mindst én tabel eller tjekliste, 4-6 FAQ, sidste sektion forklarer hvordan Serviceydere kan hjælpe og nævner 14 dages gratis prøveperiode uden kreditkort.`;
  const raw = await ai(prompt, SYSTEM);
  const draft: ArticleDraft = { ...raw, slug: slugify(raw.slug || topic.keyword) };
  const problems = validateArticle(draft, slugs);
  if (problems.length) {
    await db.from('seo_topics').update({ status: 'rejected', suggestion: { problems } }).eq('id', topic.id);
    return { written: 0, problems };
  }
  const { data: settings } = await db.from('seo_settings').select('auto_publish').single();
  const publish = !!settings?.auto_publish;
  const sections = [...draft.sections, ...(draft.links?.length ? [{ heading: 'Læs også', links: draft.links }] : [])];
  const words = JSON.stringify(draft.sections).split(/\s+/).length;
  const { error } = await db.from('seo_articles').insert({ topic_id: topic.id, slug: draft.slug, title: draft.title, description: draft.description, category: draft.category, keywords: draft.keywords, sections, faq: draft.faq, reading_minutes: Math.max(3, Math.round(words / 200)), status: publish ? 'published' : 'draft', published_at: publish ? new Date().toISOString() : null });
  if (error) throw new Error(error.message);
  await db.from('seo_topics').update({ status: 'written' }).eq('id', topic.id);
  return { written: 1, slug: draft.slug, published: publish };
}

async function submit() {
  const { data: fresh } = await db.from('seo_articles').select('id').eq('status', 'published').is('submitted_at', null);
  if (!fresh?.length) return { submitted: 0 };
  const g = await gsc(); const results: Record<string, string> = {};
  for (const sm of SITEMAPS) {
    try { await g.call('PUT', `/webmasters/v3/sites/${encodeURIComponent(g.site)}/sitemaps/${encodeURIComponent(sm)}`); results[sm] = 'ok'; } catch (e) { results[sm] = String((e as Error).message).slice(0, 200); }
  }
  if (Object.values(results).includes('ok')) await db.from('seo_articles').update({ submitted_at: new Date().toISOString() }).in('id', fresh.map((a) => a.id));
  return { submitted: fresh.length, results };
}

async function inspect() {
  const g = await gsc();
  const old = new Date(Date.now() - 2 * 864e5).toISOString(); const week = new Date(Date.now() - 6 * 864e5).toISOString();
  const { data } = await db.from('seo_articles').select('id, slug, published_at').eq('status', 'published').lt('published_at', old).or(`index_checked_at.is.null,index_checked_at.lt.${week}`).limit(15);
  let checked = 0;
  for (const a of data ?? []) {
    const r = await g.call('POST', '/v1/urlInspection/index:inspect', { inspectionUrl: `${SITE}blog/${a.slug}`, siteUrl: g.site });
    const state = r?.inspectionResult?.indexStatusResult?.coverageState ?? 'Ukendt';
    const indexed = r?.inspectionResult?.indexStatusResult?.verdict === 'PASS';
    const stale = Date.now() - new Date(a.published_at).getTime() > 21 * 864e5;
    await db.from('seo_articles').update({ index_status: state, index_checked_at: new Date().toISOString(), needs_improvement: !indexed && stale }).eq('id', a.id);
    checked++;
  }
  return { checked };
}

async function refresh() {
  const g = await gsc();
  const end = new Date(Date.now() - 3 * 864e5); const start = new Date(end.getTime() - 28 * 864e5);
  const rows = await g.query({ startDate: iso(start), endDate: iso(end), dimensions: ['page'], rowLimit: 200 });
  const weak = rows.filter((r: any) => r.impressions >= 100 && r.ctr < 0.015 && r.keys[0].includes('/blog/')).slice(0, 5);
  let n = 0;
  for (const r of weak) {
    const path = r.keys[0].replace('https://serviceydere.dk', '');
    const top = await g.query({ startDate: iso(start), endDate: iso(end), dimensions: ['query'], rowLimit: 5, dimensionFilterGroups: [{ filters: [{ dimension: 'page', expression: r.keys[0] }] }] });
    const s = await ai(`Siden ${path} har ${Math.round(r.impressions)} visninger men kun ${(r.ctr * 100).toFixed(1)} % klikrate. Topsøgninger: ${top.map((t: any) => t.keys[0]).join(', ')}. Foreslå en bedre titel (maks 65 tegn) og beskrivelse (120-160 tegn) der matcher søgningerne. JSON: {"title":"","description":""}`, SYSTEM);
    await db.from('seo_topics').upsert({ keyword: path, kind: 'refresh', source: 'gsc', target_path: path, impressions: Math.round(r.impressions), clicks: Math.round(r.clicks), position: r.position, status: 'queued', suggestion: s }, { onConflict: 'kind,keyword' });
    n++;
  }
  return { suggestions: n };
}

const STEPS: Record<string, (arg?: string) => Promise<unknown>> = { discover, write, submit, inspect, refresh };

async function run(kind: string, key: string, arg?: string) {
  const { error } = await db.from('seo_runs').insert({ kind, run_key: key });
  if (error) return { kind, skipped: 'Kører allerede eller er kørt i dag' };
  try {
    const details = await STEPS[kind](arg);
    await db.from('seo_runs').update({ status: 'ok', details, finished_at: new Date().toISOString() }).eq('run_key', key);
    return { kind, ...(details as object) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof PaymentRequiredError || e instanceof PermissionDeniedError) await db.from('seo_settings').update({ paused_reason: `AI: ${msg}` }).eq('id', true);
    if (kind === 'write') await db.from('seo_topics').update({ status: 'queued' }).eq('status', 'writing');
    await db.from('seo_runs').update({ status: e instanceof RateLimitError ? 'rate_limited' : 'error', details: { error: msg, gateway: e instanceof GatewayError ? e.code : undefined }, finished_at: new Date().toISOString() }).eq('run_key', key);
    return { kind, error: msg };
  }
}

async function isAdmin(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return false;
  const { data } = await db.auth.getUser(token);
  if (!data.user) return false;
  const { data: role } = await db.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin').maybeSingle();
  return !!role;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'tick');
    const today = iso(new Date());
    if (action === 'tick') {
      const { data: s } = await db.from('seo_settings').select('*').single();
      if (!s?.enabled) return reply({ skipped: 'SEO-motoren er slået fra' });
      if (s.paused_reason) return reply({ skipped: `Sat på pause: ${s.paused_reason}` });
      const d = new Date(); const out: unknown[] = [];
      if (d.getUTCDay() === 1) out.push(await run('discover', `discover:${today}`));
      // Over 7 per week: the cron ticks several times a day and each slot writes one article (bounded, one AI call per invocation).
      const perDay = Math.min(4, Math.ceil(s.articles_per_week / 7));
      const slot = Math.floor(d.getUTCHours() / 6);
      if (s.articles_per_week > 7 ? slot < perDay : WRITE_DAYS.slice(0, s.articles_per_week).includes(d.getUTCDay()))
        out.push(await run('write', s.articles_per_week > 7 ? `write:${today}:${slot}` : `write:${today}`));
      out.push(await run('submit', `submit:${today}`));
      if (d.getUTCDay() === 0) out.push(await run('inspect', `inspect:${today}`));
      if (d.getUTCDate() === 1) out.push(await run('refresh', `refresh:${today.slice(0, 7)}`));
      return reply({ ok: true, out });
    }
    if (!(action in STEPS)) return reply({ error: 'Ukendt handling' }, 400);
    if (!(await isAdmin(req))) return reply({ error: 'Kun administratorer' }, 403);
    const topicId = typeof body.topicId === 'string' && /^[0-9a-f-]{36}$/.test(body.topicId) ? body.topicId : undefined;
    return reply(await run(action, `${action}:manual:${new Date().toISOString().slice(0, 16)}`, topicId));
  } catch (e) {
    console.error('[seo-engine]', e);
    return reply({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
