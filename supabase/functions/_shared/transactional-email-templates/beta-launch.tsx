/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
  main, wrapper, container, headerBar,
  heroSection, heroTitle, heroSubtitle,
  text, link,
  buttonSection, button, buttonSecondary,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

interface BetaLaunchProps {
  /** 'kunde' eller 'virksomhed' — bestemmer hvilken vej vi peger på. */
  audience?: string
}

const BetaLaunchEmail = ({ audience = 'kunde' }: BetaLaunchProps) => {
  const isBusiness = audience === 'virksomhed'
  return (
    <Html lang="da" dir="ltr">
      <Head />
      <Preview>{SITE_NAME} er åbnet — du kan gå i gang nu</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={headerBar}>
            <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
          </Section>

          <Container style={container}>
            <Section style={heroSection}>
              <Heading style={heroTitle}>Vi er åbnet</Heading>
              <Text style={heroSubtitle}>
                Du skrev dig op, mens vi var i testfase. Nu er {SITE_NAME} åben for alle — og det er din tur.
              </Text>
            </Section>

            <Text style={text}>
              {isBusiness
                ? 'Du kan oprette din virksomhed, lægge services og priser ind og begynde at tage imod bestillinger. Første 14 dage er gratis, og vi hjælper gerne med at flytte jeres nuværende kunder og aftaler ind.'
                : 'Du kan nu finde og sammenligne lokale serviceydere, læse anmeldelser og få op til 3 gratis tilbud på din opgave. Det koster ikke noget, og du taler direkte med virksomhederne.'}
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={isBusiness ? `${SITE_URL}/opret-virksomhed` : `${SITE_URL}/tilbud`}>
                {isBusiness ? 'Opret din virksomhed' : 'Få 3 gratis tilbud'}
              </Button>
              <span style={{ display: 'inline-block', width: '10px' }} />
              <Button style={buttonSecondary} href={isBusiness ? `${SITE_URL}/software` : `${SITE_URL}/virksomheder`}>
                {isBusiness ? 'Se hvad systemet kan' : 'Find virksomheder'}
              </Button>
            </Section>

            <Section style={helpBox}>
              <Text style={helpBoxTitle}>Spørgsmål?</Text>
              <Text style={helpBoxText}>
                Skriv til os på <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link> — vi svarer på hverdage.
              </Text>
            </Section>
          </Container>

          <Section style={footer}>
            <Text style={footerText}>
              Du får denne mail, fordi du bad om besked, når {SITE_NAME} åbnede.
            </Text>
            <Text style={footerText}>
              <Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> ·{' '}
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Kontakt</Link>
            </Text>
            <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BetaLaunchEmail,
  subject: `${SITE_NAME} er åbnet — du kan gå i gang nu`,
  displayName: 'Vi er åbnet (venteliste)',
  previewData: { audience: 'kunde' },
} satisfies TemplateEntry

export default BetaLaunchEmail
