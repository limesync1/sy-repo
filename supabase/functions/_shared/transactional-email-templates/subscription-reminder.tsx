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

interface SubscriptionReminderProps {
  customerName?: string
  businessName?: string
  serviceName?: string
  nextServiceDate?: string
  interval?: string
  totalPrice?: number
}

const INTERVAL_LABEL: Record<string, string> = {
  weekly: 'ugentligt',
  biweekly: 'hver 14. dag',
  monthly: 'månedligt',
  quarterly: 'kvartalsvis',
  yearly: 'årligt',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(n)

const fmtDate = (s?: string) => {
  if (!s) return null
  try {
    return new Date(s).toLocaleDateString('da-DK', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return s }
}

const SubscriptionReminderEmail = ({
  customerName,
  businessName,
  serviceName,
  nextServiceDate,
  interval,
  totalPrice,
}: SubscriptionReminderProps) => {
  const date = fmtDate(nextServiceDate)
  return (
    <Html lang="da" dir="ltr">
      <Head />
      <Preview>Påmindelse om din kommende service{businessName ? ` hos ${businessName}` : ''}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={LOGO_URL} alt={SITE_NAME} height="32" style={logo} />
          </Section>
          <Heading style={h1}>Din næste service nærmer sig 📅</Heading>
          <Text style={text}>
            Hej{customerName ? ` ${customerName}` : ''}, dette er en venlig påmindelse om din kommende aftale
            {businessName ? ` hos ${businessName}` : ''}.
          </Text>

          <Section style={card}>
            {serviceName && (
              <>
                <Text style={cardLabel}>Service</Text>
                <Text style={cardRow}>{serviceName}</Text>
              </>
            )}
            {date && (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Næste servicedato</Text>
                <Text style={cardRow}>{date}</Text>
              </>
            )}
            {interval && (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Interval</Text>
                <Text style={cardRow}>{INTERVAL_LABEL[interval] ?? interval}</Text>
              </>
            )}
            {typeof totalPrice === 'number' && (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Pris pr. gang</Text>
                <Text style={cardRow}>{fmt(totalPrice)}</Text>
              </>
            )}
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={`${SITE_URL}/dashboard`}>Administrér din aftale</Button>
          </Section>

          <Text style={footer}>
            Vil du ændre eller pause din aftale? Det kan du gøre når som helst på{' '}
            <Link href={`${SITE_URL}/dashboard`} style={link}>din konto</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubscriptionReminderEmail,
  subject: (data) =>
    `Påmindelse: ${data.serviceName ?? 'Din næste service'}${data.businessName ? ` hos ${data.businessName}` : ''}`,
  displayName: 'Påmindelse om aftale',
  previewData: {
    customerName: 'Mette',
    businessName: 'Rengøring København ApS',
    serviceName: 'Privatrengøring 80 m²',
    nextServiceDate: '2026-05-05',
    interval: 'biweekly',
    totalPrice: 599,
  },
} satisfies TemplateEntry

export default SubscriptionReminderEmail
