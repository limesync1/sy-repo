/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, LOGO_URL,
  main, container, logoSection, logo, h1, text, link,
  buttonSection, button, card, cardRow, cardLabel, footer, badge,
} from './_styles.ts'

type Status = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | string

interface OrderStatusUpdateProps {
  customerName?: string
  businessName?: string
  orderId?: string
  status?: Status
  message?: string
  nextServiceDate?: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Afventer',
  confirmed: 'Bekræftet',
  in_progress: 'I gang',
  completed: 'Gennemført',
  cancelled: 'Annulleret',
}

const STATUS_COLOR: Record<string, { fg: string; bg: string }> = {
  pending: { fg: '#92400e', bg: '#fef3c7' },
  confirmed: { fg: '#065f46', bg: '#d1fae5' },
  in_progress: { fg: '#1e3a8a', bg: '#dbeafe' },
  completed: { fg: '#065f46', bg: '#d1fae5' },
  cancelled: { fg: '#991b1b', bg: '#fee2e2' },
}

const STATUS_HEADLINE: Record<string, string> = {
  pending: 'Din ordre afventer',
  confirmed: 'Din ordre er bekræftet ✅',
  in_progress: 'Din service er i gang 🛠️',
  completed: 'Din service er gennemført 🎉',
  cancelled: 'Din ordre er annulleret',
}

const fmtDate = (s?: string) => {
  if (!s) return null
  try {
    return new Date(s).toLocaleDateString('da-DK', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return s }
}

const OrderStatusUpdateEmail = ({
  customerName,
  businessName,
  orderId,
  status = 'pending',
  message,
  nextServiceDate,
}: OrderStatusUpdateProps) => {
  const colors = STATUS_COLOR[status] ?? STATUS_COLOR.pending
  const headline = STATUS_HEADLINE[status] ?? 'Opdatering på din ordre'
  const date = fmtDate(nextServiceDate)
  return (
    <Html lang="da" dir="ltr">
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={LOGO_URL} alt={SITE_NAME} height="32" style={logo} />
          </Section>
          <Heading style={h1}>{headline}</Heading>
          <Text style={text}>
            Hej{customerName ? ` ${customerName}` : ''}, der er en opdatering på din ordre
            {businessName ? ` hos ${businessName}` : ''}.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Status</Text>
            <Text style={cardRow}>
              <span style={badge(colors.fg, colors.bg)}>
                {STATUS_LABEL[status] ?? status}
              </span>
            </Text>
            {orderId && (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Ordrenummer</Text>
                <Text style={cardRow}>#{orderId.slice(0, 8).toUpperCase()}</Text>
              </>
            )}
            {date && (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Næste servicedato</Text>
                <Text style={cardRow}>{date}</Text>
              </>
            )}
            {message && (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Besked fra leverandøren</Text>
                <Text style={cardRow}>{message}</Text>
              </>
            )}
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={`${SITE_URL}/dashboard`}>Se ordren</Button>
          </Section>

          <Text style={footer}>
            Har du spørgsmål? Besøg{' '}
            <Link href={SITE_URL} style={link}>serviceydere.dk</Link> eller svar på denne e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderStatusUpdateEmail,
  subject: (data) => {
    const s = STATUS_LABEL[data.status] ?? 'Opdatering'
    return `${s} — din ordre hos ${data.businessName ?? 'Serviceydere'}`
  },
  displayName: 'Ordre-status opdatering',
  previewData: {
    customerName: 'Mette',
    businessName: 'Rengøring København ApS',
    orderId: 'a1b2c3d4-1234',
    status: 'confirmed',
    message: 'Vi glæder os til at komme forbi tirsdag.',
    nextServiceDate: '2026-05-05',
  },
} satisfies TemplateEntry

export default OrderStatusUpdateEmail
