/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AuthLayout, P } from './_layout.tsx'

interface RecoveryEmailProps { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <AuthLayout
    preview="Nulstil din adgangskode til Serviceydere"
    eyebrow="Adgangskode"
    title="Nulstil din adgangskode"
    cta={{ label: 'Vælg ny adgangskode', href: confirmationUrl }}
    note="Har du ikke bedt om en ny adgangskode? Så kan du se bort fra mailen. Din nuværende adgangskode virker stadig."
  >
    <P>Vi har modtaget en anmodning om at nulstille adgangskoden til din konto.</P>
    <P>Tryk på knappen for at vælge en ny.</P>
  </AuthLayout>
)
export default RecoveryEmail
