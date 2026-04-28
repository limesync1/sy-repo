/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import {
 LOGO_URL,
 main,
 wrapper,
 headerBar,
 container,
 logo,
 eyebrow,
 h1,
 text,
 buttonSection,
 button,
 linkCard,
 linkCardText,
 smallLink,
 link,
 securityBox,
 securityTitle,
 securityText,
 footer,
 footerText,
} from './_styles.ts'

interface InviteEmailProps {
 siteName: string
 siteUrl: string
 confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>Du er inviteret til {siteName}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 <Img src={LOGO_URL} alt={siteName} height="34" style={logo} />
 </Section>
 <Container style={container}>
 <Text style={eyebrow}>Invitation</Text>
 <Heading style={h1}>Du er inviteret</Heading>
 <Text style={text}>
 Du er blevet inviteret til at deltage på <Link href={siteUrl} style={link}>{siteName}</Link>.
 Accepter invitationen for at oprette din konto og få adgang.
 </Text>

 <Section style={buttonSection}>
 <Button style={button} href={confirmationUrl}>Acceptér invitation</Button>
 </Section>

 <Section style={linkCard}>
 <Text style={linkCardText}>Hvis knappen ikke virker, så brug dette link i din browser:</Text>
 <Link href={confirmationUrl} style={smallLink}>{confirmationUrl}</Link>
 </Section>

 <Section style={securityBox}>
 <Text style={securityTitle}>Forventede du ikke invitationen?</Text>
 <Text style={securityText}>Så kan du ignorere e-mailen. Kontoen bliver først oprettet, når invitationen accepteres.</Text>
 </Section>
 </Container>

 <Section style={footer}>
 <Text style={footerText}>Invitationen blev sendt til denne adresse for at give dig adgang til {siteName}.</Text>
 </Section>
 </Container>
 </Body>
 </Html>
)

export default InviteEmail
