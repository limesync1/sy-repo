import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Ikke logget ind' }, 401)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Ugyldig forespørgsel' }, 400) }
  const employeeId = String(body.employee_id || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  if (!employeeId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return json({ error: 'Ugyldig e-mailadresse' }, 400)
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: emp } = await admin
    .from('employees')
    .select('id, email, user_id, business_id, businesses:business_id(owner_id)')
    .eq('id', employeeId)
    .maybeSingle()
  if (!emp) return json({ error: 'Medarbejder ikke fundet' }, 404)
  const ownerId = (emp as any).businesses?.owner_id
  if (ownerId !== user.id) {
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) return json({ error: 'Ingen adgang' }, 403)
  }
  if ((emp.email || '').toLowerCase() === email) return json({ ok: true, loginUpdated: false })

  const { data: dupe } = await admin.from('employees').select('id')
    .eq('business_id', emp.business_id).eq('email', email).neq('id', emp.id).maybeSingle()
  if (dupe) return json({ error: 'En anden medarbejder bruger allerede denne e-mail' }, 409)

  let loginUpdated = false
  // Skift login-mailen – men aldrig for virksomhedsejerens egen konto
  if (emp.user_id && emp.user_id !== ownerId) {
    const { error } = await admin.auth.admin.updateUserById(emp.user_id, { email, email_confirm: true })
    if (error) {
      const m = (error.message || '').toLowerCase()
      if (m.includes('already') || m.includes('exists') || m.includes('registered')) {
        return json({ error: 'E-mailen bruges allerede af en anden konto' }, 409)
      }
      return json({ error: 'Kunne ikke opdatere login-e-mail' }, 500)
    }
    loginUpdated = true
  }

  const { error: upErr } = await admin.from('employees').update({ email }).eq('id', emp.id)
  if (upErr) return json({ error: 'Kunne ikke gemme e-mail' }, 500)
  return json({ ok: true, loginUpdated })
})
