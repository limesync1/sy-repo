/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AuthLayout, P, Strong } from './_layout.tsx'

interface SignupEmailProps { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <AuthLayout
    preview="Bekræft din e-mail og kom i gang med Serviceydere"
    eyebrow="Velkommen"
    title="Bekræft din e-mail"
    cta={{ label: 'Bekræft e-mail', href: confirmationUrl }}
    note="Har du ikke oprettet en konto? Så kan du roligt se bort fra denne mail."
  >
    <P>Tak fordi du har oprettet en konto hos Serviceydere.</P>
    <P>Tryk på knappen for at bekræfte, at <Strong>{recipient}</Strong> er din e-mail.</P>
  </AuthLayout>
)
export default SignupEmail
