/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Din verifikationskode</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="Serviceydere" height="32" style={logo} />
        </Section>
        <Heading style={h1}>Bekræft din identitet</Heading>
        <Text style={text}>Brug koden nedenfor for at bekræfte at det er dig:</Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={footer}>
          Koden udløber om kort tid. Hvis du ikke har anmodet om dette, kan du roligt ignorere e-mailen.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const LOGO_URL = 'https://gkectsellkpltrxvusot.supabase.co/storage/v1/object/public/email-assets/serviceydere-logo.png'
const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logoSection = { marginBottom: '24px' }
const logo = { display: 'block' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d1729', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 16px' }
const codeBox = {
  backgroundColor: '#f3f4f6', borderRadius: '12px', padding: '20px', textAlign: 'center' as const, margin: '0 0 24px',
}
const codeStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '32px', fontWeight: 'bold' as const, color: '#0d1729', letterSpacing: '0.3em', margin: 0,
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }
