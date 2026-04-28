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
 securityBox,
 securityTitle,
 securityText,
 footer,
 footerText,
} from './_styles.ts'

interface RecoveryEmailProps {
 siteName: string
 confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>Nulstil din adgangskode hos {siteName}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 <Img src={LOGO_URL} alt={siteName} height="34" style={logo} />
 </Section>
 <Container style={container}>
 <Text style={eyebrow}>Adgangskode</Text>
 <Heading style={h1}>Vælg en ny adgangskode</Heading>
 <Text style={text}>
 Vi har modtaget en anmodning om at nulstille adgangskoden til din {siteName}-konto.
 Brug knappen herunder for at fortsætte sikkert.
 </Text>

 <Section style={buttonSection}>
 <Button style={button} href={confirmationUrl}>Nulstil adgangskode</Button>
 </Section>

 <Section style={linkCard}>
 <Text style={linkCardText}>Hvis knappen ikke virker, så kopier dette link ind i din browser:</Text>
 <Link href={confirmationUrl} style={smallLink}>{confirmationUrl}</Link>
 </Section>

 <Section style={securityBox}>
 <Text style={securityTitle}>Har du ikke bedt om dette?</Text>
 <Text style={securityText}>Så kan du ignorere e-mailen. Din nuværende adgangskode ændres ikke, før du aktivt vælger en ny.</Text>
 </Section>
 </Container>

 <Section style={footer}>
 <Text style={footerText}>Af sikkerhedsmæssige årsager udløber linket automatisk efter kort tid.</Text>
 </Section>
 </Container>
 </Body>
 </Html>
)

export default RecoveryEmail
