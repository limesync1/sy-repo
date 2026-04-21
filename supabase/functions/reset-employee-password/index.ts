import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

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
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const employeeId = String(body.employee_id || '').trim()
  if (!employeeId) {
    return new Response(JSON.stringify({ error: 'employee_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // Lookup employee + business
  const { data: emp, error: empErr } = await admin
    .from('employees')
    .select('id, name, email, business_id, user_id, businesses:business_id(name, owner_id, logo_url)')
    .eq('id', employeeId)
    .maybeSingle()
  if (empErr || !emp) {
    return new Response(JSON.stringify({ error: 'Employee not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const biz: any = emp.businesses
  if (!biz || biz.owner_id !== user.id) {
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const origin = req.headers.get('origin') || 'https://serviceydere.dk'
  const redirectTo = `${origin}/log-ind`

  // Generate a recovery link via Supabase admin API
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: emp.email,
    options: { redirectTo },
  })
  if (linkErr) {
    return new Response(JSON.stringify({ error: linkErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const actionLink = (linkData as any)?.properties?.action_link
    || (linkData as any)?.action_link
  if (!actionLink) {
    return new Response(JSON.stringify({ error: 'Could not generate recovery link' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Send transactional email with the reset link
  const emailResp = await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'employee-password-reset',
      recipientEmail: emp.email,
      idempotencyKey: `employee-pwreset-${emp.id}-${Date.now()}`,
      templateData: {
        employeeName: emp.name,
        businessName: biz?.name || 'Serviceydere',
        businessLogoUrl: biz?.logo_url || null,
        resetUrl: actionLink,
      },
    },
  })

  return new Response(
    JSON.stringify({ ok: true, emailSent: !emailResp.error }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})