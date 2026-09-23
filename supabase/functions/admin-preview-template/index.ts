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
      const recipient = String(body.recipientEmail || '').trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(recipient)) return new Response(JSON.stringify({ error: 'invalid_recipient' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const result = await sendTemplateEmail(templateName, recipient, {
        idempotencyKey: String(body.idempotencyKey || `admin-test-${templateName}-${crypto.randomUUID()}`),
        templateData: body.templateData ?? entry.previewData ?? {},
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