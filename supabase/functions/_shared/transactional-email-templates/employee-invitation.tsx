/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
  main, wrapper, container, headerBar,
  h1, h2, text, link,
  buttonSection, button,
  cardAccent,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

interface EmployeeWelcomeProps {
  employeeName?: string
  businessName?: string
  businessLogoUrl?: string | null
  email?: string
  password?: string | null
  accountAlreadyExisted?: boolean
  loginUrl?: string
}

const credBox: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 18px',
  margin: '20px 0 8px',
}

const credLabel: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#64748b',
  margin: '0 0 4px',
  fontWeight: 600,
}

const credValue: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '15px',
  color: '#0d1729',
  margin: '0 0 12px',
  fontWeight: 600,
  wordBreak: 'break-all',
}

const businessCard: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '14px 16px',
  margin: '14px 0 22px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}

const EmployeeWelcomeEmail = ({
  employeeName,
  businessName = 'en virksomhed',
  businessLogoUrl,
  email,
  password,
  accountAlreadyExisted,
  loginUrl = `${SITE_URL}/log-ind`,
}: EmployeeWelcomeProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Du er tilføjet som medarbejder hos {businessName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
        </Section>

        <Container style={container}>
          <Heading style={h1}>
            {employeeName ? `Velkommen, ${employeeName} 👋` : 'Velkommen 👋'}
          </Heading>
          <Text style={text}>
            Du er blevet tilføjet som medarbejder hos:
          </Text>

          {/* Business card with logo */}
          <Section style={businessCard}>
            {businessLogoUrl ? (
              <Img
                src={businessLogoUrl}
                alt={businessName}
                width="48"
                height="48"
                style={{ borderRadius: '8px', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#0d1729',
                  color: '#ffffff',
                  fontSize: 18,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <Text style={{ ...text, margin: 0, fontWeight: 600, color: '#0d1729', fontSize: '15px' }}>
                {businessName}
              </Text>
              <Text style={{ ...text, margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                via {SITE_NAME}
              </Text>
            </div>
          </Section>

          <Text style={text}>
            {accountAlreadyExisted
              ? `Du har allerede en konto hos ${SITE_NAME}, så du kan logge ind med dine eksisterende oplysninger og tilgå medarbejder-appen.`
              : `Vi har oprettet en konto til dig. Brug disse oplysninger til at logge ind:`}
          </Text>

          {/* Credentials */}
          <Section style={credBox}>
            <Text style={credLabel}>E-mail</Text>
            <Text style={credValue}>{email}</Text>
            {password && (
              <>
                <Text style={credLabel}>Adgangskode</Text>
                <Text style={credValue}>{password}</Text>
              </>
            )}
          </Section>

          {password && (
            <Text style={{ ...text, fontSize: '12px', color: '#64748b', margin: '0 0 18px' }}>
              💡 Vi anbefaler, at du ændrer adgangskoden, første gang du logger ind.
            </Text>
          )}

          <Section style={buttonSection}>
            <Button style={button} href={loginUrl}>
              Log ind på medarbejder-app
            </Button>
          </Section>

          <Section style={cardAccent}>
            <Text style={{ ...text, fontWeight: 600, color: '#0d1729', margin: '0 0 6px' }}>
              📋 Hvad kan du i medarbejder-appen?
            </Text>
            <Text style={{ ...text, fontSize: '13px', margin: 0, color: '#0e7490' }}>
              Se dagens ruter, naviger til kunderne og marker besøg som udført —
              alt sammen fra din telefon.
            </Text>
          </Section>

          <Section style={helpBox}>
            <Text style={helpBoxTitle}>Spørgsmål?</Text>
            <Text style={helpBoxText}>
              Skriv til os på{' '}
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>
              {' '}eller kontakt {businessName} direkte.
            </Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Text style={footerText}>
            <Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> ·{' '}
            <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Kontakt</Link>
          </Text>
          <Text style={footerText}>
            © {new Date().getFullYear()} {SITE_NAME}.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EmployeeWelcomeEmail,
  subject: (data) =>
    `Du er tilføjet som medarbejder hos ${data.businessName || 'en virksomhed'}`,
  displayName: 'Medarbejder velkomst',
  previewData: {
    employeeName: 'Anders',
    businessName: 'Rengøring ApS',
    businessLogoUrl: null,
    email: 'anders@example.dk',
    password: 'Kx7mPq2nRt9w',
    accountAlreadyExisted: false,
    loginUrl: 'https://serviceydere.dk/log-ind',
  },
} satisfies TemplateEntry

export default EmployeeWelcomeEmail
