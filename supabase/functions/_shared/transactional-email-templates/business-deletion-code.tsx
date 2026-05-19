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

const BusinessDeletionCodeEmail = ({ businessName = 'virksomheden', code = '00000', expiresInMinutes = 15 }: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Bekræft sletning af {businessName}: {code}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="32" style={{ maxHeight: 32 }} />
        </Section>
        <Container style={container}>
          <Section style={heroSection}>
            <Heading style={heroTitle}>Bekræft sletning af {businessName}</Heading>
            <Text style={heroSubtitle}>
              Du har anmodet om at slette <strong>{businessName}</strong> fra {SITE_NAME}. Indtast koden nedenfor for at bekræfte. Når sletningen er bekræftet, deaktiveres virksomheden og abonnementet annulleres.
            </Text>
          </Section>

          <Section><div style={codeBox}>{code}</div></Section>

          <Section style={helpBox}>
            <Text style={helpBoxTitle}>Vigtigt</Text>
            <Text style={helpBoxText}>
              Koden er gyldig i {expiresInMinutes} minutter og kan kun bruges én gang. Hvis du ikke selv har anmodet om sletning, så ignorér denne e-mail og kontakt support med det samme.
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
  component: BusinessDeletionCodeEmail,
  subject: (data: Record<string, any>) => `Bekræft sletning af ${data?.businessName ?? 'virksomhed'}: ${data?.code ?? ''}`,
  displayName: 'Virksomhed · Bekræft sletning',
  previewData: { businessName: 'Demo Rengøring', code: '48217', expiresInMinutes: 15 },
} satisfies TemplateEntry

export default BusinessDeletionCodeEmail