/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AuthLayout, P } from './_layout.tsx'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <AuthLayout
    preview="Du er inviteret til Serviceydere"
    eyebrow="Invitation"
    title="Du er inviteret"
    cta={{ label: 'Acceptér invitation', href: confirmationUrl }}
    note="Forventede du ikke en invitation? Så kan du roligt se bort fra denne mail."
  >
    <P>Du er blevet inviteret til at bruge Serviceydere.</P>
    <P>Tryk på knappen for at acceptere og oprette din adgang.</P>
  </AuthLayout>
)
export default InviteEmail
