/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, LOGO_URL,
  main, container, logoSection, logo, h1, text, link,
  buttonSection, button, footer,
} from './_styles.ts'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Velkommen til {SITE_NAME} 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="32" style={logo} />
        </Section>
        <Heading style={h1}>
          {name ? `Velkommen, ${name} 🎉` : 'Velkommen til Serviceydere 🎉'}
        </Heading>
        <Text style={text}>
          Tak fordi du oprettede en konto på{' '}
          <Link href={SITE_URL} style={link}><strong>{SITE_NAME}</strong></Link>.
          Du er nu klar til at finde og booke pålidelige serviceydere i hele Danmark.
        </Text>
        <Text style={text}>
          Kom godt i gang ved at udforske vores virksomheder, sammenligne priser og bestille den service, du har brug for.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={`${SITE_URL}/search`}>Find en serviceyder</Button>
        </Section>
        <Text style={footer}>
          Har du spørgsmål? Svar bare på denne e-mail — vi hjælper dig gerne.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Velkommen til Serviceydere 🎉',
  displayName: 'Velkomst-email',
  previewData: { name: 'Mette' },
} satisfies TemplateEntry

export default WelcomeEmail
