/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
  main, wrapper, container, headerBar,
  heroSection, heroTitle, heroSubtitle,
  text, link,
  buttonSection, button,
  card, cardLabel, cardValue,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

interface NewLeadProps {
  businessName?: string
  ownerName?: string
  customerName?: string
  customerCity?: string
  customerZip?: string
  category?: string
  description?: string
  matchScore?: number
  reason?: string
  estimatedPrice?: string
  distanceKm?: number | null
  shareContact?: boolean
  customerEmail?: string
  customerPhone?: string
  leadsUrl?: string
}

const NewLeadEmail = ({
  businessName,
  ownerName,
  customerName,
  customerCity,
  customerZip,
  category,
  description,
  matchScore,
  reason,
  estimatedPrice,
  distanceKm,
  shareContact = true,
  customerEmail,
  customerPhone,
  leadsUrl = `${SITE_URL}/virksomhed?tab=leads`,
}: NewLeadProps) => {
  const greet = ownerName ? `, ${ownerName}` : (businessName ? `, ${businessName}` : '')
  const locLabel = [customerZip, customerCity].filter(Boolean).join(' ').trim() || 'Danmark'
  const distanceLabel = typeof distanceKm === 'number'
    ? (distanceKm < 1 ? '<1 km væk' : `~${Math.round(distanceKm)} km væk`)
    : null

  return (
    <Html lang="da" dir="ltr">
      <Head>
        {/* Responsive justeringer — virker i klienter med @media-support
            (Apple Mail, iOS Mail, Gmail web, mange Outlook-versioner).
            Klienter uden support falder pænt tilbage til inline styles. */}
        <style>{`
          @media only screen and (max-width: 480px) {
            .sy-body { padding: 16px 0 !important; }
            .sy-wrapper { padding: 0 16px !important; max-width: 100% !important; }
            .sy-hero-title { font-size: 22px !important; line-height: 1.25 !important; }
            .sy-hero-sub { font-size: 14px !important; }
            .sy-card { padding: 14px !important; }
            .sy-btn { display: block !important; width: 100% !important; text-align: center !important; padding: 14px 18px !important; font-size: 15px !important; box-sizing: border-box !important; }
            .sy-score-num { font-size: 28px !important; }
            .sy-score-cell { width: 72px !important; padding-right: 12px !important; }
          }
        `}</style>
      </Head>
      <Preview>Nyt lead{category ? ` på ${category}` : ''} — kunden er i {locLabel}</Preview>
      <Body style={main} className="sy-body">
        <Container style={wrapper} className="sy-wrapper">
          <Section style={headerBar}>
            <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
          </Section>

          <Container style={container}>
            <Section style={heroSection}>
              <Heading style={heroTitle} className="sy-hero-title">
                Nyt lead{category ? ` på ${category}` : ''}
              </Heading>
              <Text style={heroSubtitle} className="sy-hero-sub">
                Hej{greet}. En kunde har bedt om tilbud via Serviceydere, og vores AI har valgt jer som et af de bedste matches.
              </Text>
            </Section>

            {/* Hero-strip: match-score som primær visuel anker + kontekst-badges.
                Vi bruger en <table> så layoutet holder i Outlook også. */}
            {(typeof matchScore === 'number' || distanceLabel || category) && (
              <Section style={scoreStrip} className="sy-card">
                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
                  <tr>
                    {typeof matchScore === 'number' && (
                      <td style={scoreCell} className="sy-score-cell">
                        <div style={scoreNum} className="sy-score-num">{matchScore}</div>
                        <div style={scoreLabel}>Match-score</div>
                      </td>
                    )}
                    <td style={{ verticalAlign: 'middle' }}>
                      <div>
                        {category && <span style={badgePill}>{category}</span>}
                        {distanceLabel && <span style={badgePillSubtle}>{distanceLabel}</span>}
                      </div>
                      <Text style={{ ...text, fontSize: '13px', margin: '8px 0 0', color: '#525252' }}>
                        {locLabel}
                      </Text>
                    </td>
                  </tr>
                </table>
              </Section>
            )}

            {/* Primær CTA øverst — så travle mobilbrugere ikke skal scrolle for
                at reagere. Vi gentager ikke knappen nederst. */}
            <Section style={{ ...buttonSection, margin: '4px 0 22px' }}>
              <Button style={button} href={leadsUrl} className="sy-btn">Åbn lead i panelet →</Button>
              <Text style={{ ...text, fontSize: '12px', color: '#737373', margin: '10px 0 0' }}>
                Vær hurtig — kunden hører også fra op til 2 andre virksomheder.
              </Text>
            </Section>

            <Section style={card} className="sy-card">
              {description && (
                <>
                  <Text style={cardLabel}>Kundens beskrivelse</Text>
                  <Text style={{ ...text, margin: '4px 0 0', whiteSpace: 'pre-wrap' as const }}>{description}</Text>
                </>
              )}
              {estimatedPrice && (
                <>
                  <Text style={{ ...cardLabel, marginTop: description ? '14px' : '0' }}>Estimeret pris</Text>
                  <Text style={cardValue}>{estimatedPrice}</Text>
                </>
              )}
              {reason && (
                <>
                  <Text style={{ ...cardLabel, marginTop: (description || estimatedPrice) ? '14px' : '0' }}>Hvorfor netop jer</Text>
                  <Text style={{ ...text, margin: '4px 0 0', fontStyle: 'italic', color: '#525252' }}>"{reason}"</Text>
                </>
              )}
            </Section>

            {shareContact && (customerName || customerEmail || customerPhone) && (
              <Section style={contactCard} className="sy-card">
                <Text style={contactLabel}>Kontakt kunden direkte</Text>
                {customerName && <Text style={{ ...cardValue, margin: '6px 0 10px' }}>{customerName}</Text>}
                {customerEmail && (
                  <Text style={{ ...text, margin: '2px 0 0', fontSize: '14px' }}>
                    <Link href={`mailto:${customerEmail}`} style={link}>{customerEmail}</Link>
                  </Text>
                )}
                {customerPhone && (
                  <Text style={{ ...text, margin: '4px 0 0', fontSize: '14px' }}>
                    <Link href={`tel:${customerPhone}`} style={link}>{customerPhone}</Link>
                  </Text>
                )}
              </Section>
            )}

            <Section style={helpBox}>
              <Text style={helpBoxTitle}>Sådan fungerer leads</Text>
              <Text style={helpBoxText}>
                Hvert lead matches med op til 3 virksomheder. Markér leadet som "Kontaktet" eller "Vundet" i panelet, så holder vi styr på det for jer.
                Spørgsmål? Skriv til <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>.
              </Text>
            </Section>
          </Container>

          <Section style={footer}>
            <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link></Text>
            <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}. Du modtager denne mail fordi din virksomhed er aktiv på Serviceydere.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Lokale styles til hero-stribe og score-tal. Holdt herinde fordi de er
// specifikke for new-lead og ikke deles med andre templates.
const scoreStrip = {
  backgroundColor: '#fafafa',
  border: '1px solid #ececec',
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '0 0 18px',
}
const scoreCell = {
  verticalAlign: 'middle' as const,
  paddingRight: '16px',
  width: '92px',
  borderRight: '1px solid #ececec',
}
const scoreNum = {
  fontSize: '36px',
  fontWeight: 700 as const,
  color: '#015c96',
  lineHeight: '1',
  letterSpacing: '-0.02em',
}
const scoreLabel = {
  fontSize: '11px',
  color: '#737373',
  marginTop: '4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  fontWeight: 500 as const,
}
const badgePill = {
  display: 'inline-block',
  backgroundColor: '#ffffff',
  color: '#212121',
  border: '1px solid #d4d4d4',
  padding: '5px 11px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 500 as const,
  marginRight: '6px',
  marginBottom: '4px',
}
const badgePillSubtle = {
  ...badgePill,
  color: '#525252',
  backgroundColor: '#f5f5f5',
  border: '1px solid #ececec',
}
const contactCard = {
  ...card,
  borderLeft: '4px solid #015c96',
  backgroundColor: '#f8fbfd',
}
const contactLabel = {
  ...cardLabel,
  color: '#015c96',
  fontWeight: 600 as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

export const template = {
  component: NewLeadEmail,
  subject: (data) => `Nyt lead${data.category ? ` på ${data.category}` : ''}${data.customerCity ? ` i ${data.customerCity}` : ''}`,
  displayName: 'Nyt lead — virksomhed',
  previewData: {
    businessName: 'Ready2Clean',
    ownerName: 'Anna',
    customerName: 'Mette Hansen',
    customerCity: 'København NV',
    customerZip: '2400',
    category: 'Rengøring',
    description: 'Rengøring af 3-værelses lejlighed på 85 m², hver 14. dag.',
    matchScore: 92,
    reason: 'I har høj rating på privatrengøring i København og passer til kundens ønskede frekvens.',
    estimatedPrice: '750–950 kr / besøg',
    distanceKm: 2.4,
    shareContact: true,
    customerEmail: 'mette@example.dk',
    customerPhone: '+45 22 33 44 55',
    leadsUrl: 'https://serviceydere.dk/virksomhed?tab=leads',
  },
} satisfies TemplateEntry

export default NewLeadEmail