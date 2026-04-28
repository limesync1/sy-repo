/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
 SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
 main, wrapper, container, headerBar,
 heroSection, heroTitle, heroSubtitle,
 text, link,
 buttonSection, button,
 card, cardLabel, cardValue,
 helpBox, helpBoxTitle, helpBoxText,
 footer, footerText, footerLink,
} from './_styles.ts'

interface RouteAssignedProps {
 employeeName?: string
 businessName?: string
 routeDate?: string
 stopCount?: number
 totalKm?: number
 totalDurationMinutes?: number
 plannedStartTime?: string
 firstStopName?: string
 firstStopAddress?: string
 appUrl?: string
}

const stat: React.CSSProperties = {
 display: 'inline-block',
 backgroundColor: '#f8fafc',
 border: '1px solid #e2e8f0',
 borderRadius: '999px',
 padding: '8px 12px',
 marginRight: '8px',
 marginBottom: '8px',
 fontSize: '13px',
 color: '#0d1729',
}

const RouteAssignedEmail = ({
 employeeName,
 businessName = 'din virksomhed',
 routeDate = 'i morgen',
 stopCount = 0,
 totalKm,
 totalDurationMinutes,
 plannedStartTime = '08:00',
 firstStopName,
 firstStopAddress,
 appUrl =`${SITE_URL}/medarbejder`,
}: RouteAssignedProps) => {
 const hours = totalDurationMinutes != null ? Math.floor(totalDurationMinutes / 60) : null
 const mins = totalDurationMinutes != null ? totalDurationMinutes % 60 : null

 return (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>{`Din rute for ${routeDate} er klar — ${stopCount} stop`}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
 </Section>

 <Container style={container}>
 <Section style={heroSection}>
 <Heading style={heroTitle}>{employeeName ?`Hej ${employeeName}` : 'Din rute er klar'} </Heading>
 <Text style={heroSubtitle}>
 {businessName} har planlagt din rute for <strong>{routeDate}</strong>. Du kan nu åbne medarbejder-appen og følge dagens stop.
 </Text>
 </Section>

 <Section style={{ margin: '0 0 10px' }}>
 <span style={stat}><strong>{stopCount}</strong> stop</span>
 {totalKm != null && totalKm > 0 && <span style={stat}><strong>{totalKm.toFixed(1)}</strong> km</span>}
 {hours != null && <span style={stat}>⏱ <strong>{hours}t {mins}m</strong></span>}
 </Section>

 <Section style={card}>
 <Text style={cardLabel}>Planlagt start</Text>
 <Text style={cardValue}>{plannedStartTime}</Text>

 {firstStopName && (
 <>
 <Text style={cardLabel}>Første stop</Text>
 <Text style={cardValue}>
 {firstStopName}
 {firstStopAddress && <><br /><span style={{ fontWeight: 400, color: '#64748b', fontSize: 13 }}>{firstStopAddress}</span></>}
 </Text>
 </>
 )}
 </Section>

 <Section style={buttonSection}>
 <Button style={button} href={appUrl}>Åbn medarbejder-appen</Button>
 </Section>

 <Section style={helpBox}>
 <Text style={helpBoxTitle}>Spørgsmål til ruten?</Text>
 <Text style={helpBoxText}>
 Kontakt {businessName} direkte — eller skriv til os på <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>.
 </Text>
 </Section>
 </Container>

 <Section style={footer}>
 <Text style={footerText}>
 <Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> · <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Kontakt</Link>
 </Text>
 <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}.</Text>
 </Section>
 </Container>
 </Body>
 </Html>
 )
}

export const template = {
 component: RouteAssignedEmail,
 subject: (data) =>`Din rute er klar — ${data.routeDate || 'i morgen'} (${data.stopCount || 0} stop)`,
 displayName: 'Rute tildelt til medarbejder',
 previewData: {
 employeeName: 'Anders',
 businessName: 'Ready2Clean',
 routeDate: 'tirsdag d. 23. april 2026',
 stopCount: 6,
 totalKm: 42.5,
 totalDurationMinutes: 285,
 plannedStartTime: '08:00',
 firstStopName: 'Mette Larsen',
 firstStopAddress: 'Vestergade 15, 8600 Silkeborg',
 appUrl: 'https://serviceydere.dk/medarbejder',
 },
} satisfies TemplateEntry

export default RouteAssignedEmail
