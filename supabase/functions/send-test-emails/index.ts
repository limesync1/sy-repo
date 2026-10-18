import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendLovableEmail, setEmailUnsubscribe } from 'npm:@lovable.dev/email-js@0.3.1'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

// Temporary: sends one of every email to a fixed address only.
const TO = 'william@adely.dk'
const U = 'https://serviceydere.dk'
const AUTH: [string, string, React.ComponentType<any>, any][] = [
  ['auth-signup', 'Bekræft din e-mail', SignupEmail, { siteName: 'Serviceydere', siteUrl: U, recipient: TO, confirmationUrl: U }],
  ['auth-invite', 'Du er inviteret til Serviceydere', InviteEmail, { siteName: 'Serviceydere', siteUrl: U, confirmationUrl: U }],
  ['auth-magiclink', 'Dit login-link', MagicLinkEmail, { siteName: 'Serviceydere', confirmationUrl: U }],
  ['auth-recovery', 'Nulstil din adgangskode', RecoveryEmail, { siteName: 'Serviceydere', confirmationUrl: U }],
  ['auth-email-change', 'Bekræft din nye e-mail', EmailChangeEmail, { siteName: 'Serviceydere', oldEmail: TO, email: TO, newEmail: TO, confirmationUrl: U }],
  ['auth-reauthentication', 'Din bekræftelseskode', ReauthenticationEmail, { token: '123456' }],
]

function list() {
  const items = AUTH.map(([label, subject, C, data]) => ({ label, subject, C, data }))
  for (const [name, t] of Object.entries(TEMPLATES)) {
    const data = t.previewData ?? {}
    items.push({ label: name, subject: typeof t.subject === 'function' ? t.subject(data) : t.subject, C: t.component, data })
  }
  return items
}

Deno.serve(async (req) => {
  const { from = 0, count = 1, unblock = false } = await req.json().catch(() => ({}))
  if (unblock) {
    const r = await setEmailUnsubscribe({ recipient: TO, domain: 'serviceydere.dk', subscribed: true }, { apiKey: Deno.env.get('LOVABLE_API_KEY')! })
    return new Response(JSON.stringify(r))
  }
  const items = list()
  const results: string[] = []
  for (let i = from; i < Math.min(items.length, from + count); i++) {
    if (i > from) await new Promise((r) => setTimeout(r, 5000))
    const it = items[i]
    try {
      const el = React.createElement(it.C, it.data)
      await sendLovableEmail({
        to: TO, from: 'Serviceydere <noreply@serviceydere.dk>', sender_domain: 'notify.serviceydere.dk',
        subject: `[Test] ${it.subject}`, html: await renderAsync(el), text: await renderAsync(el, { plainText: true }),
        purpose: 'transactional', label: `test-${it.label}`, idempotency_key: crypto.randomUUID(),
      }, { apiKey: Deno.env.get('LOVABLE_API_KEY')!, sendUrl: Deno.env.get('LOVABLE_SEND_URL') })
      results.push(`${i} ok ${it.label}`)
    } catch (e) { results.push(`${i} FAIL ${it.label}: ${(e as Error).message}`) }
  }
  return new Response(JSON.stringify({ total: items.length, results }), { headers: { 'Content-Type': 'application/json' } })
})
