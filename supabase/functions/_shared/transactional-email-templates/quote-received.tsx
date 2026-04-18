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
  card, cardAccent,
  cardLabel, cardValue,
  stepList, stepItem, stepNumber,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

interface QuoteReceivedProps {
  customerName?: string
  businessName?: string
  businessPhone?: string
  businessEmail?: string
  category?: string
  description?: string
  price?: number
  message?: string
  quoteRequestId?: string
  totalQuotes?: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)

const QuoteReceivedEmail = ({
  customerName,
  businessName,
  businessPhone,
  businessEmail,
  category,
  description,
  price,
  message,
  quoteRequestId,
  totalQuotes,
}: QuoteReceivedProps) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>
      Nyt tilbud{businessName ? ` fra ${businessName}` : ''}
      {price != null ? ` — ${fmt(price)}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={headerBar}>
          <Img src={LOGO_URL} alt={SITE_NAME} height="28" />
        </Section>

        <Container style={container}>
          <Heading style={h1}>Du har fået et nyt tilbud 💼</Heading>
          <Text style={text}>
            Hej{customerName ? ` ${customerName}` : ''},
            {businessName ? ` ${businessName}` : ' en serviceyder'} har sendt dig et tilbud
            på din forespørgsel{category ? ` om ${category.toLowerCase()}` : ''}.
          </Text>

          {/* Headline price card */}
          <Section style={cardAccent}>
            {businessName && (
              <Text style={{ ...cardLabel, color: '#0e7490' }}>Tilbud fra</Text>
            )}
            {businessName && (
              <Text style={{ ...cardValue, fontSize: '16px', margin: '0 0 12px' }}>
                🏢 {businessName}
              </Text>
            )}
            {typeof price === 'number' && (
              <>
                <Text style={{ ...cardLabel, color: '#0e7490' }}>Pris</Text>
                <Text style={{ fontSize: '28px', fontWeight: 700, color: '#0d1729', margin: '0 0 4px', lineHeight: '1.1' }}>
                  {fmt(price)}
                </Text>
              </>
            )}
          </Section>

          {/* Original request reminder */}
          {(category || description) && (
            <>
              <Text style={h2}>Din oprindelige forespørgsel</Text>
              <Section style={card}>
                {category && (
                  <>
                    <Text style={cardLabel}>Kategori</Text>
                    <Text style={cardValue}>{category}</Text>
                  </>
                )}
                {description && (
                  <>
                    <Text style={cardLabel}>Beskrivelse</Text>
                    <Text style={{ ...cardValue, fontWeight: 400, color: '#374151' }}>
                      {description}
                    </Text>
                  </>
                )}
              </Section>
            </>
          )}

          {/* Message from business */}
          {message && (
            <>
              <Text style={h2}>Besked fra {businessName || 'leverandøren'}</Text>
              <Section style={card}>
                <Text style={{ ...text, fontStyle: 'italic', margin: 0, color: '#374151' }}>
                  "{message}"
                </Text>
              </Section>
            </>
          )}

          {/* What's next */}
          <Text style={h2}>Hvad gør du nu?</Text>
          <ol style={stepList}>
            <li style={stepItem}>
              <span style={stepNumber}>1</span>
              Gennemgå tilbuddet i dit kundepanel.
            </li>
            <li style={stepItem}>
              <span style={stepNumber}>2</span>
              {totalQuotes && totalQuotes > 1
                ? `Sammenlign med de ${totalQuotes - 1} andre tilbud, du har modtaget.`
                : 'Vent eventuelt på flere tilbud — eller accepter med det samme.'}
            </li>
            <li style={stepItem}>
              <span style={stepNumber}>3</span>
              Accepter tilbuddet, og I aftaler tid sammen.
            </li>
          </ol>

          <Section style={buttonSection}>
            <Button
              style={button}
              href={`${SITE_URL}/dashboard${quoteRequestId ? `?quote=${quoteRequestId}` : ''}`}
            >
              Se og besvar tilbud
            </Button>
          </Section>

          {(businessPhone || businessEmail) && (
            <Section style={helpBox}>
              <Text style={helpBoxTitle}>Spørgsmål til tilbuddet?</Text>
              <Text style={helpBoxText}>
                Kontakt {businessName || 'leverandøren'} direkte:
                {' '}
                {businessPhone && (
                  <>📞 <Link href={`tel:${businessPhone}`} style={link}>{businessPhone}</Link></>
                )}
                {businessPhone && businessEmail && '  ·  '}
                {businessEmail && (
                  <>✉️ <Link href={`mailto:${businessEmail}`} style={link}>{businessEmail}</Link></>
                )}
              </Text>
            </Section>
          )}
        </Container>

        <Section style={footer}>
          <Text style={footerText}>
            <Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> ·{' '}
            <Link href={`${SITE_URL}/dashboard`} style={footerLink}>Mit kundepanel</Link> ·{' '}
            <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>Support</Link>
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
  component: QuoteReceivedEmail,
  subject: (data) =>
    `Nyt tilbud${data.businessName ? ` fra ${data.businessName}` : ''}${typeof data.price === 'number' ? ` — ${fmt(data.price)}` : ''}`,
  displayName: 'Nyt tilbud modtaget',
  previewData: {
    customerName: 'Mette',
    businessName: 'VVS Aarhus ApS',
    businessPhone: '+45 86 12 34 56',
    businessEmail: 'info@vvs-aarhus.dk',
    category: 'VVS',
    description: 'Vandhanen i køkkenet drypper og skal udskiftes. Bor i lejlighed på 2. sal.',
    price: 2495,
    message: 'Vi kan komme forbi næste mandag og udskifte vandhanen. Prisen inkluderer arbejdsløn og en ny standardvandhane.',
    quoteRequestId: 'q1',
    totalQuotes: 3,
  },
} satisfies TemplateEntry

export default QuoteReceivedEmail
