import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const auth = req.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user } } = await client.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)
    const { action, businessId } = await req.json()
    const { data: business } = await admin.from('businesses').select('id,name,owner_id,email').eq('id', businessId).single()
    if (!business) return json({ error: 'not_found' }, 404)
    if (action === 'deletion-code') {
      if (business.owner_id !== user.id) return json({ error: 'forbidden' }, 403)
      const { data: code, error } = await client.rpc('request_business_deletion_code', { p_business_id: businessId })
      if (error || !code || !user.email) throw error || new Error('Email mangler')
      const result = await sendTemplateEmail('business-deletion-code', user.email, { idempotencyKey: `biz-del-${businessId}-${code}`, templateData: { businessName: business.name, code, expiresInMinutes: 15 } })
      return json({ ...result, sentTo: user.email })
    }
    if (action === 'impersonation-code') {
      const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      if (!role || !user.email) return json({ error: 'forbidden' }, 403)
      const { data: code, error } = await client.rpc('admin_create_impersonation_code', { p_business_id: businessId })
      if (error || !code) throw error || new Error('Kunne ikke oprette kode')
      const adminName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
      const result = await sendTemplateEmail('admin-impersonation-code', user.email, { idempotencyKey: `admin-impersonation-${businessId}-${code}`, templateData: { businessName: business.name, code, expiresInMinutes: 15, adminName } })
      return json({ ...result, sentTo: user.email })
    }
    return json({ error: 'invalid_action' }, 400)
  } catch (error) { console.error(error); return json({ error: error instanceof Error ? error.message : 'send_failed' }, 500) }
})