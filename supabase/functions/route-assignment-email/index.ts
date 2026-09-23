import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const auth = req.headers.get('Authorization') || ''; const url = Deno.env.get('SUPABASE_URL')!
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user } } = await client.auth.getUser(); if (!user) return json({ error: 'unauthorized' }, 401)
    const { routeId, employeeId } = await req.json()
    const { data: route } = await admin.from('routes').select('*, businesses(name,owner_id)').eq('id', routeId).single()
    const { data: employee } = await admin.from('employees').select('name,email,business_id').eq('id', employeeId).single()
    if (!route || !employee || route.business_id !== employee.business_id || route.businesses?.owner_id !== user.id) return json({ error: 'forbidden' }, 403)
    const { data: assignments } = await admin.from('route_stop_assignees').select('stop_id').eq('employee_id', employeeId)
    const ids = (assignments || []).map((x: any) => x.stop_id)
    const { data: stops } = ids.length ? await admin.from('route_stops').select('*').eq('route_id', routeId).in('id', ids).order('sequence') : { data: [] }
    if (!employee.email || !stops?.length) return json({ error: 'missing_recipient_or_stops' }, 400)
    await admin.from('routes').update({ status: 'dispatched' }).eq('id', routeId)
    const result = await sendTemplateEmail('route-assigned', employee.email, { idempotencyKey: `route-dispatch-${routeId}-${employeeId}-${route.updated_at}`, templateData: {
      employeeName: employee.name, businessName: route.businesses?.name,
      routeDate: new Date(route.route_date).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      stopCount: stops.length, totalKm: route.total_distance_km, totalDurationMinutes: route.total_duration_minutes,
      plannedStartTime: route.planned_start_time?.slice(0, 5) || '08:00', firstStopName: stops[0].customer_name,
      firstStopAddress: stops[0].address, appUrl: 'https://serviceydere.dk/medarbejder',
    } })
    return json({ ...result, recipient: employee.email })
  } catch (error) { console.error(error); return json({ error: error instanceof Error ? error.message : 'send_failed' }, 500) }
})