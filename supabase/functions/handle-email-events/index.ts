import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!supabaseUrl || !serviceKey) throw new Error('Server configuration error')
const db = createClient(supabaseUrl, serviceKey)

async function recordOutcome(
  event: { event_id: string; data: { recipient: string; message_id?: string } },
  reason: 'bounce' | 'complaint' | 'unsubscribe',
  status: 'bounced' | 'complained' | 'suppressed',
  message: string,
) {
  const recipient = event.data.recipient.toLowerCase()
  const { error: suppressError } = await db.from('suppressed_emails').upsert(
    { email: recipient, reason, metadata: null },
    { onConflict: 'email' },
  )
  if (suppressError) {
    console.error('Email outcome write failed', { event_id: event.event_id, code: suppressError.code, message: suppressError.message })
    throw suppressError
  }

  const { error: logError } = await db.from('email_send_log').insert({
    message_id: event.data.message_id ?? null,
    template_name: 'system',
    recipient_email: recipient,
    status,
    error_message: message,
    metadata: null,
  })
  if (logError) {
    console.error('Email event log failed', { event_id: event.event_id, code: logError.code, message: logError.message })
    throw logError
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await recordOutcome(event, 'bounce', 'bounced', 'Permanent bounce — email address is invalid or rejected')
    },
    'email.complaint': async (event) => {
      await recordOutcome(event, 'complaint', 'complained', 'Spam complaint — recipient marked email as spam')
    },
    'email.unsubscribed': async (event) => {
      await recordOutcome(event, 'unsubscribe', 'suppressed', 'Recipient unsubscribed')
    },
  },
})

Deno.serve((req) => handler(req))
