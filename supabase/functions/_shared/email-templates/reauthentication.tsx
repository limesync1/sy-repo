/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
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
 codeBox,
 codeStyle,
 securityBox,
 securityTitle,
 securityText,
 footer,
 footerText,
} from './_styles.ts'

interface ReauthenticationEmailProps {
 token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>Din verifikationskode</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 <Img src={LOGO_URL} alt="Serviceydere" height="34" style={logo} />
 </Section>
 <Container style={container}>
 <Text style={eyebrow}>Sikkerhedstjek</Text>
 <Heading style={h1}>Bekræft at det er dig</Heading>
 <Text style={text}>Indtast koden herunder for at fortsætte. Koden virker kun i kort tid.</Text>

 <Section style={codeBox}>
 <Text style={codeStyle}>{token}</Text>
 </Section>

 <Section style={securityBox}>
 <Text style={securityTitle}>Har du ikke bedt om denne kode?</Text>
 <Text style={securityText}>Så kan du ignorere e-mailen. Ingen ændringer bliver gennemført uden, at koden bliver brugt.</Text>
 </Section>
 </Container>

 <Section style={footer}>
 <Text style={footerText}>Denne kode beskytter følsomme handlinger på din konto.</Text>
 </Section>
 </Container>
 </Body>
 </Html>
)

export default ReauthenticationEmail
