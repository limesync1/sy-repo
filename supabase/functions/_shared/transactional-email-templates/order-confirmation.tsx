/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, LOGO_URL,
  main, container, logoSection, logo, h1, text, link,
  buttonSection, button, card, cardRow, cardLabel, totalRow, footer,
} from './_styles.ts'

interface OrderItem {
  name: string
  quantity?: number
  price: number
}

interface OrderConfirmationProps {
  customerName?: string
  businessName?: string
  orderId?: string
  items?: OrderItem[]
  totalAmount?: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(n)

const OrderConfirmationEmail = ({
  customerName,
  businessName,
  orderId,
  items = [],
  totalAmount = 0,
}: OrderConfirmationProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Vi har modtaget din ordre hos {businessName ?? SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="32" style={logo} />
        </Section>
        <Heading style={h1}>
          Tak for din ordre{customerName ? `, ${customerName}` : ''} ✅
        </Heading>
        <Text style={text}>
          Vi har modtaget din ordre{businessName ? ` hos ${businessName}` : ''} og sendt den videre til leverandøren.
          Du modtager en ny e-mail, så snart de bekræfter eller justerer ordren.
        </Text>

        <Section style={card}>
          {orderId && (
            <>
              <Text style={cardLabel}>Ordrenummer</Text>
              <Text style={cardRow}>#{orderId.slice(0, 8).toUpperCase()}</Text>
            </>
          )}
          {items.length > 0 && (
            <>
              <Text style={{ ...cardLabel, marginTop: '12px' }}>Indhold</Text>
              {items.map((it, i) => (
                <Text key={i} style={cardRow}>
                  {it.quantity ? `${it.quantity}× ` : ''}{it.name} — {fmt(it.price)}
                </Text>
              ))}
            </>
          )}
          <Text style={totalRow}>I alt: {fmt(totalAmount)}</Text>
        </Section>

        <Section style={buttonSection}>
          <Button style={button} href={`${SITE_URL}/dashboard`}>Se din ordre</Button>
        </Section>

        <Text style={footer}>
          Har du spørgsmål til ordren? Svar på denne e-mail eller kontakt os via {' '}
          <Link href={SITE_URL} style={link}>serviceydere.dk</Link>.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data) =>
    `Ordrebekræftelse${data.orderId ? ` #${String(data.orderId).slice(0, 8).toUpperCase()}` : ''} — Serviceydere`,
  displayName: 'Ordrebekræftelse',
  previewData: {
    customerName: 'Mette',
    businessName: 'Rengøring København ApS',
    orderId: 'a1b2c3d4-1234',
    items: [
      { name: 'Privatrengøring 80 m²', quantity: 1, price: 599 },
      { name: 'Vinduespudsning', quantity: 1, price: 299 },
    ],
    totalAmount: 898,
  },
} satisfies TemplateEntry

export default OrderConfirmationEmail
