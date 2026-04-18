/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, LOGO_URL,
  main, container, logoSection, logo, h1, text, link,
  buttonSection, button, card, cardRow, cardLabel, footer,
} from './_styles.ts'

interface QuoteReceivedProps {
  customerName?: string
  businessName?: string
  price?: number
  message?: string
  quoteRequestId?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(n)

const QuoteReceivedEmail = ({
  customerName,
  businessName,
  price,
  message,
  quoteRequestId,
}: QuoteReceivedProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Du har modtaget et nyt tilbud{businessName ? ` fra ${businessName}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="32" style={logo} />
        </Section>
        <Heading style={h1}>Du har fået et nyt tilbud 💼</Heading>
        <Text style={text}>
          Hej{customerName ? ` ${customerName}` : ''},{businessName ? ` ${businessName}` : ' en serviceyder'} har sendt dig et tilbud på din forespørgsel.
        </Text>

        <Section style={card}>
          {typeof price === 'number' && (
            <>
              <Text style={cardLabel}>Pris</Text>
              <Text style={{ ...cardRow, fontSize: '20px', fontWeight: 600, color: '#0d1729' }}>
                {fmt(price)}
              </Text>
            </>
          )}
          {message && (
            <>
              <Text style={{ ...cardLabel, marginTop: '12px' }}>Besked</Text>
              <Text style={cardRow}>{message}</Text>
            </>
          )}
        </Section>

        <Section style={buttonSection}>
          <Button
            style={button}
            href={`${SITE_URL}/dashboard${quoteRequestId ? `?quote=${quoteRequestId}` : ''}`}
          >
            Se og besvar tilbud
          </Button>
        </Section>

        <Text style={footer}>
          Du kan sammenligne flere tilbud på{' '}
          <Link href={`${SITE_URL}/dashboard`} style={link}>din konto</Link>.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: QuoteReceivedEmail,
  subject: (data) =>
    `Nyt tilbud${data.businessName ? ` fra ${data.businessName}` : ''} — Serviceydere`,
  displayName: 'Nyt tilbud modtaget',
  previewData: {
    customerName: 'Mette',
    businessName: 'VVS Aarhus ApS',
    price: 2495,
    message: 'Vi kan komme forbi næste mandag og udskifte vandhanen.',
    quoteRequestId: 'q1',
  },
} satisfies TemplateEntry

export default QuoteReceivedEmail
