/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
 SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
 main, wrapper, container, headerBar,
 heroSection, heroTitle, heroSubtitle,
 h2, text, link,
 buttonSection, button,
 card, cardAccent,
 cardLabel, cardValue,
 badge,
 stepList, stepItem, stepNumber,
 helpBox, helpBoxTitle, helpBoxText,
 footer, footerText, footerLink,
} from './_styles.ts'

type SubscriptionEvent = 'paused' | 'resumed' | 'cancelled' | 'rescheduled'

interface SubscriptionUpdateProps {
 customerName?: string
 businessName?: string
 businessPhone?: string
 businessEmail?: string
 serviceName?: string
 intervalLabel?: string
 totalPrice?: number
 event?: SubscriptionEvent
 nextServiceDate?: string
 previousServiceDate?: string
 pausedAt?: string
 cancelledAt?: string
 reason?: string
 completedCycles?: number
}

const EVENT_LABEL: Record<SubscriptionEvent, string> = { paused: 'På pause', resumed: 'Genoptaget', cancelled: 'Opsagt', rescheduled: 'Flyttet' }
const EVENT_COLOR: Record<SubscriptionEvent, { fg: string; bg: string }> = {
 paused: { fg: '#92400e', bg: '#fef3c7' }, resumed: { fg: '#065f46', bg: '#d1fae5' }, cancelled: { fg: '#991b1b', bg: '#fee2e2' }, rescheduled: { fg: '#1e3a8a', bg: '#dbeafe' },
}
const EVENT_HEADLINE: Record<SubscriptionEvent, string> = {
 paused: 'Din aftale er sat på pause ', resumed: 'Din aftale er aktiv igen ', cancelled: 'Din aftale er opsagt', rescheduled: 'Din næste service er flyttet ',
}
const EVENT_INTRO: Record<SubscriptionEvent, (svc: string, biz: string) => string> = {
 paused: (svc, biz) =>`Din tilbagevendende aftale "${svc}" hos ${biz} er sat på pause. Der planlægges ikke nye besøg, før aftalen bliver genoptaget.`,
 resumed: (svc, biz) =>`Din aftale "${svc}" hos ${biz} er nu aktiv igen, og næste service er planlagt.`,
 cancelled: (svc, biz) =>`Din aftale "${svc}" hos ${biz} er nu opsagt. Der bliver ikke planlagt flere besøg på denne aftale.`,
 rescheduled: (svc, biz) =>`Tidspunktet for din næste "${svc}" hos ${biz} er blevet flyttet.`,
}
const EVENT_NEXT: Record<SubscriptionEvent, string[]> = {
 paused: ['Aftalen er midlertidigt stoppet, og der planlægges ingen nye serviceringer.', 'Du kan genoptage aftalen når som helst fra dit kundepanel.'],
 resumed: ['Næste service er planlagt og udføres på den nye aktive aftale.', 'Du kan stadig pause eller opsige aftalen igen senere.'],
 cancelled: ['Aftalen er afsluttet, og der kommer ikke flere serviceringer eller opkrævninger.', 'Hvis du vil i gang igen, kan du altid bestille en ny service.'],
 rescheduled: ['Sørg for adgang til adressen på den nye dato.', 'Kontakt virksomheden direkte, hvis det nye tidspunkt ikke passer.'],
}
const fmt = (n: number) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)
const fmtDate = (s?: string) => { if (!s) return null; try { return new Date(s).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) } catch { return s } }

const SubscriptionUpdateEmail = ({ customerName, businessName, businessPhone, businessEmail, serviceName = 'din service', intervalLabel, totalPrice, event = 'paused', nextServiceDate, previousServiceDate, pausedAt, cancelledAt, reason, completedCycles }: SubscriptionUpdateProps) => {
 const colors = EVENT_COLOR[event] ?? EVENT_COLOR.paused
 const headline = EVENT_HEADLINE[event] ?? EVENT_HEADLINE.paused
 const businessLabel = businessName || 'virksomheden'
 const intro = (EVENT_INTRO[event] ?? EVENT_INTRO.paused)(serviceName, businessLabel)
 const nextSteps = EVENT_NEXT[event] ?? []
 const nextDate = fmtDate(nextServiceDate)
 const prevDate = fmtDate(previousServiceDate)
 const pauseDate = fmtDate(pausedAt)
 const cancelDate = fmtDate(cancelledAt)
 const ctaLabel = event === 'paused' ? 'Genoptag aftale' : event === 'cancelled' ? 'Find en ny service' : 'Se din aftale'
 const ctaHref = event === 'cancelled' ? `${SITE_URL}/search` : `${SITE_URL}/dashboard`

 return (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>{headline}{businessName ? ` ${businessName}` : ''}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}><Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} /></Section>
 <Container style={container}>
 <Section style={heroSection}>
 <Heading style={heroTitle}>{headline}</Heading>
 <Text style={heroSubtitle}>Hej{customerName ? ` ${customerName}` : ''}, {intro}</Text>
</Section>

 <Section style={{ margin: '0 0 10px' }}><span style={badge(colors.fg, colors.bg)}>{EVENT_LABEL[event]}</span></Section>

 <Section style={card}>
 <Text style={cardLabel}>Service</Text><Text style={cardValue}>{serviceName}</Text>
 {businessName && <><Text style={cardLabel}>Virksomhed</Text><Text style={cardValue}>{businessName}</Text></>}
 {intervalLabel && <><Text style={cardLabel}>Interval</Text><Text style={cardValue}>{intervalLabel}</Text></>}
 {typeof totalPrice === 'number' && <><Text style={cardLabel}>Pris pr. gang</Text><Text style={cardValue}>{fmt(totalPrice)}</Text></>}
 {typeof completedCycles === 'number' && completedCycles > 0 && <><Text style={cardLabel}>Udført i alt</Text><Text style={cardValue}>{completedCycles} {completedCycles === 1 ? 'gang' : 'gange'}</Text></>}
 {event === 'paused' && pauseDate && <><Text style={cardLabel}>Sat på pause</Text><Text style={cardValue}>{pauseDate}</Text></>}
 {event === 'cancelled' && cancelDate && <><Text style={cardLabel}>Opsagt</Text><Text style={cardValue}>{cancelDate}</Text></>}
 {event === 'rescheduled' && prevDate && <><Text style={cardLabel}>Tidligere dato</Text><Text style={{ ...cardValue, textDecoration: 'line-through', color: '#94a3b8' }}> {prevDate}</Text></>}
 {(event === 'resumed' || event === 'rescheduled') && nextDate && <><Text style={cardLabel}>{event === 'rescheduled' ? 'Ny dato' : 'Næste service'}</Text><Text style={{ ...cardValue, fontSize: '16px' }}> {nextDate}</Text></>}
</Section>

 {reason && (
 <Section style={cardAccent}>
 <Text style={{ ...text, fontWeight: 600, color: '#0d1729', margin: '0 0 6px' }}>Bemærkning</Text>
 <Text style={{ ...text, fontStyle: 'italic', margin: 0, color: '#475569' }}>"{reason}"</Text>
</Section>
 )}

 <Text style={h2}>Hvad sker der nu?</Text>
 <ol style={stepList}>
 {nextSteps.map((step, i) =><li key={i} style={stepItem}><span style={stepNumber}>{i + 1}</span>{step}</li>)}
 </ol>

 <Section style={buttonSection}><Button style={button} href={ctaHref}>{ctaLabel}</Button></Section>

 {(businessPhone || businessEmail) && (
 <Section style={helpBox}>
 <Text style={helpBoxTitle}>Spørgsmål?</Text>
 <Text style={helpBoxText}>{businessPhone && <><Link href={`tel:${businessPhone}`} style={link}>{businessPhone}</Link></>}{businessPhone && businessEmail && ' · '}{businessEmail && <><Link href={`mailto:${businessEmail}`} style={link}>{businessEmail}</Link></>}</Text>
</Section>
 )}
 </Container>

 <Section style={footer}>
 <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> · <Link href={`${SITE_URL}/dashboard`} style={footerLink}>Mit kundepanel</Link> · <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Kontakt</Link></Text>
 <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}.</Text>
</Section>
 </Container>
 </Body>
 </Html>
 )
}

export const template = {
 component: SubscriptionUpdateEmail,
 subject: (data) =>`Aftale opdateret${data.businessName ? ` ${data.businessName}` : ''}`,
 displayName: 'Opdatering af aftale',
 previewData: { customerName: 'Mette', businessName: 'Ready2Clean', serviceName: 'Privatrengøring', intervalLabel: 'Hver 14. dag', totalPrice: 599, event: 'rescheduled', nextServiceDate: '2026-05-08', previousServiceDate: '2026-05-01', completedCycles: 3 },
} satisfies TemplateEntry

export default SubscriptionUpdateEmail
