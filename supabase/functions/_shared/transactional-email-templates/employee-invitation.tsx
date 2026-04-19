/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
  main, wrapper, container, headerBar,
  h1, h2, text, link,
  buttonSection, button,
  cardAccent,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

interface EmployeeInvitationProps {
  employeeName?: string
  businessName?: string
  inviteUrl?: string
}

const EmployeeInvitationEmail = ({
  employeeName,
  businessName = 'en virksomhed',
  inviteUrl = SITE_URL,
}: EmployeeInvitationProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Du er inviteret som medarbejder hos {businessName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
        </Section>

        <Container style={container}>
          <Heading style={h1}>
            {employeeName ? `Hej ${employeeName} 👋` : 'Du er inviteret 👋'}
          </Heading>
          <Text style={text}>
            <strong>{businessName}</strong> har inviteret dig som medarbejder på{' '}
            <Link href={SITE_URL} style={link}>{SITE_NAME}</Link>. Du får adgang til din
            personlige medarbejder-app, hvor du kan se dine ruter for dagen,
            navigere til kunderne og markere besøg som udført.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={inviteUrl}>
              Acceptér invitation
            </Button>
          </Section>

          <Text style={h2}>Hvad sker der nu?</Text>
          <Text style={text}>
            Når du klikker på knappen, opretter du en konto med en adgangskode
            efter eget valg. Derefter kan du logge ind på{' '}
            <Link href={`${SITE_URL}/medarbejder`} style={link}>medarbejder-appen</Link>
            {' '}og se dine planlagte ruter.
          </Text>

          <Section style={cardAccent}>
            <Text style={{ ...text, fontWeight: 600, color: '#0d1729', margin: '0 0 6px' }}>
              ⏱️ Linket udløber om 7 dage
            </Text>
            <Text style={{ ...text, fontSize: '13px', margin: 0, color: '#0e7490' }}>
              Brug linket inden 7 dage. Hvis det udløber, kan din arbejdsgiver
              sende en ny invitation.
            </Text>
          </Section>

          <Section style={helpBox}>
            <Text style={helpBoxTitle}>Spørgsmål?</Text>
            <Text style={helpBoxText}>
              Skriv til os på{' '}
              <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>
              {' '}eller kontakt din arbejdsgiver direkte.
            </Text>
          </Section>
        </Container>

        <Section style={footer}>
          <Text style={footerText}>
            <Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> ·{' '}
            <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Kontakt</Link>
          </Text>
          <Text style={footerText}>
            © {new Date().getFullYear()} {SITE_NAME}.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EmployeeInvitationEmail,
  subject: (data) =>
    `Du er inviteret som medarbejder hos ${data.businessName || 'en virksomhed'}`,
  displayName: 'Medarbejder-invitation',
  previewData: {
    employeeName: 'Anders',
    businessName: 'Rengøring ApS',
    inviteUrl: 'https://serviceydere.dk/medarbejder/accepter?token=demo',
  },
} satisfies TemplateEntry

export default EmployeeInvitationEmail
