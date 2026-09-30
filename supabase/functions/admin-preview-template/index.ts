// admin-preview-template — renderer en e-mailskabelon med dens previewData
// så platform-admin kan se hvordan en mail ser ud uden at sende den.
// Bevidst adskilt fra preview-transactional-email (som er gated til Go-API).
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: roleRow } = await supabase
      .from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET') {
      // List of templates
      const list = Object.entries(TEMPLATES).map(([name, entry]) => ({
        name,
        displayName: entry.displayName || name,
        hasPreview: !!entry.previewData,
      }))
      return new Response(JSON.stringify({ templates: list }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const templateName = String(body.templateName || '')
    const entry = TEMPLATES[templateName]
    if (!entry) {
      return new Response(JSON.stringify({ error: 'unknown_template' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'send') {
      // Test sends only go to the signed-in admin's own address, with the
      // template's built-in preview data — never to arbitrary recipients.
      let recipient = String(userData.user.email || '').trim().toLowerCase()
      let templateData: Record<string, unknown> = entry.previewData ?? {}
      // Resend of a previously logged mail: recipient and data come from the
      // server-side send log, never from the request body.
      if (body.resendMessageId) {
        const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        const { data: logRow } = await svc.from('email_send_log')
          .select('recipient_email, template_name, metadata')
          .eq('message_id', String(body.resendMessageId)).eq('template_name', templateName)
          .limit(1).maybeSingle()
        if (!logRow?.recipient_email) {
          return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        recipient = String(logRow.recipient_email).toLowerCase()
        const md: any = logRow.metadata ?? {}
        templateData = md.templateData ?? md.template_data ?? templateData
      }
      if (!/^\S+@\S+\.\S+$/.test(recipient)) return new Response(JSON.stringify({ error: 'invalid_recipient' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const result = await sendTemplateEmail(templateName, recipient, {
        idempotencyKey: `admin-test-${templateName}-${crypto.randomUUID()}`,
        templateData,
      })
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = body.templateData ?? entry.previewData ?? {}
    let html = ''
    let renderError: string | null = null
    try {
      html = await renderAsync(React.createElement(entry.component, data))
    } catch (e) {
      renderError = (e as Error).message
    }
    const subject = typeof entry.subject === 'function' ? entry.subject(data) : entry.subject

    return new Response(JSON.stringify({
      templateName, displayName: entry.displayName || templateName,
      subject, html, previewData: entry.previewData ?? null, renderError,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})