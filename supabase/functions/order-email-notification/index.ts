import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const { orderId, kind, customerEmail, confirmToken } = await req.json()
    if (!orderId || !['confirmation', 'manual-confirmed', 'status-update'].includes(kind)) return json({ error: 'invalid_request' }, 400)
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey)
    const { data: order, error } = await admin.from('orders').select('*, businesses(id,name,phone,email,address,zip_code,city,owner_id), order_items(*)').eq('id', orderId).single()
    if (error || !order?.customer_email) return json({ error: 'order_not_found' }, 404)

    if (kind === 'confirmation') {
      // Order confirmation is sent right after checkout. Only allow it for
      // fresh orders, and — when the order belongs to an account — only for
      // that signed-in customer. Prevents re-triggering mails for any order id.
      const createdAt = new Date(order.created_at).getTime()
      if (!Number.isFinite(createdAt) || Date.now() - createdAt > 15 * 60 * 1000) return json({ error: 'forbidden' }, 403)
      if (order.customer_id) {
        const auth = req.headers.get('Authorization') || ''
        const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
        const { data: { user } } = await userClient.auth.getUser()
        if (!user || user.id !== order.customer_id) return json({ error: 'forbidden' }, 403)
      } else {
        // Guest checkout: caller must prove knowledge of the order's e-mail,
        // and the idempotency key below guarantees at most one confirmation.
        const supplied = typeof customerEmail === 'string' ? customerEmail.trim().toLowerCase() : ''
        if (!supplied || supplied !== String(order.customer_email).trim().toLowerCase()) return json({ error: 'forbidden' }, 403)
        // ...and present the one-time secret generated at checkout (only its hash is stored).
        if (typeof confirmToken !== 'string' || confirmToken.length < 32 || confirmToken.length > 200 || !order.guest_confirm_token_hash) return json({ error: 'forbidden' }, 403)
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(confirmToken)))
        const hash = Array.from(digest).map((b) => b.toString(16).padStart(2, '0')).join('')
        if (hash !== order.guest_confirm_token_hash) return json({ error: 'forbidden' }, 403)
        await admin.from('orders').update({ guest_confirm_token_hash: null }).eq('id', order.id)
      }
    } else {
      const auth = req.headers.get('Authorization') || ''
      const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
      const { data: { user } } = await userClient.auth.getUser()
      if (!user) return json({ error: 'unauthorized' }, 401)
      const [{ data: employee }, { data: adminRole }] = await Promise.all([
        admin.from('employees').select('id').eq('business_id', order.business_id).eq('user_id', user.id).maybeSingle(),
        admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
      ])
      if (order.businesses?.owner_id !== user.id && !employee && !adminRole) return json({ error: 'forbidden' }, 403)
    }

    const { data: siblings } = await admin.from('orders').select('*, order_items(*)').eq('parent_order_id', order.parent_order_id || order.id)
    const orders = siblings?.length ? siblings : [order]
    const items = orders.flatMap((o: any) => (o.order_items || []).map((item: any) => ({
      name: item.service_name, quantity: item.quantity, price: Number(item.total_price || 0),
      interval: item.details?.interval, intervalLabel: item.details?.interval, description: item.details?.description,
      stepDetails: item.details?.stepDetails,
    })))
    const biz = order.businesses
    const businessAddress = [biz?.address, [biz?.zip_code, biz?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    let templateName = 'order-confirmation'
    let templateData: Record<string, unknown> = {
      customerName: order.customer_name, customerEmail: order.customer_email, customerPhone: order.customer_phone,
      businessName: biz?.name, businessPhone: biz?.phone, businessEmail: biz?.email, businessAddress,
      orderId: order.parent_order_id || order.id, totalAmount: orders.reduce((n: number, o: any) => n + Number(o.total_amount || 0), 0),
      hasRecurring: items.some((i: any) => i.interval && i.interval !== 'engangskøb'), items,
    }
    if (kind === 'manual-confirmed') {
      templateName = 'manual-order-confirmed'
      templateData = { ...templateData, businessMessage: order.business_message, address: businessAddress, preferredDate: order.preferred_date }
    } else if (kind === 'status-update') {
      templateName = 'order-status-update'
      const event = order.business_response === 'adjusted' && !order.customer_response ? 'adjusted' : order.status
      templateData = { ...templateData, event, message: order.business_message, serviceDate: order.preferred_date,
        originalAmount: Number(order.total_amount || 0), proposedAmount: order.adjusted_amount ? Number(order.adjusted_amount) : undefined,
        finalAmount: order.status === 'confirmed' ? Number(order.adjusted_amount || order.total_amount || 0) : undefined,
        proposedItems: order.adjusted_details?.items,
      }
    }
    const result = await sendTemplateEmail(templateName, order.customer_email, {
      idempotencyKey: `${templateName}-${order.parent_order_id || order.id}-${kind === 'status-update' ? `${order.updated_at}-${order.status}-${order.business_response}` : 'created'}`,
      templateData,
    })
    return json(result)
  } catch (error) {
    console.error('order email failed', error)
    return json({ error: 'send_failed' }, 500)
  }
})