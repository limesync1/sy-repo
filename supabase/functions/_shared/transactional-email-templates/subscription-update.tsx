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
  card, cardAccent,
  cardLabel, cardValue,
  badge,
  stepList, stepItem, stepNumber,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

/* Hændelser på en aktiv aftale (subscription):
   - paused     → Kunden / virksomheden har sat aftalen på pause
   - resumed    → Aftalen er taget i brug igen efter pause
   - cancelled  → Aftalen er opsagt
   - rescheduled → Næste servicedato er flyttet
*/
type SubscriptionEvent = 'paused' | 'resumed' | 'cancelled' | 'rescheduled'

interface SubscriptionUpdateProps {
  customerName?: string
  businessName?: string
  businessPhone?: string
  businessEmail?: string
  serviceName?: string
  intervalLabel?: string         // fx "Hver 14. dag"
  totalPrice?: number            // pris pr. gang
  event?: SubscriptionEvent
  nextServiceDate?: string       // ny dato (resumed / rescheduled)
  previousServiceDate?: string   // tidligere dato (rescheduled)
  pausedAt?: string              // tidspunkt for pause
  cancelledAt?: string           // tidspunkt for opsigelse
  reason?: string                // valgfri begrundelse fra bruger/virksomhed
  completedCycles?: number       // antal udførte gange før hændelsen
}

const EVENT_LABEL: Record<SubscriptionEvent, string> = {
  paused: 'På pause',
  resumed: 'Genoptaget',
  cancelled: 'Opsagt',
  rescheduled: 'Flyttet',
}

const EVENT_COLOR: Record<SubscriptionEvent, { fg: string; bg: string }> = {
  paused: { fg: '#92400e', bg: '#fef3c7' },
  resumed: { fg: '#065f46', bg: '#d1fae5' },
  cancelled: { fg: '#991b1b', bg: '#fee2e2' },
  rescheduled: { fg: '#1e3a8a', bg: '#dbeafe' },
}

const EVENT_HEADLINE: Record<SubscriptionEvent, string> = {
  paused: 'Din aftale er sat på pause ⏸️',
  resumed: 'Din aftale er aktiv igen ▶️',
  cancelled: 'Din aftale er opsagt',
  rescheduled: 'Din næste service er flyttet 📅',
}

const EVENT_INTRO: Record<SubscriptionEvent, (svc: string, biz: string) => string> = {
  paused: (svc, biz) => `Din tilbagevendende aftale "${svc}" hos ${biz} er sat på pause. Der bliver ikke planlagt nye serviceringer, før du genoptager aftalen.`,
  resumed: (svc, biz) => `Din aftale "${svc}" hos ${biz} er nu aktiv igen, og næste service er planlagt.`,
  cancelled: (svc, biz) => `Din aftale "${svc}" hos ${biz} er nu opsagt. Du modtager ikke flere serviceringer på denne aftale.`,
  rescheduled: (svc, biz) => `Tidspunktet for din næste "${svc}" hos ${biz} er blevet flyttet.`,
}

const EVENT_NEXT: Record<SubscriptionEvent, string[]> = {
  paused: [
    'Aftalen er på pause — der opkræves intet, og der planlægges ingen nye besøg.',
    'Du kan til enhver tid genoptage aftalen fra dit kundepanel.',
  ],
  resumed: [
    'Næste service er planlagt og udføres af leverandøren på den aftalte dato.',
    'Du kan altid pause eller opsige aftalen igen fra dit kundepanel.',
  ],
  cancelled: [
    'Aftalen er afsluttet — der bliver ikke planlagt flere besøg eller opkrævet noget.',
    'Vil du i gang igen, kan du altid bestille en ny service hos leverandøren.',
  ],
  rescheduled: [
    'Sørg for at have adgang til adressen på den nye dato.',
    'Kontakt leverandøren direkte, hvis det nye tidspunkt ikke passer.',
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

const SubscriptionUpdateEmail = ({
  customerName,
  businessName,
  businessPhone,
  businessEmail,
  serviceName = 'din service',
  intervalLabel,
  totalPrice,
  event = 'paused',
  nextServiceDate,
  previousServiceDate,
  pausedAt,
  cancelledAt,
  reason,
  completedCycles,
}: SubscriptionUpdateProps) => {
  const colors = EVENT_COLOR[event] ?? EVENT_COLOR.paused
  const headline = EVENT_HEADLINE[event] ?? EVENT_HEADLINE.paused
  const businessLabel = businessName || 'leverandøren'
  const intro = (EVENT_INTRO[event] ?? EVENT_INTRO.paused)(serviceName, businessLabel)
  const nextSteps = EVENT_NEXT[event] ?? []
  const nextDate = fmtDate(nextServiceDate)
  const prevDate = fmtDate(previousServiceDate)
  const pauseDate = fmtDate(pausedAt)
  const cancelDate = fmtDate(cancelledAt)

  const ctaLabel =
    event === 'paused' ? 'Genoptag aftale'
    : event === 'cancelled' ? 'Find en ny service'
    : 'Se din aftale'

  const ctaHref =
    event === 'cancelled' ? `${SITE_URL}/search` : `${SITE_URL}/dashboard`

  return (
    <Html lang="da" dir="ltr">
      <Head />
      <Preview>{headline}{businessName ? ` — ${businessName}` : ''}</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={headerBar}>
            <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
          </Section>

          <Container style={container}>
            <Heading style={h1}>{headline}</Heading>
            <Text style={text}>
              Hej{customerName ? ` ${customerName}` : ''}, {intro}
            </Text>

            <Section style={{ margin: '0 0 8px' }}>
              <span style={badge(colors.fg, colors.bg)}>{EVENT_LABEL[event]}</span>
            </Section>

            {/* Aftale-detaljer */}
            <Section style={card}>
              <Text style={cardLabel}>Service</Text>
              <Text style={cardValue}>{serviceName}</Text>

              {businessName && (
                <>
                  <Text style={cardLabel}>Leverandør</Text>
                  <Text style={cardValue}>🏢 {businessName}</Text>
                </>
              )}

              {intervalLabel && (
                <>
                  <Text style={cardLabel}>Interval</Text>
                  <Text style={cardValue}>🔄 {intervalLabel}</Text>
                </>
              )}

              {typeof totalPrice === 'number' && (
                <>
                  <Text style={cardLabel}>Pris pr. gang</Text>
                  <Text style={cardValue}>{fmt(totalPrice)}</Text>
                </>
              )}

              {typeof completedCycles === 'number' && completedCycles > 0 && (
                <>
                  <Text style={cardLabel}>Udført i alt</Text>
                  <Text style={cardValue}>{completedCycles} {completedCycles === 1 ? 'gang' : 'gange'}</Text>
                </>
              )}

              {event === 'paused' && pauseDate && (
                <>
                  <Text style={cardLabel}>Sat på pause</Text>
                  <Text style={cardValue}>⏸️ {pauseDate}</Text>
                </>
              )}

              {event === 'cancelled' && cancelDate && (
                <>
                  <Text style={cardLabel}>Opsagt</Text>
                  <Text style={cardValue}>{cancelDate}</Text>
                </>
              )}

              {event === 'rescheduled' && prevDate && (
                <>
                  <Text style={cardLabel}>Tidligere dato</Text>
                  <Text style={{ ...cardValue, textDecoration: 'line-through', color: '#9ca3af' }}>
                    📅 {prevDate}
                  </Text>
                </>
              )}

              {(event === 'resumed' || event === 'rescheduled') && nextDate && (
                <>
                  <Text style={cardLabel}>{event === 'rescheduled' ? 'Ny dato' : 'Næste service'}</Text>
                  <Text style={{ ...cardValue, fontSize: '16px' }}>📅 {nextDate}</Text>
                </>
              )}
            </Section>

            {reason && (
              <>
                <Text style={h2}>Begrundelse</Text>
                <Section style={cardAccent}>
                  <Text style={{ ...text, fontStyle: 'italic', margin: 0, color: '#374151' }}>
                    "{reason}"
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
              <Button style={button} href={ctaHref}>{ctaLabel}</Button>
            </Section>

            {(businessPhone || businessEmail) && (
              <Section style={helpBox}>
                <Text style={helpBoxTitle}>Spørgsmål? Kontakt {businessLabel}</Text>
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
              © {new Date().getFullYear()} {SITE_NAME}. Du modtager denne e-mail, fordi der er sket en ændring på din aftale.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubscriptionUpdateEmail,
  subject: (data) => {
    const biz = data.businessName ? ` hos ${data.businessName}` : ''
    if (data.event === 'paused') return `Din aftale${biz} er sat på pause`
    if (data.event === 'resumed') return `Din aftale${biz} er aktiv igen`
    if (data.event === 'cancelled') return `Din aftale${biz} er opsagt`
    if (data.event === 'rescheduled') return `Din næste service${biz} er flyttet`
    return `Opdatering på din aftale${biz}`
  },
  displayName: 'Aftale-opdatering (pause / opsagt / genoptaget)',
  previewData: {
    customerName: 'Mette',
    businessName: 'Rengøring København ApS',
    businessPhone: '+45 70 20 30 40',
    businessEmail: 'kontakt@rengoering-kbh.dk',
    serviceName: 'Privatrengøring 80 m²',
    intervalLabel: 'Hver 14. dag',
    totalPrice: 599,
    event: 'paused',
    pausedAt: '2026-04-18T10:00:00Z',
    completedCycles: 4,
    reason: 'Vi rejser i 6 uger og har ikke brug for rengøring i perioden.',
  },
} satisfies TemplateEntry

export default SubscriptionUpdateEmail
