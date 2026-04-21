import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let payload: { token?: string; decision?: string; message?: string } = {}
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const token = (payload.token || '').trim()
  const decision = (payload.decision || '').trim().toLowerCase()
  const customerMessage = (payload.message || '').toString().slice(0, 1000)

  if (!token || token.length < 16) return json({ error: 'invalid_token' }, 400)
  if (decision !== 'accepted' && decision !== 'rejected') {
    return json({ error: 'invalid_decision' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // Find order by token
  // Tokenet sidder kun på forælder-ordren — godkendelse cascader til alle børn.
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('*, businesses(id, name, email, phone)')
    .eq('approval_token', token)
    .maybeSingle()

  if (fetchErr) return json({ error: 'lookup_failed' }, 500)
  if (!order) return json({ error: 'not_found' }, 404)
  if (!order.requires_customer_approval) {
    return json({ error: 'already_processed', status: order.status }, 409)
  }
  if (order.approval_expires_at && new Date(order.approval_expires_at) < new Date()) {
    return json({ error: 'expired' }, 410)
  }

  const newStatus = decision === 'accepted' ? 'confirmed' : 'cancelled'

  // Find alle ordrer i samme gruppe — forælderen + alle børn deler parent_order_id.
  // Hvis ordren ikke har en parent (gammel data), opdaterer vi kun den selv.
  const groupId = order.parent_order_id || order.id
  const { data: groupOrders } = await supabase
    .from('orders')
    .select('id, notes')
    .or(`id.eq.${groupId},parent_order_id.eq.${groupId}`)

  const ids = (groupOrders && groupOrders.length > 0)
    ? groupOrders.map((o) => o.id)
    : [order.id]

  // Mark all orders in group processed.
  const noteSuffix = customerMessage ? `\n\n[Kundens svar]: ${customerMessage}` : ''
  if (noteSuffix) {
    // Bevar eksisterende notes pr. ordre — opdater én ad gangen så vi ikke overskriver
    for (const o of (groupOrders || [{ id: order.id, notes: order.notes }])) {
      const newNotes = [o.notes, `[Kundens svar]: ${customerMessage}`].filter(Boolean).join('\n\n')
      await supabase
        .from('orders')
        .update({
          status: newStatus,
          customer_response: decision,
          requires_customer_approval: false,
          notes: newNotes,
        })
        .eq('id', o.id)
    }
  } else {
    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        customer_response: decision,
        requires_customer_approval: false,
      })
      .in('id', ids)
    if (updateErr) return json({ error: 'update_failed', detail: updateErr.message }, 500)
  }

  // Aktivér eventuelle pending-abonnementer for denne gruppe når kunden accepterer
  if (decision === 'accepted') {
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .in('order_id', ids)
      .eq('status', 'pending')
  }

  // Notify the business owner — fire and forget
  const biz: any = order.businesses
  if (biz?.email) {
    supabase.functions
      .invoke('send-transactional-email', {
        body: {
          templateName: 'order-status-update',
          recipientEmail: biz.email,
          idempotencyKey: `manual-order-${decision}-${order.id}`,
          templateData: {
            customerName: order.customer_name,
            businessName: biz.name,
            orderId: order.id,
            status: newStatus,
            statusLabel: decision === 'accepted'
              ? 'Kunden har godkendt bestillingen'
              : 'Kunden har afvist bestillingen',
            totalAmount: Number(order.total_amount || 0),
            note: customerMessage || undefined,
          },
        },
      })
      .catch(() => { /* non-blocking */ })
  }

  return json({
    ok: true,
    decision,
    status: newStatus,
    order_id: order.id,
  })
})