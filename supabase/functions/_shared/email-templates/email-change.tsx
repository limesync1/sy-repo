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
  infoCard,
  infoLabel,
  infoValue,
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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Bekræft skift af e-mail hos {siteName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={siteName} height="34" style={logo} />
        </Section>
        <Container style={container}>
          <Text style={eyebrow}>Kontoændring</Text>
          <Heading style={h1}>Bekræft din nye e-mail</Heading>
          <Text style={text}>
            Du har bedt om at ændre e-mailadressen på din {siteName}-konto. Bekræft ændringen for at skifte login fra den gamle til den nye adresse.
          </Text>

          <Section style={infoCard}>
            <Text style={infoLabel}>Fra</Text>
            <Text style={infoValue}>{email}</Text>
            <Text style={{ ...infoLabel, marginTop: '14px' }}>Til</Text>
            <Text style={infoValue}>{newEmail}</Text>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl}>Bekræft ny e-mail</Button>
          </Section>

          <Section style={linkCard}>
            <Text style={linkCardText}>Virker knappen ikke? Brug dette link i din browser:</Text>
            <Link href={confirmationUrl} style={smallLink}>{confirmationUrl}</Link>
          </Section>

          <Section style={securityBox}>
            <Text style={securityTitle}>Var det ikke dig?</Text>
            <Text style={securityText}>Så bør du sikre din konto med det samme. Den nuværende e-mail bliver ikke ændret uden din bekræftelse.</Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Text style={footerText}>Af sikkerhedshensyn skal nye e-mailadresser altid bekræftes, før ændringen træder i kraft.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
