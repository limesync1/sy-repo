/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AuthLayout, P, Strong } from './_layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the current address; for the NEW-recipient half `email` equals NEW.
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ oldEmail, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <AuthLayout
    preview="Bekræft din nye e-mail hos Serviceydere"
    eyebrow="Kontoændring"
    title="Bekræft din nye e-mail"
    cta={{ label: 'Bekræft ændring', href: confirmationUrl }}
    note="Har du ikke bedt om denne ændring? Kontakt os straks, så vi kan sikre din konto."
  >
    <P>Du har bedt om at ændre e-mailen på din konto fra <Strong>{oldEmail || email}</Strong> til <Strong>{newEmail}</Strong>.</P>
    <P>Tryk på knappen for at bekræfte.</P>
  </AuthLayout>
)
export default EmailChangeEmail
