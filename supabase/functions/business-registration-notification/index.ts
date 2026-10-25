import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';
import { buildPlatformSignupAlert } from '../_shared/platform-signup-alert.ts';
const schema = z.object({ businessId: z.string().uuid() }).strict();
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Metoden er ikke tilladt.' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply({ error: 'Beskedtjenesten er ikke klar.' }, 503);
    const admin = createClient(url, key);
    const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!token) return reply({ error: 'Log ind først.' }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return reply({ error: 'Log ind først.' }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return reply({ error: 'Ugyldig virksomhed.' }, 400);
    const { data: business, error } = await admin.from('businesses').select('id,owner_id,name,email,city,settings,created_at,deleted_at').eq('id', parsed.data.businessId).maybeSingle();
    if (error) throw error;
    if (!business || business.deleted_at) return reply({ error: 'Virksomheden findes ikke.' }, 404);
    if (business.owner_id !== user.id) {
      const { data: role, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (roleError || !role) return reply({ error: 'Du har ikke adgang.' }, 403);
    }
    const { data: owner } = await admin.auth.admin.getUserById(business.owner_id);
    const alert = buildPlatformSignupAlert({ kind: 'business', id: business.id, name: business.name, email: owner.user?.email || business.email, city: business.city, cvr: business.settings?.cvr, createdAt: business.created_at });
    const result = await sendTemplateEmail('platform-signup', alert.recipient, { idempotencyKey: alert.idempotencyKey, templateData: alert.templateData });
    return reply({ ok: true, sent: result.sent });
  } catch { console.error('[business-registration-notification] notification failed'); return reply({ error: 'Beskeden kunne ikke sendes lige nu.' }, 503); }
});