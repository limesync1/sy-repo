// beta-launch-announce — sender én "vi er åbnet"-mail til hver person, der
// selv har skrevet sig op på ventelisten mens platformen var i testfase.
// Hver modtager får præcis én mail (notified_at sættes med det samme, og
// idempotency-nøglen er bundet til rækkens id), og kun platform-admins må
// udløse den.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { EmailAPIError } from 'npm:@lovable.dev/email-js@0.1.0'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server configuration error' }, 500)

  const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!bearer) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(supabaseUrl, serviceKey)

  // Kun platform-admins
  const { data: claims } = await admin.auth.getClaims(bearer)
  const userId = claims?.claims?.sub
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' })
  if (!isAdmin) return json({ error: 'Forbidden' }, 403)

  let dryRun = false
  try {
    const body = await req.json()
    dryRun = body?.dryRun === true
  } catch {
    /* tomt body er fint */
  }

  const { data: pending, error: listError } = await admin
    .from('beta_signups')
    .select('id, email, role_interest')
    .is('notified_at', null)
    .order('created_at', { ascending: true })
    .limit(2000)

  if (listError) return json({ error: listError.message }, 500)

  const recipients = pending ?? []
  if (dryRun) return json({ pending: recipients.length, sent: 0, failed: 0, dryRun: true })

  let sent = 0
  const failed: string[] = []

  for (const row of recipients) {
    try {
      const result = await sendTemplateEmail('beta-launch', row.email, {
        idempotencyKey: `beta-launch-${row.id}`,
        templateData: { audience: row.role_interest },
      })
      if (!result.sent) {
        failed.push(row.email)
        continue
      }
      await admin.from('beta_signups').update({ notified_at: new Date().toISOString() }).eq('id', row.id)
      sent++
    } catch (error) {
      failed.push(row.email)
      if (error instanceof EmailAPIError && error.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, (error.retryAfterSeconds ?? 60) * 1000))
      }
    }
    // Lille pause så vi ikke rammer udbyderens rate limit.
    await new Promise((r) => setTimeout(r, 120))
  }

  return json({ pending: recipients.length, sent, failed: failed.length })
})
