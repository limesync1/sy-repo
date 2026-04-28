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

interface MagicLinkEmailProps {
 siteName: string
 confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>Dit login-link til {siteName}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 <Img src={LOGO_URL} alt={siteName} height="34" style={logo} />
 </Section>
 <Container style={container}>
 <Text style={eyebrow}>Sikker login</Text>
 <Heading style={h1}>Log ind med ét klik</Heading>
 <Text style={text}>
 Brug knappen herunder for at logge sikkert ind på {siteName}. Linket virker kun i kort tid af hensyn til sikkerheden.
 </Text>

 <Section style={buttonSection}>
 <Button style={button} href={confirmationUrl}>Log ind nu</Button>
 </Section>

 <Section style={linkCard}>
 <Text style={linkCardText}>Hvis knappen ikke virker, så indsæt dette link i din browser:</Text>
 <Link href={confirmationUrl} style={smallLink}>{confirmationUrl}</Link>
 </Section>

 <Section style={securityBox}>
 <Text style={securityTitle}>Kender du ikke denne anmodning?</Text>
 <Text style={securityText}>Så behøver du ikke gøre noget. Ingen kan logge ind uden at åbne linket i denne e-mail.</Text>
 </Section>
 </Container>

 <Section style={footer}>
 <Text style={footerText}>Login-linket blev sendt, fordi nogen forsøgte at logge ind med denne e-mailadresse.</Text>
 </Section>
 </Container>
 </Body>
 </Html>
)

export default MagicLinkEmail
