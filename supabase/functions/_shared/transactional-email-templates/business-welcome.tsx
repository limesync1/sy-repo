/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL, main, wrapper, container, headerBar, heroSection, heroTitle, heroSubtitle, text, buttonSection, button, card, cardLabel, cardValue, footer, footerText } from './_styles.ts'

interface BusinessWelcomeProps {
  businessName?: string
  loginUrl?: string
  email?: string
  password?: string
  trialDays?: number
}

const BusinessWelcomeEmail = ({ businessName = 'din virksomhed', loginUrl = 'https://serviceydere.dk/log-ind', email, password, trialDays = 14 }: BusinessWelcomeProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{businessName} er klar på Serviceydere</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}><Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} /></Section>
        <Container style={container}>
          <Section style={heroSection}>
            <Heading style={heroTitle}>Velkommen til Serviceydere</Heading>
            <Text style={heroSubtitle}>{businessName} er oprettet, og virksomhedspanelet er klar.</Text>
          </Section>
          <Text style={text}>Din prøveperiode er på {trialDays} dage. Du kan nu tilføje services, kunder og aftaler.</Text>
          {(email || password) && (
            <Section style={card}>
              {email && <><Text style={cardLabel}>E-mail</Text><Text style={cardValue}>{email}</Text></>}
              {password && <><Text style={cardLabel}>Midlertidig adgangskode</Text><Text style={cardValue}>{password}</Text></>}
            </Section>
          )}
          <Section style={buttonSection}><Button style={button} href={loginUrl}>Åbn virksomhedspanelet</Button></Section>
        </Container>
        <Section style={footer}><Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}.</Text></Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BusinessWelcomeEmail,
  subject: (data) => `${data.businessName || 'Din virksomhed'} er klar på Serviceydere`,
  displayName: 'Virksomhedsvelkomst',
  previewData: { businessName: 'Eksempel ApS', email: 'ejer@example.dk', password: 'Midlertidig123', trialDays: 14 },
} satisfies TemplateEntry

export default BusinessWelcomeEmail