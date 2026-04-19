import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a friendly random password (12 chars, letters + digits)
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify caller is authenticated (business owner)
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const businessId = String(body.business_id || '').trim()
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const phone = body.phone ? String(body.phone).trim() : null
  const title = body.title ? String(body.title).trim() : null

  if (!businessId || !name || !email) {
    return new Response(JSON.stringify({ error: 'business_id, name and email are required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // Verify caller owns the business
  const { data: biz, error: bizErr } = await admin
    .from('businesses')
    .select('id, name, owner_id, logo_url, slug, address, city, zip_code')
    .eq('id', businessId)
    .maybeSingle()
  if (bizErr || !biz) {
    return new Response(JSON.stringify({ error: 'Business not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (biz.owner_id !== user.id) {
    // also allow platform admins
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // Check for existing employee with this email at this business
  const { data: existingEmp } = await admin
    .from('employees')
    .select('id')
    .eq('business_id', businessId)
    .eq('email', email)
    .maybeSingle()
  if (existingEmp) {
    return new Response(JSON.stringify({ error: 'Denne medarbejder findes allerede' }), {
      status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Create or find auth user
  const password = generatePassword()
  let authUserId: string | null = null
  let accountAlreadyExisted = false

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (createErr) {
    // Email might already exist — look it up
    const msg = (createErr.message || '').toLowerCase()
    if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
      accountAlreadyExisted = true
      // Find by listing users (fallback) — use admin.listUsers with email filter
      const { data: list } = await admin.auth.admin.listUsers()
      const found = list?.users?.find((u) => u.email?.toLowerCase() === email)
      if (found) authUserId = found.id
    } else {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } else {
    authUserId = created.user?.id ?? null
  }

  if (!authUserId) {
    return new Response(JSON.stringify({ error: 'Could not create or find user account' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Insert employee row, linked to user_id
  const { data: employee, error: empErr } = await admin
    .from('employees')
    .insert({
      business_id: businessId,
      user_id: authUserId,
      name,
      email,
      phone,
      title,
    })
    .select()
    .single()
  if (empErr) {
    return new Response(JSON.stringify({ error: empErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Ensure 'employee' role
  await admin.from('user_roles').insert({ user_id: authUserId, role: 'employee' as any })
    .then(() => {}, () => {}) // ignore conflicts

  // Send welcome / credentials email
  const origin = req.headers.get('origin') || 'https://serviceydere.dk'
  const loginUrl = `${origin}/log-ind`

  const emailResp = await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'employee-welcome',
      recipientEmail: email,
      idempotencyKey: `employee-welcome-${employee.id}`,
      templateData: {
        employeeName: name,
        businessName: biz.name,
        businessLogoUrl: biz.logo_url || null,
        email,
        password: accountAlreadyExisted ? null : password,
        accountAlreadyExisted,
        loginUrl,
      },
    },
  })

  return new Response(
    JSON.stringify({
      ok: true,
      employee,
      emailSent: !emailResp.error,
      accountAlreadyExisted,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
