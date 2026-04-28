/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
 SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
 main, wrapper, container, headerBar,
 heroSection, heroTitle, heroSubtitle,
 link,
 buttonSection, button,
 helpBox, helpBoxTitle, helpBoxText,
 footer, footerText, footerLink,
} from './_styles.ts'

interface Props {
 employeeName?: string
 businessName?: string
 businessLogoUrl?: string | null
 resetUrl?: string
}

const EmployeePasswordResetEmail = ({ employeeName = 'der', businessName = SITE_NAME, businessLogoUrl, resetUrl = SITE_URL }: Props) => (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>Nulstil din adgangskode til {businessName}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 {businessLogoUrl ? <Img src={businessLogoUrl} alt={businessName} height="36" style={{ maxHeight: 36 }} /> : <Img src={LOGO_URL} alt={SITE_NAME} height="32" style={{ maxHeight: 32 }} />}
</Section>
 <Container style={container}>
 <Section style={heroSection}>
 <Heading style={heroTitle}>Nulstil din adgangskode</Heading>
 <Text style={heroSubtitle}>Hej {employeeName}. Din arbejdsgiver hos {businessName} har anmodet om en nulstilling af din adgangskode til medarbejder-appen.</Text>
</Section>

 <Section style={buttonSection}><Button href={resetUrl} style={button}>Vælg ny adgangskode</Button></Section>

 <Section style={helpBox}>
 <Text style={helpBoxTitle}>Var det ikke dig?</Text>
 <Text style={helpBoxText}>Hvis du ikke forventede denne e-mail, kan du roligt ignorere den. Din nuværende adgangskode virker stadig, indtil du vælger en ny.</Text>
</Section>
 </Container>
 <Section style={footer}>
 <Text style={footerText}>Brug for hjælp? Kontakt os på <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link></Text>
 <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link></Text>
</Section>
 </Container>
 </Body>
 </Html>
)

export const template = {
 component: EmployeePasswordResetEmail,
 subject: (data: Record<string, any>) =>`Nulstil din adgangskode${data?.businessName ? ` til ${data.businessName}` : ''}`,
 displayName: 'Medarbejder · Nulstil adgangskode',
 previewData: { employeeName: 'Anders', businessName: 'Demo Rengøring', resetUrl: 'https://example.com/reset' },
} satisfies TemplateEntry

export default EmployeePasswordResetEmail
