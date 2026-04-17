/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Nulstil din adgangskode hos {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt={siteName} height="32" style={logo} />
        </Section>
        <Heading style={h1}>Nulstil din adgangskode</Heading>
        <Text style={text}>
          Vi har modtaget en anmodning om at nulstille adgangskoden til din {siteName}-konto.
          Klik på knappen nedenfor for at vælge en ny adgangskode.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>Nulstil adgangskode</Button>
        </Section>
        <Text style={muted}>
          Knappen virker ikke? Kopier dette link i din browser:<br />
          <Link href={confirmationUrl} style={smallLink}>{confirmationUrl}</Link>
        </Text>
        <Text style={footer}>
          Hvis du ikke har anmodet om dette, kan du roligt ignorere e-mailen — din adgangskode forbliver uændret.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const LOGO_URL = 'https://gkectsellkpltrxvusot.supabase.co/storage/v1/object/public/email-assets/serviceydere-logo.png'
const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logoSection = { marginBottom: '24px' }
const logo = { display: 'block' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d1729', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const muted = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.5', margin: '24px 0 0', wordBreak: 'break-all' as const }
const smallLink = { color: '#0891b2', textDecoration: 'underline', fontSize: '12px' }
const buttonSection = { margin: '8px 0 8px' }
const button = {
  backgroundColor: '#0d1729', color: '#ffffff', fontSize: '15px', fontWeight: 600,
  borderRadius: '12px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }
