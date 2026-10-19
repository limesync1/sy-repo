/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { Button } from '../email-button.tsx'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, LOGO_URL, main, wrapper, container, headerBar,
  h1, text, card, cardLabel, cardValue, buttonSection, footer, footerText,
} from './_styles.ts'

interface Row { label: string; value: string }
interface Props {
  subject?: string
  title?: string
  intro?: string
  rows?: Row[]
  list?: string[]
  ctaLabel?: string
  ctaUrl?: string
  businessName?: string
}

// Besked til virksomheden selv (ny bestilling, anmeldelse, abonnementsændring,
// morgendagens besøg). Indholdet bygges af business-owner-alerts.
const BusinessAlertEmail = ({ subject, title, intro, rows = [], list = [], ctaLabel, ctaUrl, businessName }: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{subject ?? title ?? 'Besked fra Serviceydere'}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
        </Section>
        <Container style={container}>
          <Heading style={h1}>{title ?? subject}</Heading>
          {intro && <Text style={text}>{intro}</Text>}
          {rows.length > 0 && (
            <Section style={card}>
              {rows.map((r, i) => (
                <React.Fragment key={i}>
                  <Text style={cardLabel}>{r.label}</Text>
                  <Text style={{ ...cardValue, marginBottom: i < rows.length - 1 ? '12px' : 0 }}>{r.value}</Text>
                </React.Fragment>
              ))}
            </Section>
          )}
          {list.length > 0 && (
            <Section style={card}>
              {list.map((l, i) => <Text key={i} style={{ ...text, margin: i ? '8px 0 0' : 0 }}>• {l}</Text>)}
            </Section>
          )}
          {ctaUrl && (
            <Section style={buttonSection}>
              <Button href={ctaUrl}>{ctaLabel ?? 'Åbn panelet'}</Button>
            </Section>
          )}
          <Text style={{ ...footerText, marginTop: '20px' }}>
            Priser er uden moms. I kan vælge, hvilke beskeder I får, under Indstillinger → Beskeder.
          </Text>
        </Container>
        <Section style={footer}>
          <Text style={footerText}>Sendt til {businessName ?? 'jer'} via {SITE_NAME}.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BusinessAlertEmail,
  subject: (d: Record<string, any>) => d?.subject ?? 'Besked fra Serviceydere',
  displayName: 'Besked til virksomheden',
  previewData: {
    subject: 'Ny bestilling fra Mette Hansen',
    title: 'Ny bestilling',
    intro: 'Mette Hansen har lige bestilt hos jer.',
    rows: [{ label: 'Services', value: 'Vinduespudsning · Hver 4. uge' }, { label: 'Beløb', value: '450 kr. uden moms' }],
    ctaLabel: 'Se bestillingen', ctaUrl: `${SITE_URL}/virksomhed?tab=aftaler`, businessName: 'Rengøring København',
  },
} satisfies TemplateEntry

export default BusinessAlertEmail
