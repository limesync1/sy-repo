/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, LOGO_URL,
  main, wrapper, container, headerBar,
  heroSection, heroTitle, heroSubtitle,
  text, link,
  buttonSection, button,
  card, cardLabel, cardValue,
  footer, footerText, footerLink,
} from './_styles.ts'

interface NewChatMessageProps {
  visitorName?: string
  visitorEmail?: string
  subject?: string
  message?: string
  isLoggedIn?: boolean
  adminUrl?: string
}

const NewChatMessageEmail = ({
  visitorName,
  visitorEmail,
  subject,
  message,
  isLoggedIn = false,
  adminUrl = `${SITE_URL}/admin?tab=livechat`,
}: NewChatMessageProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>Ny livechat-besked fra {visitorName || 'en bruger'}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
        </Section>

        <Container style={container}>
          <Section style={heroSection}>
            <Heading style={heroTitle}>Ny livechat-besked</Heading>
            <Text style={heroSubtitle}>
              {isLoggedIn
                ? 'En logget-ind bruger har startet en samtale på Serviceydere.'
                : 'En besøgende har startet en samtale på Serviceydere.'}
            </Text>
          </Section>

          <Section style={card}>
            {visitorName && (<><Text style={cardLabel}>Navn</Text><Text style={cardValue}>{visitorName}</Text></>)}
            {visitorEmail && (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Email</Text>
                <Text style={cardValue}>
                  <Link href={`mailto:${visitorEmail}`} style={link}>{visitorEmail}</Link>
                </Text>
              </>
            )}
            {subject && (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Emne</Text>
                <Text style={cardValue}>{subject}</Text>
              </>
            )}
            {message && (
              <>
                <Text style={{ ...cardLabel, marginTop: '12px' }}>Første besked</Text>
                <Text style={{ ...text, margin: '4px 0 0', whiteSpace: 'pre-wrap' as const }}>{message}</Text>
              </>
            )}
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={adminUrl}>Åbn samtalen</Button>
          </Section>
        </Container>

        <Section style={footer}>
          <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link></Text>
          <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewChatMessageEmail,
  subject: (data) => `Ny livechat${data.subject ? `: ${data.subject}` : ''} fra ${data.visitorName || 'bruger'}`,
  displayName: 'Ny livechat-besked (admin)',
  previewData: {
    visitorName: 'Mette Hansen',
    visitorEmail: 'mette@example.dk',
    subject: 'Spørgsmål om priser',
    message: 'Hej, jeg vil høre om I tilbyder erhvervsrengøring i Aarhus?',
    isLoggedIn: false,
    adminUrl: 'https://serviceydere.dk/admin?tab=livechat',
  },
} satisfies TemplateEntry

export default NewChatMessageEmail