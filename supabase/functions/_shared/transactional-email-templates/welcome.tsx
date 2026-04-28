/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
 SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
 main, wrapper, container, headerBar,
 heroSection, heroTitle, heroSubtitle,
 h2, text, link,
 buttonSection, button, buttonSecondary,
 cardAccent,
 stepList, stepItem, stepNumber,
 helpBox, helpBoxTitle, helpBoxText,
 footer, footerText, footerLink,
} from './_styles.ts'

interface WelcomeProps {
 name?: string
 isBusinessOwner?: boolean
}

const WelcomeEmail = ({ name, isBusinessOwner = false }: WelcomeProps) => (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>Velkommen til {SITE_NAME} — kom hurtigt i gang</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
 </Section>

 <Container style={container}>
 <Section style={heroSection}>
 <Heading style={heroTitle}>Velkommen{name ?`, ${name}` : ''} </Heading>
 <Text style={heroSubtitle}>
 {isBusinessOwner
 ? 'Din konto er klar, og du kan nu oprette din virksomhed, services og modtage bestillinger.'
 : 'Din konto er klar, og du kan nu finde, sammenligne og bestille services i hele Danmark.'}
 </Text>
 </Section>

 <Text style={h2}>{isBusinessOwner ? 'Kom i gang som virksomhed' : 'Kom i gang'}</Text>
 <ol style={stepList}>
 {isBusinessOwner ? (
 <>
 <li style={stepItem}><span style={stepNumber}>1</span>Opret din virksomhedsprofil med logo, beskrivelse og kontaktoplysninger.</li>
 <li style={stepItem}><span style={stepNumber}>2</span>Tilføj services, priser og de intervaller, du vil tilbyde kunderne.</li>
 <li style={stepItem}><span style={stepNumber}>3</span>Modtag bestillinger, send tilbud og administrér driften fra dit panel.</li>
 </>
 ) : (
 <>
 <li style={stepItem}><span style={stepNumber}>1</span>Søg efter den service, du har brug for, og se relevante virksomheder nær dig.</li>
 <li style={stepItem}><span style={stepNumber}>2</span>Sammenlign priser, beskrivelser og anmeldelser, før du vælger.</li>
 <li style={stepItem}><span style={stepNumber}>3</span>Bestil på få trin og følg svar, ændringer og aftaler i dit kundepanel.</li>
 </>
 )}
 </ol>

 <Section style={buttonSection}>
 <Button style={button} href={isBusinessOwner ?`${SITE_URL}/admin` :`${SITE_URL}/search`}>
 {isBusinessOwner ? 'Åbn virksomhedspanelet' : 'Find en serviceyder'}
 </Button>
 <span style={{ display: 'inline-block', width: '10px' }} />
 <Button style={buttonSecondary} href={SITE_URL}>Gå til forsiden</Button>
 </Section>

 <Section style={cardAccent}>
 <Text style={{ ...text, fontWeight: 600, color: '#0d1729', margin: '0 0 6px' }}>
 Tip
 </Text>
 <Text style={{ ...text, fontSize: '13px', margin: 0, color: '#0e7490' }}>
 {isBusinessOwner
 ? 'En tydelig servicebeskrivelse og rigtige intervaller gør det lettere for kunderne at bestille med det samme.'
 : 'Du kan gemme favoritter, oprette faste aftaler og følge dine bestillinger ét sted.'}
 </Text>
 </Section>

 <Section style={helpBox}>
 <Text style={helpBoxTitle}>Har du brug for hjælp?</Text>
 <Text style={helpBoxText}>
 Skriv til os på <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link> — vi hjælper gerne videre.
 </Text>
 </Section>
 </Container>

 <Section style={footer}>
 <Text style={footerText}>
 <Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> ·{' '}
 <Link href={`${SITE_URL}/dashboard`} style={footerLink}>Mit kundepanel</Link> ·{' '}
 <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Kontakt</Link>
 </Text>
 <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}.</Text>
 </Section>
 </Container>
 </Body>
 </Html>
)

export const template = {
 component: WelcomeEmail,
 subject: (data) =>
 data.isBusinessOwner
 ?`Velkommen til ${SITE_NAME} — kom godt i gang som virksomhed`
 :`Velkommen til ${SITE_NAME}`,
 displayName: 'Velkomst-email',
 previewData: { name: 'Mette', isBusinessOwner: false },
} satisfies TemplateEntry

export default WelcomeEmail
