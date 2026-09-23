import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const BodySchema = z.object({ routeId: z.string().uuid(), employeeId: z.string().uuid() })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
    const auth = req.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user } } = await client.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const { routeId, employeeId } = parsed.data
    const [{ data: route }, { data: employee }] = await Promise.all([
      admin.from('routes').select('*, businesses(name,owner_id)').eq('id', routeId).single(),
      admin.from('employees').select('name,email,business_id').eq('id', employeeId).single(),
    ])
    if (!route || !employee || route.business_id !== employee.business_id || (route.businesses?.owner_id !== user.id && !user.app_metadata?.role?.includes('admin'))) {
      return json({ error: 'forbidden' }, 403)
    }
    if (!employee.email) return json({ error: 'employee_has_no_email' }, 400)

    const { data: assignments } = await admin.from('route_stop_assignees').select('stop_id').eq('employee_id', employeeId)
    const assignedIds = (assignments || []).map((item: { stop_id: string }) => item.stop_id)
    const { data: routeEmployees } = await admin.from('route_employees').select('employee_id').eq('route_id', routeId).eq('employee_id', employeeId)
    const query = admin.from('route_stops').select('id,sequence,customer_name,address,service_summary,assigned_employee_id').eq('route_id', routeId).order('sequence')
    const { data: allStops } = await query
    const hasWholeRoute = !!routeEmployees?.length || route.employee_id === employeeId
    const stops = (allStops || []).filter((stop: any) => hasWholeRoute || assignedIds.includes(stop.id) || stop.assigned_employee_id === employeeId)
    if (!stops.length) return json({ error: 'employee_has_no_stops_on_route' }, 400)

    const result = await sendTemplateEmail('route-overview', employee.email, {
      idempotencyKey: `route-overview-${routeId}-${employeeId}-${route.updated_at}`,
      templateData: {
        employeeName: employee.name,
        businessName: route.businesses?.name,
        routeName: route.name || 'Din ruteplan',
        routeDate: new Date(route.route_date).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        stops: stops.map((stop: any, index: number) => ({ number: index + 1, customerName: stop.customer_name || 'Aftale', address: stop.address || 'Adresse ikke angivet', service: stop.service_summary || undefined })),
        appUrl: `https://serviceydere.dk/medarbejder/rute/${routeId}`,
      },
    })
    return json(result)
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'send_failed' }, 500)
  }
})