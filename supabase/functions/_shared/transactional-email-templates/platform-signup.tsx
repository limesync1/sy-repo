import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { Button } from '../email-button.tsx'
import { PLATFORM_SIGNUP_RECIPIENT } from '../platform-signup-alert.ts'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL, main, wrapper, container, headerBar, h1, text, card, cardLabel, cardValue, buttonSection, footer, footerText } from './_styles.ts'

interface Props { title?: string; intro?: string; subject?: string; rows?: { label: string; value: string }[]; ctaUrl?: string; ctaLabel?: string }
const PlatformSignupEmail = ({ title = 'Ny tilmelding på Serviceydere', intro, subject, rows = [], ctaUrl, ctaLabel }: Props) => (
  <Html lang="da" dir="ltr">
    <Head /><Preview>{subject || title}</Preview>
    <Body style={{ ...main, backgroundColor: '#ffffff' }}>
      <Container style={wrapper}>
        <Section style={headerBar}><Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} /></Section>
        <Container style={container}>
          <Heading style={h1}>{title}</Heading>
          <Text style={text}>Hej William,</Text>
          {intro && <Text style={text}>{intro}</Text>}
          <Section style={card}>{rows.map((row, i) => <React.Fragment key={i}><Text style={cardLabel}>{row.label}</Text><Text style={cardValue}>{row.value}</Text></React.Fragment>)}</Section>
          {ctaUrl && <Section style={buttonSection}><Button href={ctaUrl}>{ctaLabel || 'Åbn administrationen'}</Button></Section>}
        </Container>
        <Section style={footer}><Text style={footerText}>Automatisk besked til ejeren af {SITE_NAME} om denne tilmelding.</Text></Section>
      </Container>
    </Body>
  </Html>
)
export const template = {
  component: PlatformSignupEmail,
  subject: (data: Record<string, any>) => data.subject || 'Ny tilmelding på Serviceydere',
  to: PLATFORM_SIGNUP_RECIPIENT,
  displayName: 'Ny virksomhed eller ventelistetilmelding',
  previewData: { title: 'Ny virksomhed på Serviceydere', intro: 'En ny virksomhed er blevet oprettet på serviceydere.dk.', rows: [{ label: 'Virksomhed', value: 'Eksempelvirksomhed' }], ctaUrl: 'https://serviceydere.dk/admin', ctaLabel: 'Se virksomheder' },
} satisfies TemplateEntry