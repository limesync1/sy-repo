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
 stepList, stepItem, stepNumber,
 helpBox, helpBoxTitle, helpBoxText,
 footer, footerText, footerLink,
} from './_styles.ts'

interface SubscriptionReminderProps {
 customerName?: string
 businessName?: string
 businessPhone?: string
 businessEmail?: string
 serviceName?: string
 nextServiceDate?: string
 interval?: string
 totalPrice?: number
 daysUntil?: number
 completedCycles?: number
 details?: string
}

const INTERVAL_LABEL: Record<string, string> = {
 ugentlig: 'ugentligt', hver_14_dag: 'hver 14. dag', månedlig: 'månedligt', kvartalsvis: 'kvartalsvis', weekly: 'ugentligt', biweekly: 'hver 14. dag', monthly: 'månedligt', quarterly: 'kvartalsvis', yearly: 'årligt',
}
const fmt = (n: number) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)
const fmtDate = (s?: string) => { if (!s) return null; try { return new Date(s).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) } catch { return s } }

const SubscriptionReminderEmail = ({ customerName, businessName, businessPhone, businessEmail, serviceName, nextServiceDate, interval, totalPrice, daysUntil, completedCycles, details }: SubscriptionReminderProps) => {
 const date = fmtDate(nextServiceDate)
 const intervalLabel = interval ? (INTERVAL_LABEL[interval] ?? interval) : null
 const headline = daysUntil != null ? (daysUntil <= 1 ? 'Din service er i morgen ' : `Din næste service om ${daysUntil} dage`) : 'Din næste service nærmer sig '

 return (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>Påmindelse: {serviceName || 'din service'}{businessName ? ` hos ${businessName}` : ''}{date ? ` ${date}` : ''}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}><Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} /></Section>
 <Container style={container}>
 <Section style={heroSection}>
 <Heading style={heroTitle}>{headline}</Heading>
 <Text style={heroSubtitle}>Hej{customerName ? ` ${customerName}` : ''}, her er en kort påmindelse om din kommende aftale{businessName ? ` hos ${businessName}` : ''}.</Text>
</Section>

 {date && (
 <Section style={cardAccent}>
 <Text style={{ ...cardLabel, color: '#0e7490' }}>Næste servicedato</Text>
 <Text style={{ fontSize: '20px', fontWeight: 700, color: '#0d1729', margin: '0 0 4px', lineHeight: '1.2' }}> {date}</Text>
</Section>
 )}

 <Section style={card}>
 {serviceName && <><Text style={cardLabel}>Service</Text><Text style={cardValue}>{serviceName}</Text></>}
 {businessName && <><Text style={cardLabel}>Virksomhed</Text><Text style={cardValue}>{businessName}</Text></>}
 {intervalLabel && <><Text style={cardLabel}>Interval</Text><Text style={cardValue}>{intervalLabel}</Text></>}
 {typeof totalPrice === 'number' && <><Text style={cardLabel}>Pris pr. gang</Text><Text style={cardValue}>{fmt(totalPrice)}</Text></>}
 {typeof completedCycles === 'number' && completedCycles > 0 && <><Text style={cardLabel}>Tidligere udført</Text><Text style={cardValue}>{completedCycles} {completedCycles === 1 ? 'gang' : 'gange'}</Text></>}
 {details && <><Text style={cardLabel}>Detaljer</Text><Text style={{ ...cardValue, fontWeight: 400, color: '#475569' }}>{details}</Text></>}
</Section>

 <Text style={h2}>Før besøget</Text>
 <ol style={stepList}>
 <li style={stepItem}><span style={stepNumber}>1</span>Sørg for adgang til adressen, så virksomheden kan komme i gang med det samme.</li>
 <li style={stepItem}><span style={stepNumber}>2</span>Hvis datoen ikke passer længere, så kontakt virksomheden hurtigst muligt.</li>
 <li style={stepItem}><span style={stepNumber}>3</span>Du kan pause eller ændre aftalen direkte i dit kundepanel.</li>
 </ol>

 <Section style={buttonSection}><Button style={button} href={`${SITE_URL}/dashboard`}>Administrér din aftale</Button></Section>

 {(businessPhone || businessEmail) && (
 <Section style={helpBox}>
 <Text style={helpBoxTitle}>Brug for at ændre noget?</Text>
 <Text style={helpBoxText}>Kontakt {businessName || 'virksomheden'} direkte:{' '}{businessPhone && <><Link href={`tel:${businessPhone}`} style={link}>{businessPhone}</Link></>}{businessPhone && businessEmail && ' · '}{businessEmail && <><Link href={`mailto:${businessEmail}`} style={link}>{businessEmail}</Link></>}</Text>
</Section>
 )}
 </Container>

 <Section style={footer}>
 <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> · <Link href={`${SITE_URL}/dashboard`} style={footerLink}>Mit kundepanel</Link> · <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Support</Link></Text>
 <Text style={footerText}>Du modtager denne påmindelse, fordi du har en aktiv aftale på serviceydere.dk.</Text>
</Section>
 </Container>
 </Body>
 </Html>
 )
}

export const template = {
 component: SubscriptionReminderEmail,
 subject: (data) => {
 const days = data.daysUntil
 const prefix = days != null ? (days <= 1 ? 'I morgen' : `Om ${days} dage`) : 'Påmindelse'
 return`${prefix}: ${data.serviceName ?? 'Din service'}${data.businessName ? ` hos ${data.businessName}` : ''}`
 },
 displayName: 'Påmindelse om aftale',
 previewData: {
 customerName: 'Mette',
 businessName: 'Rengøring København ApS',
 businessPhone: '+45 70 20 30 40',
 businessEmail: 'kontakt@rengoering-kbh.dk',
 serviceName: 'Privatrengøring 80 m²',
 nextServiceDate: '2026-05-05',
 interval: 'hver_14_dag',
 totalPrice: 599,
 daysUntil: 2,
 completedCycles: 4,
 details: '80 m² lejlighed, 2 badeværelser',
 },
} satisfies TemplateEntry

export default SubscriptionReminderEmail
