import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { buildPlatformSignupAlert } from '../_shared/platform-signup-alert.ts';
const schema = z.object({ email: z.string().trim().email().max(254).transform(s => s.toLowerCase()), role: z.enum(['kunde', 'virksomhed']) }).strict();
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const requests = new Map<string, { count: number; expires: number }>();
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Metoden er ikke tilladt.' }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 2048) return reply({ error: 'Tilmeldingen er for stor.' }, 400);
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return reply({ error: 'Udfyld en gyldig e-mail og vælg kunde eller virksomhed.' }, 400);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const now = Date.now();
    for (const [key, value] of requests) if (value.expires <= now) requests.delete(key);
    const limit = requests.get(ip) || { count: 0, expires: now + 60000 };
    if (limit.count >= 10 || requests.size >= 2000) return reply({ error: 'Vent et minut og prøv igen.' }, 429);
    limit.count++; requests.set(ip, limit);
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ error: 'Tilmelding er ikke klar.' }, 503);
    const admin = createClient(url, key);
    // Ignore conflicting rows atomically: repeated submissions cannot create a new send event.
    const { data, error } = await admin.from('beta_signups').upsert({ email: parsed.data.email, role_interest: parsed.data.role, source: 'site-notice' }, { onConflict: 'email', ignoreDuplicates: true }).select('id,email,role_interest,created_at');
    if (error) throw error;
    const signup = data?.[0];
    if (signup) {
      const alert = buildPlatformSignupAlert({ kind: 'waitlist', id: signup.id, email: signup.email, role: signup.role_interest, createdAt: signup.created_at });
      try { await sendTemplateEmail('platform-signup', alert.recipient, { idempotencyKey: alert.idempotencyKey, templateData: alert.templateData }); }
      catch { console.error('[join-waitlist] owner notification failed after signup saved'); }
    }
    return reply({ ok: true });
  } catch { return reply({ error: 'Vi kunne ikke gemme tilmeldingen. Prøv igen om lidt.' }, 400); }
});