/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AuthLayout, P } from './_layout.tsx'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <AuthLayout
    preview="Dit login-link til Serviceydere"
    eyebrow="Log ind"
    title="Dit login-link"
    cta={{ label: 'Log ind', href: confirmationUrl }}
    note="Linket virker kun kort tid og kun én gang. Har du ikke bedt om det, kan du se bort fra mailen."
  >
    <P>Tryk på knappen for at logge ind på Serviceydere. Du skal ikke bruge en adgangskode.</P>
  </AuthLayout>
)
export default MagicLinkEmail
