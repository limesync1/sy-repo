import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import seed from './seed.json' with { type: 'json' };
import { generateImage, GatewayError, PaymentRequiredError, PermissionDeniedError, RateLimitError } from 'npm:@lovable.dev/ai-gateway@0.1.11';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const BUCKET = 'article-images';
const BATCH = 1;
const FN_BASE = `${Deno.env.get('SUPABASE_URL')}/functions/v1/article-images`;

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Filnavn med søgeord: /blog/taepperens → blog-taepperens.webp */
export const fileFor = (path: string) => `${path.replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.webp`;

function prompt(title: string, topic: string | null) {
  return [
    `Editorial documentary photograph illustrating the Danish article "${title}"${topic ? ` (topic: ${topic})` : ''}.`,
    'Show a realistic, specific scene of the service or situation the article is about, in a Scandinavian/Danish setting (Danish homes, gardens, streets, offices).',
    'Natural daylight, professional and trustworthy mood, calm clean composition with the subject clearly visible, shallow depth of field, Nordic muted palette with a subtle hint of cyan blue.',
    'No text, no letters, no logos, no watermarks, no brand names. Faces not the focus; people shown from behind or at work.',
  ].join(' ');
}

async function serve(url: URL) {
  const name = (url.searchParams.get('f') ?? '').replace(/[^a-z0-9.-]/g, '');
  if (!name.endsWith('.webp')) return new Response('Not found', { status: 404, headers: corsHeaders });
  const { data, error } = await sb.storage.from(BUCKET).download(name);
  if (error || !data) return new Response('Not found', { status: 404, headers: corsHeaders });
  return new Response(data, { headers: { ...corsHeaders, 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}

async function tick() {
  const { data: job } = await sb.from('article_image_job').select('*').eq('id', 1).single();
  if (job?.paused_reason) return { paused: job.paused_reason };
  // Single-flight lease
  const now = new Date();
  const { data: lease } = await sb.from('article_image_job')
    .update({ lease_until: new Date(now.getTime() + 140_000).toISOString() })
    .eq('id', 1).or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`).select('id');
  if (!lease?.length) return { skipped: 'locked' };

  const done: string[] = [];
  try {
    const { data: rows } = await sb.from('article_images').select('path,title,topic,attempts')
      .eq('status', 'pending').lt('attempts', 3).order('created_at').limit(BATCH);
    for (const row of rows ?? []) {
      await sb.from('article_images').update({ attempts: row.attempts + 1, updated_at: new Date().toISOString() }).eq('path', row.path);
      try {
        const res = await generateImage({
          model: 'openai/gpt-image-2.5-sunburst',
          prompt: prompt(row.title, row.topic),
          size: '1536x1024',
          quality: 'medium',
          output_format: 'webp',
          output_compression: 80,
          n: 1,
        } as never);
        const b64 = (res as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json;
        if (!b64) throw new Error('Intet billede returneret');
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const file = fileFor(row.path);
        const up = await sb.storage.from(BUCKET).upload(file, bytes, { contentType: 'image/webp', upsert: true });
        if (up.error) throw up.error;
        await sb.from('article_images').update({
          status: 'done', image_url: `${FN_BASE}?f=${file}`, alt: `Illustration til artiklen: ${row.title}`, last_error: null, updated_at: new Date().toISOString(),
        }).eq('path', row.path);
        done.push(row.path);
      } catch (e) {
        if (e instanceof PaymentRequiredError || e instanceof PermissionDeniedError) {
          await sb.from('article_image_job').update({ paused_reason: e.constructor.name }).eq('id', 1);
          await sb.from('article_images').update({ last_error: String(e) }).eq('path', row.path);
          break;
        }
        if (e instanceof RateLimitError) break;
        await sb.from('article_images').update({ last_error: e instanceof GatewayError ? `${e.code}: ${e.message}` : String(e) }).eq('path', row.path);
      }
    }
  } finally {
    await sb.from('article_image_job').update({ lease_until: null }).eq('id', 1);
  }
  const { count } = await sb.from('article_images').select('path', { count: 'exact', head: true }).eq('status', 'pending').lt('attempts', 3);
  return { done, remaining: count };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  if (req.method === 'GET') return serve(url);
  const body = await req.json().catch(() => ({}));
  if (body?.action === 'seed') {
    // Fixed bundled list of static articles/guides + published SEO articles; inserts are idempotent.
    const rows: { path: string; title: string; topic: string | null }[] = [...seed];
    const { data: dyn } = await sb.from('seo_articles').select('slug,title,category').eq('status', 'published');
    for (const a of dyn ?? []) rows.push({ path: `/blog/${a.slug}`, title: a.title, topic: a.category });
    const { error } = await sb.from('article_images').upsert(rows, { onConflict: 'path', ignoreDuplicates: true });
    return json({ seeded: rows.length, error: error?.message });
  }
  // Tick is bounded (BATCH), single-flight and only processes queued rows, like seo-engine's tick.
  try { return json(await tick()); } catch (e) { return json({ error: String(e) }, 500); }
});
