/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Bekræft din e-mail hos {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt={siteName} height="32" style={logo} />
        </Section>
        <Heading style={h1}>Velkommen til Serviceydere 👋</Heading>
        <Text style={text}>
          Tak fordi du oprettede en konto på{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>.
          Bekræft venligst din e-mail ({recipient}) ved at klikke nedenfor.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>Bekræft min e-mail</Button>
        </Section>
        <Text style={muted}>
          Knappen virker ikke? Kopier dette link i din browser:<br />
          <Link href={confirmationUrl} style={smallLink}>{confirmationUrl}</Link>
        </Text>
        <Text style={footer}>
          Hvis du ikke har oprettet en konto, kan du roligt ignorere denne e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const LOGO_URL = 'https://gkectsellkpltrxvusot.supabase.co/storage/v1/object/public/email-assets/serviceydere-logo.png'
const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logoSection = { marginBottom: '24px' }
const logo = { display: 'block' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d1729', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const muted = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.5', margin: '24px 0 0', wordBreak: 'break-all' as const }
const link = { color: '#0d1729', textDecoration: 'underline' }
const smallLink = { color: '#0891b2', textDecoration: 'underline', fontSize: '12px' }
const buttonSection = { margin: '8px 0 8px' }
const button = {
  backgroundColor: '#0d1729', color: '#ffffff', fontSize: '15px', fontWeight: 600,
  borderRadius: '12px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }
