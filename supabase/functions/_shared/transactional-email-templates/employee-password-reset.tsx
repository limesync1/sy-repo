/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
  main, wrapper, container, headerBar,
  h1, text,
  buttonSection, button,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

interface Props {
  employeeName?: string
  businessName?: string
  businessLogoUrl?: string | null
  resetUrl?: string
}

const EmployeePasswordResetEmail = ({
  employeeName = 'der',
  businessName = SITE_NAME,
  businessLogoUrl,
  resetUrl = SITE_URL,
}: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Nulstil din adgangskode til {businessName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          {businessLogoUrl ? (
            <Img src={businessLogoUrl} alt={businessName} height="36" style={{ maxHeight: 36 }} />
          ) : (
            <Img src={LOGO_URL} alt={SITE_NAME} height="32" style={{ maxHeight: 32 }} />
          )}
        </Section>
        <Container style={container}>
          <Heading style={h1}>Nulstil din adgangskode</Heading>
          <Text style={text}>Hej {employeeName},</Text>
          <Text style={text}>
            Din arbejdsgiver hos <strong>{businessName}</strong> har anmodet om en
            nulstilling af din adgangskode til medarbejder-appen. Klik på knappen
            herunder for at vælge en ny adgangskode.
          </Text>
          <Section style={buttonSection}>
            <Button href={resetUrl} style={button}>Vælg ny adgangskode</Button>
          </Section>
          <div style={helpBox}>
            <Text style={helpBoxTitle}>Var det ikke dig?</Text>
            <Text style={helpBoxText}>
              Hvis du ikke forventede denne email, kan du roligt ignorere den —
              din nuværende adgangskode er stadig aktiv. Linket udløber efter kort tid.
            </Text>
          </div>
        </Container>
        <div style={footer}>
          <Text style={footerText}>
            Brug for hjælp? Kontakt os på{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>{SUPPORT_EMAIL}</a>
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EmployeePasswordResetEmail,
  subject: (data: Record<string, any>) =>
    `Nulstil din adgangskode${data?.businessName ? ` til ${data.businessName}` : ''}`,
  displayName: 'Medarbejder · Nulstil adgangskode',
  previewData: {
    employeeName: 'Anders',
    businessName: 'Demo Rengøring',
    resetUrl: 'https://example.com/reset',
  },
} satisfies TemplateEntry