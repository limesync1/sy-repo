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
  card, cardAccent, cardWarning,
  cardLabel, cardValue,
  badge,
  stepList, stepItem, stepNumber,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

type Status = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'adjusted' | string

interface OrderStatusUpdateProps {
  customerName?: string
  businessName?: string
  businessPhone?: string
  businessEmail?: string
  orderId?: string
  status?: Status
  message?: string
  nextServiceDate?: string
  serviceName?: string
  totalAmount?: number
  adjustedAmount?: number
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Afventer',
  adjusted: 'Forslag til justering',
  confirmed: 'Bekræftet',
  in_progress: 'I gang',
  completed: 'Gennemført',
  cancelled: 'Annulleret',
}

const STATUS_COLOR: Record<string, { fg: string; bg: string }> = {
  pending: { fg: '#92400e', bg: '#fef3c7' },
  adjusted: { fg: '#9a3412', bg: '#ffedd5' },
  confirmed: { fg: '#065f46', bg: '#d1fae5' },
  in_progress: { fg: '#1e3a8a', bg: '#dbeafe' },
  completed: { fg: '#065f46', bg: '#d1fae5' },
  cancelled: { fg: '#991b1b', bg: '#fee2e2' },
}

const STATUS_HEADLINE: Record<string, string> = {
  pending: 'Din ordre afventer behandling',
  adjusted: 'Forslag til din ordre 📝',
  confirmed: 'Din ordre er bekræftet ✅',
  in_progress: 'Din service er i gang 🛠️',
  completed: 'Din service er gennemført 🎉',
  cancelled: 'Din ordre er annulleret',
}

const STATUS_SUBTITLE: Record<string, string> = {
  pending: 'Vi venter på svar fra leverandøren.',
  adjusted: 'Leverandøren har sendt et forslag til justering — du skal acceptere eller afvise det.',
  confirmed: 'Leverandøren har bekræftet din ordre og glæder sig til at hjælpe.',
  in_progress: 'Leverandøren er i gang med at udføre din service.',
  completed: 'Tak fordi du valgte os. Vi håber, du er tilfreds med resultatet.',
  cancelled: 'Din ordre er blevet annulleret.',
}

const STATUS_NEXT: Record<string, string[]> = {
  pending: [
    'Leverandøren gennemgår din ordre.',
    'Du får besked, så snart de bekræfter eller foreslår en justering.',
  ],
  adjusted: [
    'Gennemgå forslaget i dit kundepanel.',
    'Accepter eller afvis — eller skriv tilbage med spørgsmål.',
  ],
  confirmed: [
    'Leverandøren kontakter dig for at aftale tid, hvis det ikke allerede er aftalt.',
    'Du modtager besked, når servicen går i gang.',
  ],
  in_progress: [
    'Leverandøren arbejder lige nu på din service.',
    'Du får en bekræftelse, så snart arbejdet er udført.',
  ],
  completed: [
    'Hvis du er tilfreds, vil leverandøren sætte stor pris på en anmeldelse.',
    'Tilbagevendende services planlægges automatisk til næste dato.',
  ],
  cancelled: [
    'Hvis du har spørgsmål til annulleringen, kontakt da leverandøren direkte.',
  ],
}

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)

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
  businessPhone,
  businessEmail,
  orderId,
  status = 'pending',
  message,
  nextServiceDate,
  serviceName,
  totalAmount,
  adjustedAmount,
}: OrderStatusUpdateProps) => {
  const colors = STATUS_COLOR[status] ?? STATUS_COLOR.pending
  const headline = STATUS_HEADLINE[status] ?? 'Opdatering på din ordre'
  const subtitle = STATUS_SUBTITLE[status] ?? ''
  const nextSteps = STATUS_NEXT[status] ?? []
  const date = fmtDate(nextServiceDate)
  const shortId = orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : null
  const showAdjusted = status === 'adjusted' && adjustedAmount != null && adjustedAmount !== totalAmount

  return (
    <Html lang="da" dir="ltr">
      <Head />
      <Preview>{headline}{businessName ? ` — ${businessName}` : ''}</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={headerBar}>
            <Img src={LOGO_URL} alt={SITE_NAME} height="28" />
          </Section>

          <Container style={container}>
            <Heading style={h1}>{headline}</Heading>
            <Text style={text}>
              Hej{customerName ? ` ${customerName}` : ''}, {subtitle}
            </Text>

            <Section style={{ margin: '0 0 8px' }}>
              <span style={badge(colors.fg, colors.bg)}>
                {STATUS_LABEL[status] ?? status}
              </span>
            </Section>

            <Section style={card}>
              {businessName && (
                <>
                  <Text style={cardLabel}>Leverandør</Text>
                  <Text style={cardValue}>🏢 {businessName}</Text>
                </>
              )}
              {serviceName && (
                <>
                  <Text style={cardLabel}>Service</Text>
                  <Text style={cardValue}>{serviceName}</Text>
                </>
              )}
              {shortId && (
                <>
                  <Text style={cardLabel}>Ordrenummer</Text>
                  <Text style={cardValue}>{shortId}</Text>
                </>
              )}
              {date && (
                <>
                  <Text style={cardLabel}>{status === 'completed' ? 'Næste servicedato' : 'Servicedato'}</Text>
                  <Text style={cardValue}>📅 {date}</Text>
                </>
              )}
              {totalAmount != null && !showAdjusted && (
                <>
                  <Text style={cardLabel}>Beløb</Text>
                  <Text style={cardValue}>{fmt(totalAmount)}</Text>
                </>
              )}
              {showAdjusted && (
                <>
                  <Text style={cardLabel}>Oprindelig pris</Text>
                  <Text style={{ ...cardValue, textDecoration: 'line-through', color: '#9ca3af' }}>
                    {fmt(totalAmount!)}
                  </Text>
                  <Text style={cardLabel}>Foreslået pris</Text>
                  <Text style={{ ...cardValue, fontSize: '18px', color: '#9a3412' }}>
                    {fmt(adjustedAmount!)}
                  </Text>
                </>
              )}
            </Section>

            {message && (
              <>
                <Text style={h2}>Besked fra leverandøren</Text>
                <Section style={status === 'adjusted' ? cardWarning : cardAccent}>
                  <Text style={{ ...text, fontStyle: 'italic', margin: 0, color: '#374151' }}>
                    "{message}"
                  </Text>
                </Section>
              </>
            )}

            {nextSteps.length > 0 && (
              <>
                <Text style={h2}>Hvad sker der nu?</Text>
                <ol style={stepList}>
                  {nextSteps.map((step, i) => (
                    <li key={i} style={stepItem}>
                      <span style={stepNumber}>{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </>
            )}

            <Section style={buttonSection}>
              <Button
                style={button}
                href={`${SITE_URL}/dashboard${orderId ? `?order=${orderId}` : ''}`}
              >
                {status === 'adjusted' ? 'Gennemgå forslag' : 'Se ordren'}
              </Button>
            </Section>

            {(businessPhone || businessEmail) && (
              <Section style={helpBox}>
                <Text style={helpBoxTitle}>Kontakt {businessName || 'leverandøren'}</Text>
                <Text style={helpBoxText}>
                  {businessPhone && (
                    <>📞 <Link href={`tel:${businessPhone}`} style={link}>{businessPhone}</Link></>
                  )}
                  {businessPhone && businessEmail && '  ·  '}
                  {businessEmail && (
                    <>✉️ <Link href={`mailto:${businessEmail}`} style={link}>{businessEmail}</Link></>
                  )}
                </Text>
              </Section>
            )}
          </Container>

          <Section style={footer}>
            <Text style={footerText}>
              <Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> ·{' '}
              <Link href={`${SITE_URL}/dashboard`} style={footerLink}>Mit kundepanel</Link> ·{' '}
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Support</Link>
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} {SITE_NAME}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderStatusUpdateEmail,
  subject: (data) => {
    const s = STATUS_LABEL[data.status] ?? 'Opdatering'
    const biz = data.businessName ? ` hos ${data.businessName}` : ''
    return `${s}${biz} — Serviceydere`
  },
  displayName: 'Ordre-status opdatering',
  previewData: {
    customerName: 'Mette',
    businessName: 'Rengøring København ApS',
    businessPhone: '+45 70 20 30 40',
    businessEmail: 'kontakt@rengoering-kbh.dk',
    orderId: 'a1b2c3d4-1234',
    status: 'confirmed',
    message: 'Vi glæder os til at komme forbi tirsdag kl. 10:00.',
    nextServiceDate: '2026-05-05',
    serviceName: 'Privatrengøring 80 m²',
    totalAmount: 898,
  },
} satisfies TemplateEntry

export default OrderStatusUpdateEmail
