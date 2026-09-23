import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

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

  // Aktivér / synkronisér abonnementer for denne gruppe når kunden accepterer.
  // Hvis virksomheden har sendt et tilpasset forslag (adjusted_details), kan
  // pris OG interval være ændret — fx fra engangskøb til hver_14_dag, hvilket
  // betyder at ordren nu skal optræde som et abonnement hos kunden.
  if (decision === 'accepted') {
    // Hent alle ordrer i gruppen med deres adjusted_details
    const { data: groupFull } = await supabase
      .from('orders')
      .select('id, customer_id, business_id, customer_email, customer_name, total_amount, adjusted_amount, adjusted_details')
      .in('id', ids)

    for (const o of groupFull || []) {
      const items: any[] = (o as any)?.adjusted_details?.items || []

      // Når virksomheden har sendt et tilpasset forslag og kunden accepterer,
      // er det den NYE pris og de NYE service-detaljer der gælder. Vi opdaterer
      // derfor ordrelinjerne (order_items) og total_amount, så fakturaer,
      // regnskabs-sync og UI altid afspejler det kunden faktisk godkendte —
      // ikke den oprindelige bestilling.
      if (items.length > 0) {
        const newItems = items.map((it: any) => {
          const quantity = Number(it.quantity ?? it.details?.quantity ?? 1) || 1
          const totalPrice = Number(it.total_price ?? it.totalPrice ?? 0) || 0
          const unitPrice = Number(
            it.unit_price ?? it.unitPrice ?? (quantity > 0 ? totalPrice / quantity : totalPrice),
          ) || 0
          return {
            order_id: (o as any).id,
            service_id: it.service_id ?? null,
            service_name: it.service_name || it.name || 'Service',
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            details: it.details || {},
          }
        })

        // Erstat eksisterende linjer med de godkendte/tilpassede linjer.
        await supabase.from('order_items').delete().eq('order_id', (o as any).id)
        await supabase.from('order_items').insert(newItems as any)

        const newTotal = typeof (o as any).adjusted_amount === 'number'
          ? (o as any).adjusted_amount
          : newItems.reduce((s, it) => s + Number(it.total_price || 0), 0)

        await supabase
          .from('orders')
          .update({ total_amount: newTotal })
          .eq('id', (o as any).id)

        // Marker ordren til genudsendelse i regnskabsprogrammet, så den
        // opdaterede faktura/ordre overskriver den tidligere version.
        await supabase.from('accounting_sync_queue').insert({
          business_id: (o as any).business_id,
          entity_type: 'order',
          entity_id: (o as any).id,
          operation: 'update',
          payload: { reason: 'customer_accepted_adjusted_proposal' },
        }).then(() => {}, () => {})
      }

      const { data: linkedSubs } = await supabase
        .from('subscriptions')
        .select('id, service_id, interval, details')
        .eq('order_id', o.id)

      const handled = new Set<string>()
      for (const sub of linkedSubs || []) {
        const match = items.find((it: any) => it.service_id === sub.service_id)
          || (items.length === 1 ? items[0] : null)
        const update: Record<string, any> = { status: 'active' }
        if (match) {
          if (match.service_id) handled.add(match.service_id)
          if (typeof match.total_price === 'number') update.total_price = match.total_price
          if (match.details) {
            update.details = { ...((sub as any).details || {}), ...match.details }
            const newInterval = match.details?.interval
            if (newInterval && newInterval !== (sub as any).interval) {
              update.interval = newInterval
              if (newInterval === 'engangskøb') {
                update.status = 'cancelled'
                update.cancelled_at = new Date().toISOString()
              }
            }
          }
        }
        await supabase.from('subscriptions').update(update).eq('id', (sub as any).id)
      }

      // Opret nye abonnementer for items med tilbagevendende interval, hvor
      // der ikke fandtes et abonnement i forvejen.
      const newSubs = items
        .filter((it: any) =>
          it?.service_id &&
          !handled.has(it.service_id) &&
          it?.details?.interval &&
          it.details.interval !== 'engangskøb'
        )
        .map((it: any) => ({
          customer_id: (o as any).customer_id,
          business_id: (o as any).business_id,
          service_id: it.service_id,
          order_id: o.id,
          service_name: it.service_name || it.name || 'Service',
          interval: it.details.interval,
          total_price: typeof it.total_price === 'number' ? it.total_price : 0,
          details: it.details || {},
          status: 'active',
          customer_email: (o as any).customer_email || null,
          customer_name: (o as any).customer_name || null,
        }))
      if (newSubs.length > 0) {
        await supabase.from('subscriptions').insert(newSubs as any)
      }
    }
  }

  // Notify the business owner — fire and forget
  const biz: any = order.businesses
  if (biz?.email) {
    sendTemplateEmail('order-status-update', biz.email, {
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