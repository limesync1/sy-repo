/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
  main, wrapper, container, headerBar,
  heroSection, heroTitle, heroSubtitle,
  text, link,
  buttonSection, button,
  card, cardAccent,
  cardLabel, cardValue,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

interface CustomerWelcomeProps {
  customerName?: string
  email?: string
  password?: string | null
  loginUrl?: string
}

const CustomerWelcomeEmail = ({ customerName, email, password, loginUrl = `${SITE_URL}/min-konto` }: CustomerWelcomeProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Velkommen til {SITE_NAME} – din konto er oprettet</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}><Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} /></Section>
        <Container style={container}>
          <Section style={heroSection}>
            <Heading style={heroTitle}>{customerName ? `Velkommen, ${customerName}` : 'Velkommen'}</Heading>
            <Text style={heroSubtitle}>Vi har oprettet en konto til dig hos {SITE_NAME}, så du nemt kan følge dine bestillinger, abonnementer og fakturaer ét sted.</Text>
          </Section>

          <Text style={text}>Brug oplysningerne herunder til at logge ind. Du er allerede logget ind nu, men kan bruge disse næste gang.</Text>

          <Section style={card}>
            <Text style={cardLabel}>E-mail</Text>
            <Text style={cardValue}>{email}</Text>
            {password && <><Text style={cardLabel}>Adgangskode</Text><Text style={{ ...cardValue, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{password}</Text></>}
          </Section>

          {password && (
            <Section style={cardAccent}>
              <Text style={{ ...text, fontWeight: 600, color: '#0d1729', margin: '0 0 6px' }}>Sikkerhed</Text>
              <Text style={{ ...text, fontSize: '13px', margin: 0, color: '#0e7490' }}>Vi anbefaler, at du ændrer adgangskoden første gang du logger ind.</Text>
            </Section>
          )}

          <Section style={buttonSection}><Button style={button} href={loginUrl}>Gå til kundepanel</Button></Section>

          <Section style={helpBox}>
            <Text style={helpBoxTitle}>Spørgsmål?</Text>
            <Text style={helpBoxText}>Skriv til os på <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>.</Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> · <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Kontakt</Link></Text>
          <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CustomerWelcomeEmail,
  subject: () => `Velkommen til ${SITE_NAME} – din konto er oprettet`,
  displayName: 'Kunde velkomst',
  previewData: {
    customerName: 'Mette',
    email: 'mette@example.dk',
    password: 'Kx7mPq2nRt9w',
    loginUrl: 'https://serviceydere.dk/min-konto',
  },
} satisfies TemplateEntry

export default CustomerWelcomeEmail
