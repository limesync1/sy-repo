/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
  main, wrapper, container, headerBar, headerSiteName,
  h1, h2, text, link,
  buttonSection, button, buttonSecondary,
  card, cardAccent,
  stepList, stepItem, stepNumber,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink, divider,
} from './_styles.ts'

interface WelcomeProps {
  name?: string
  isBusinessOwner?: boolean
}

const WelcomeEmail = ({ name, isBusinessOwner = false }: WelcomeProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>
      Velkommen til {SITE_NAME} — find pålidelige serviceydere i hele Danmark
    </Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="28" />
        </Section>

        <Container style={container}>
          <Heading style={h1}>
            Velkommen{name ? `, ${name}` : ''} 👋
          </Heading>
          <Text style={text}>
            Tak fordi du oprettede en konto på{' '}
            <Link href={SITE_URL} style={link}>{SITE_NAME}</Link>. Vi er Danmarks samlede
            sted til at finde, sammenligne og bestille services — fra rengøring og vinduespudsning
            til VVS, havearbejde og meget mere.
          </Text>

          {isBusinessOwner ? (
            <>
              <Text style={h2}>Sådan kommer du i gang som virksomhed</Text>
              <ol style={stepList}>
                <li style={stepItem}>
                  <span style={stepNumber}>1</span>
                  Opret din virksomhedsprofil med logo, beskrivelse og kontaktinfo.
                </li>
                <li style={stepItem}>
                  <span style={stepNumber}>2</span>
                  Tilføj dine services og priser — fast pris, timepris eller beregner.
                </li>
                <li style={stepItem}>
                  <span style={stepNumber}>3</span>
                  Modtag bestillinger direkte i dit adminpanel og send tilbud.
                </li>
              </ol>
              <Section style={buttonSection}>
                <Button style={button} href={`${SITE_URL}/admin`}>
                  Gå til adminpanelet
                </Button>
              </Section>
            </>
          ) : (
            <>
              <Text style={h2}>Sådan kommer du i gang</Text>
              <ol style={stepList}>
                <li style={stepItem}>
                  <span style={stepNumber}>1</span>
                  Søg efter den service, du har brug for — fx "rengøring København".
                </li>
                <li style={stepItem}>
                  <span style={stepNumber}>2</span>
                  Sammenlign virksomheder, læs anmeldelser og se priser.
                </li>
                <li style={stepItem}>
                  <span style={stepNumber}>3</span>
                  Bestil med få klik — virksomheden bekræfter eller justerer din ordre.
                </li>
              </ol>
              <Section style={buttonSection}>
                <Button style={button} href={`${SITE_URL}/search`}>
                  Find en serviceyder
                </Button>
              </Section>
            </>
          )}

          <Section style={cardAccent}>
            <Text style={{ ...text, fontWeight: 600, color: '#0d1729', margin: '0 0 6px' }}>
              💡 Tip: Tilbagevendende services
            </Text>
            <Text style={{ ...text, fontSize: '13px', margin: 0, color: '#0e7490' }}>
              Du kan oprette faste aftaler — fx ugentlig rengøring eller månedlig vinduespudsning.
              Næste service planlægges automatisk, og du kan altid pause eller annullere fra dit kundepanel.
            </Text>
          </Section>

          <Section style={helpBox}>
            <Text style={helpBoxTitle}>Har du brug for hjælp?</Text>
            <Text style={helpBoxText}>
              Skriv til os på{' '}
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>
              {' '}— vi svarer normalt inden for få timer.
            </Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Text style={footerText}>
            <Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> ·{' '}
            <Link href={`${SITE_URL}/dashboard`} style={footerLink}>Mit kundepanel</Link> ·{' '}
            <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Kontakt</Link>
          </Text>
          <Text style={footerText}>
            © {new Date().getFullYear()} {SITE_NAME}. Danmarks platform for serviceydere.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: (data) =>
    data.isBusinessOwner
      ? `Velkommen til ${SITE_NAME} — kom godt i gang som virksomhed`
      : `Velkommen til ${SITE_NAME} 🎉`,
  displayName: 'Velkomst-email',
  previewData: { name: 'Mette', isBusinessOwner: false },
} satisfies TemplateEntry

export default WelcomeEmail
