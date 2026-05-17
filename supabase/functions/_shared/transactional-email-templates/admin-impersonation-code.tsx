/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
  main, wrapper, container, headerBar,
  heroSection, heroTitle, heroSubtitle,
  link,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

interface Props {
  businessName?: string
  code?: string
  expiresInMinutes?: number
  adminName?: string
}

const codeBox: React.CSSProperties = {
  margin: '24px auto',
  padding: '20px 24px',
  background: '#0f172a',
  color: '#ffffff',
  borderRadius: 12,
  textAlign: 'center',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 36,
  fontWeight: 700,
  letterSpacing: '0.4em',
  maxWidth: 320,
}

const AdminImpersonationCodeEmail = ({ businessName = 'virksomheden', code = '00000', expiresInMinutes = 15, adminName }: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Din adgangskode til {businessName}: {code}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="32" style={{ maxHeight: 32 }} />
        </Section>
        <Container style={container}>
          <Section style={heroSection}>
            <Heading style={heroTitle}>Adgangskode til {businessName}</Heading>
            <Text style={heroSubtitle}>
              {adminName ? `Hej ${adminName}. ` : ''}Du har anmodet om at logge ind som <strong>{businessName}</strong> fra platform-admin. Brug koden nedenfor i dialogen for at åbne virksomhedens panel.
            </Text>
          </Section>

          <Section><div style={codeBox}>{code}</div></Section>

          <Section style={helpBox}>
            <Text style={helpBoxTitle}>Sikkerhed</Text>
            <Text style={helpBoxText}>
              Koden er gyldig i {expiresInMinutes} minutter og kan kun bruges én gang. Hvis du ikke selv har anmodet om denne kode, så ignorér denne e-mail og kontakt support med det samme.
            </Text>
          </Section>
        </Container>
        <Section style={footer}>
          <Text style={footerText}>Brug for hjælp? Kontakt <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link></Text>
          <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link></Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminImpersonationCodeEmail,
  subject: (data: Record<string, any>) => `Adgangskode til ${data?.businessName ?? 'virksomhed'}: ${data?.code ?? ''}`,
  displayName: 'Platform-admin · Log ind som virksomhed',
  previewData: { businessName: 'Demo Rengøring', code: '48217', expiresInMinutes: 15, adminName: 'Anders' },
} satisfies TemplateEntry

export default AdminImpersonationCodeEmail
