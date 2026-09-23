import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const { token } = await req.json(); if (!token) return json({ error: 'invalid_request' }, 400)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: conv } = await admin.from('chat_conversations').select('id,session_token,visitor_name,visitor_email,subject,user_id,business_id').eq('session_token', token).single()
    if (!conv) return json({ error: 'not_found' }, 404)
    const { data: message } = await admin.from('chat_messages').select('content').eq('conversation_id', conv.id).eq('sender_type', 'visitor').order('created_at').limit(1).maybeSingle()
    let recipient = 'kontakt@serviceydere.dk'; let adminUrl: string | undefined
    if (conv.business_id) {
      const { data: business } = await admin.from('businesses').select('email').eq('id', conv.business_id).single()
      if (business?.email) recipient = business.email
      adminUrl = 'https://serviceydere.dk/virksomhed?tab=livechat'
    }
    const result = await sendTemplateEmail('new-chat-message', recipient, { idempotencyKey: `chat-start-${conv.id}`, templateData: {
      conversationToken: token, visitorName: conv.visitor_name, visitorEmail: conv.visitor_email,
      subject: conv.subject || '', message: message?.content || '', isLoggedIn: !!conv.user_id, adminUrl,
    } })
    return json(result)
  } catch (error) { console.error(error); return json({ error: error instanceof Error ? error.message : 'send_failed' }, 500) }
})