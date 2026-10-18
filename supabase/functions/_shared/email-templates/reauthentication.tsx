/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AuthLayout, P } from './_layout.tsx'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthLayout
    preview="Din bekræftelseskode til Serviceydere"
    eyebrow="Sikkerhed"
    title="Din bekræftelseskode"
    code={token}
    note="Koden udløber snart. Har du ikke bedt om den, kan du se bort fra mailen."
  >
    <P>Indtast koden herunder for at bekræfte, at det er dig.</P>
  </AuthLayout>
)
export default ReauthenticationEmail
