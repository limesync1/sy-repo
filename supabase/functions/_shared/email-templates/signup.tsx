/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AuthLayout, P, Strong } from './_layout.tsx'

interface SignupEmailProps { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string; token?: string }

export const SignupEmail = ({ recipient, confirmationUrl, token }: SignupEmailProps) => (
  <AuthLayout
    preview={token ? `Din bekræftelseskode: ${token}` : 'Bekræft din e-mail og kom i gang med Serviceydere'}
    eyebrow="Velkommen"
    title="Bekræft din e-mail"
    code={token || undefined}
    cta={{ label: 'Eller bekræft med ét tryk', href: confirmationUrl }}
    note="Har du ikke oprettet en konto? Så kan du roligt se bort fra denne mail."
  >
    <P>Tak fordi du har oprettet en konto hos Serviceydere.</P>
    <P>Skriv koden herunder i vinduet på Serviceydere for at bekræfte, at <Strong>{recipient}</Strong> er din e-mail.</P>
  </AuthLayout>
)
export default SignupEmail
