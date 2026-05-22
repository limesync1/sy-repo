import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const email = String(body.email || '').trim().toLowerCase()
  const name = String(body.name || '').trim()
  const phone = body.phone ? String(body.phone).trim() : null
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!emailOk) {
    return new Response(JSON.stringify({ error: 'Ugyldig e-mail' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // Check if user exists
  let existingUserId: string | null = null
  try {
    // Paginate through users to find by email (admin.listUsers max 50/page).
    // For typical use this finds quickly; we cap at 10 pages.
    for (let page = 1; page <= 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      const found = data?.users?.find((u) => u.email?.toLowerCase() === email)
      if (found) { existingUserId = found.id; break }
      if (!data?.users || data.users.length < 200) break
    }
  } catch (_e) { /* ignore */ }

  if (existingUserId) {
    // Returnér samme respons-shape for both cases for at undgå user-enumeration.
    return new Response(JSON.stringify({ ok: true, email }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const password = generatePassword()
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, phone },
  })
  if (createErr || !created.user) {
    return new Response(JSON.stringify({ error: createErr?.message || 'Kunne ikke oprette konto' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Update phone on profile (best-effort)
  if (phone) {
    await admin.from('profiles').update({ phone, display_name: name || null })
      .eq('user_id', created.user.id).then(() => {}, () => {})
  }

  // Send welcome email with credentials (fire-and-forget)
  const origin = req.headers.get('origin') || 'https://serviceydere.dk'
  admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'customer-welcome',
      recipientEmail: email,
      idempotencyKey: `customer-welcome-${created.user.id}`,
      templateData: {
        customerName: name || undefined,
        email,
        password,
        loginUrl: `${origin}/min-konto`,
      },
    },
  }).catch(() => {})

  // Password returneres til CartSheet/guest-checkout for auto-login direkte
  // efter konto-oprettelse. Endpoint er bevidst åbent for anonyme bestillinger,
  // men 'existed'-grenen returnerer samme shape som created-grenen for at
  // mindske user-enumeration.
  return new Response(JSON.stringify({ created: true, userId: created.user.id, password, email }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
