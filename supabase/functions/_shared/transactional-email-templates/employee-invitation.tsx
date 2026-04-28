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
 card, cardAccent,
 cardLabel, cardValue,
 helpBox, helpBoxTitle, helpBoxText,
 footer, footerText, footerLink,
} from './_styles.ts'

interface EmployeeWelcomeProps {
 employeeName?: string
 businessName?: string
 businessLogoUrl?: string | null
 email?: string
 password?: string | null
 accountAlreadyExisted?: boolean
 loginUrl?: string
}

const businessCard: React.CSSProperties = {
 backgroundColor: '#ffffff',
 border: '1px solid #e2e8f0',
 borderRadius: '12px',
 padding: '14px 16px',
 margin: '14px 0 22px',
}

const EmployeeWelcomeEmail = ({ employeeName, businessName = 'en virksomhed', businessLogoUrl, email, password, accountAlreadyExisted, loginUrl =`${SITE_URL}/log-ind` }: EmployeeWelcomeProps) => (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>Du er tilføjet som medarbejder hos {businessName}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}><Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} /></Section>
 <Container style={container}>
 <Section style={heroSection}>
 <Heading style={heroTitle}>{employeeName ? `Velkommen, ${employeeName}` : 'Velkommen'}</Heading>
 <Text style={heroSubtitle}>Du er blevet tilføjet som medarbejder hos {businessName} og kan nu bruge medarbejder-appen til at se ruter og opgaver.</Text>
</Section>

 <Section style={businessCard}>
 {businessLogoUrl ? <Img src={businessLogoUrl} alt={businessName} width="48" height="48" style={{ borderRadius: '10px', objectFit: 'cover', display: 'block', marginBottom: '10px' }} /> : null}
 <Text style={cardLabel}>Virksomhed</Text>
 <Text style={cardValue}>{businessName}</Text>
</Section>

 <Text style={text}>
 {accountAlreadyExisted
 ? `Du har allerede en konto hos ${SITE_NAME}, så du kan logge ind med dine eksisterende oplysninger.`
 : `Vi har oprettet en konto til dig. Brug oplysningerne herunder første gang du logger ind.`}</Text>

 <Section style={card}>
 <Text style={cardLabel}>E-mail</Text>
 <Text style={cardValue}>{email}</Text>
 {password && <><Text style={cardLabel}>Adgangskode</Text><Text style={{ ...cardValue, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{password}</Text></>}
</Section>

 {password && (
 <Section style={cardAccent}>
 <Text style={{ ...text, fontWeight: 600, color: '#0d1729', margin: '0 0 6px' }}> Sikkerhed</Text>
 <Text style={{ ...text, fontSize: '13px', margin: 0, color: '#0e7490' }}>Vi anbefaler, at du ændrer adgangskoden første gang du logger ind.</Text>
</Section>
 )}

 <Section style={buttonSection}><Button style={button} href={loginUrl}>Log ind på medarbejder-app</Button></Section>

 <Section style={helpBox}>
 <Text style={helpBoxTitle}>Spørgsmål?</Text>
 <Text style={helpBoxText}>Skriv til os på <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link> eller kontakt {businessName} direkte.</Text>
</Section>
 </Container>

 <Section style={footer}>
 <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> · <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Kontakt</Link></Text>
 <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}.</Text>
</Section>
 </Container>
 </Body>
 </Html>
)

export const template = {
 component: EmployeeWelcomeEmail,
 subject: (data) =>`Du er tilføjet som medarbejder hos ${data.businessName || 'en virksomhed'}`,
 displayName: 'Medarbejder velkomst',
 previewData: {
 employeeName: 'Anders',
 businessName: 'Rengøring ApS',
 businessLogoUrl: null,
 email: 'anders@example.dk',
 password: 'Kx7mPq2nRt9w',
 accountAlreadyExisted: false,
 loginUrl: 'https://serviceydere.dk/log-ind',
 },
} satisfies TemplateEntry

export default EmployeeWelcomeEmail
