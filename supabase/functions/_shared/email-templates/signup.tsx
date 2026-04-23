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
  footerLink,
} from './_styles.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Bekræft din e-mail hos {siteName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={siteName} height="34" style={logo} />
        </Section>
        <Container style={container}>
          <Text style={eyebrow}>Kontooprettelse</Text>
          <Heading style={h1}>Bekræft din e-mail</Heading>
          <Text style={text}>
            Tak fordi du oprettede en konto på <Link href={siteUrl} style={link}>{siteName}</Link>.
            Bekræft din e-mailadresse for at aktivere kontoen og komme videre.
          </Text>

          <Section style={infoCard}>
            <Text style={infoLabel}>E-mailadresse</Text>
            <Text style={infoValue}>{recipient}</Text>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl}>Bekræft min e-mail</Button>
          </Section>

          <Section style={linkCard}>
            <Text style={linkCardText}>Hvis knappen ikke virker, så kopier dette link ind i din browser:</Text>
            <Link href={confirmationUrl} style={smallLink}>{confirmationUrl}</Link>
          </Section>

          <Section style={securityBox}>
            <Text style={securityTitle}>Har du ikke oprettet kontoen?</Text>
            <Text style={securityText}>Så kan du roligt ignorere denne e-mail. Din konto bliver ikke aktiveret uden bekræftelsen.</Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Text style={footerText}>
            <Link href={siteUrl} style={footerLink}>{siteName}</Link>
          </Text>
          <Text style={footerText}>Denne e-mail blev sendt, fordi der blev oprettet en konto med denne adresse.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
