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
 badge,
} from './_styles.ts'

interface NewLeadProps {
 businessName?: string
 ownerName?: string
 customerName?: string
 customerCity?: string
 customerZip?: string
 category?: string
 description?: string
 matchScore?: number
 reason?: string
 estimatedPrice?: string
 distanceKm?: number | null
 shareContact?: boolean
 customerEmail?: string
 customerPhone?: string
 leadsUrl?: string
}

const NewLeadEmail = ({
 businessName,
 ownerName,
 customerName,
 customerCity,
 customerZip,
 category,
 description,
 matchScore,
 reason,
 estimatedPrice,
 distanceKm,
 shareContact = true,
 customerEmail,
 customerPhone,
 leadsUrl =`${SITE_URL}/virksomhed?tab=leads`,
}: NewLeadProps) => {
 const greet = ownerName ?`, ${ownerName}` : (businessName ?`, ${businessName}` : '')
 const locLabel = [customerZip, customerCity].filter(Boolean).join(' ').trim() || 'Danmark'
 const distanceLabel = typeof distanceKm === 'number'
 ? (distanceKm < 1 ? '<1 km væk' :`~${Math.round(distanceKm)} km væk`)
 : null

 return (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>Nyt lead{category ?` på ${category}` : ''} — kunden er {locLabel}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
 </Section>

 <Container style={container}>
 <Section style={heroSection}>
 <Heading style={heroTitle}>Du har et nyt lead{category ?` på ${category}` : ''} </Heading>
 <Text style={heroSubtitle}>
 Hej{greet}. En kunde har bedt om tilbud via Serviceydere, og vores AI har valgt jer som et af de bedste matches.
 </Text>
 </Section>

 <Section style={{ margin: '0 0 14px' }}>
 {typeof matchScore === 'number' && (
 <span style={badge('#065f46', '#d1fae5')}>Match-score {matchScore}/100</span>
 )}
 {distanceLabel && (
 <span style={{ ...badge('#1e3a8a', '#dbeafe'), marginLeft: '6px' }}>{distanceLabel}</span>
 )}
 </Section>

 <Section style={card}>
 {category && (<><Text style={cardLabel}>Kategori</Text><Text style={cardValue}>{category}</Text></>)}
 <Text style={cardLabel}>Lokation</Text>
 <Text style={cardValue}> {locLabel}</Text>
 {description && (
 <>
 <Text style={{ ...cardLabel, marginTop: '12px' }}>Kundens beskrivelse</Text>
 <Text style={{ ...text, margin: '4px 0 0', whiteSpace: 'pre-wrap' as const }}>{description}</Text>
 </>
 )}
 {estimatedPrice && (
 <>
 <Text style={{ ...cardLabel, marginTop: '12px' }}>Estimeret pris</Text>
 <Text style={cardValue}>{estimatedPrice}</Text>
 </>
 )}
 {reason && (
 <>
 <Text style={{ ...cardLabel, marginTop: '12px' }}>Hvorfor netop jer</Text>
 <Text style={{ ...text, margin: '4px 0 0', fontStyle: 'italic' }}>"{reason}"</Text>
 </>
 )}
 </Section>

 {shareContact && (customerName || customerEmail || customerPhone) && (
 <Section style={{ ...card, borderLeft: '4px solid #11c4ce' }}>
 <Text style={cardLabel}>Kontakt kunden direkte</Text>
 {customerName && <Text style={cardValue}>{customerName}</Text>}
 {customerEmail && (
 <Text style={{ ...text, margin: '2px 0 0' }}>
 <Link href={`mailto:${customerEmail}`} style={link}>{customerEmail}</Link>
 </Text>
 )}
 {customerPhone && (
 <Text style={{ ...text, margin: '2px 0 0' }}>
 <Link href={`tel:${customerPhone}`} style={link}>{customerPhone}</Link>
 </Text>
 )}
 </Section>
 )}

 <Section style={buttonSection}>
 <Button style={button} href={leadsUrl}>Åbn lead i dit panel</Button>
 <Text style={{ ...text, fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
 Tip: vær hurtig — kunden modtager også svar fra op til 2 andre virksomheder.
 </Text>
 </Section>

 <Section style={helpBox}>
 <Text style={helpBoxTitle}>Sådan fungerer leads</Text>
 <Text style={helpBoxText}>
 Hvert lead matches med op til 3 virksomheder. Markér leadet som "Kontaktet" eller "Vundet" i panelet, så hjælper vi jer med at holde styr på det.
 Spørgsmål? Skriv til <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>.
 </Text>
 </Section>
 </Container>

 <Section style={footer}>
 <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link></Text>
 <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}. Du modtager denne mail fordi din virksomhed er aktiv på Serviceydere.</Text>
 </Section>
 </Container>
 </Body>
 </Html>
 )
}

export const template = {
 component: NewLeadEmail,
 subject: (data) =>`Nyt lead${data.category ?` på ${data.category}` : ''}${data.customerCity ?` i ${data.customerCity}` : ''}`,
 displayName: 'Nyt lead — virksomhed',
 previewData: {
 businessName: 'Ready2Clean',
 ownerName: 'Anna',
 customerName: 'Mette Hansen',
 customerCity: 'København NV',
 customerZip: '2400',
 category: 'Rengøring',
 description: 'Rengøring af 3-værelses lejlighed på 85 m², hver 14. dag.',
 matchScore: 92,
 reason: 'I har høj rating på privatrengøring i København og passer til kundens ønskede frekvens.',
 estimatedPrice: '750 – 950 kr / besøg',
 distanceKm: 2.4,
 shareContact: true,
 customerEmail: 'mette@example.dk',
 customerPhone: '+45 22 33 44 55',
 leadsUrl: 'https://serviceydere.dk/virksomhed?tab=leads',
 },
} satisfies TemplateEntry

export default NewLeadEmail
