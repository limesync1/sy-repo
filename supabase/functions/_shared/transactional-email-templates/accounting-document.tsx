import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { Button } from '../email-button.tsx'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, LOGO_URL, main, wrapper, headerBar, heroSection, heroTitle, heroSubtitle,
  card, cardLabel, cardValue, buttonSection, button, muted, footer, footerText, footerLink,
} from './_styles.ts'
import { formatServicePrice } from './_service-price.ts'

interface Props { customerName?: string; businessName?: string; documentNumber?: string; amount?: number; downloadUrl?: string; isCredit?: boolean }

const AccountingDocument = ({ customerName, businessName, documentNumber, amount = 0, downloadUrl, isCredit = false }: Props) => {
  const biz = businessName || 'Din serviceyder'
  const kind = isCredit ? 'kreditnota' : 'faktura'
  return (
    <Html lang="da" dir="ltr">
      <Head />
      <Preview>{isCredit ? 'Din kreditnota' : 'Din faktura'} fra {biz}</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={headerBar}><Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} /></Section>
          <Section style={heroSection}>
            <Heading style={heroTitle}>{isCredit ? 'Din kreditnota' : 'Din faktura'}</Heading>
            <Text style={heroSubtitle}>
              Hej {customerName || 'kunde'}. {biz} har {isCredit ? 'krediteret din faktura' : 'sendt din faktura'}.
            </Text>
          </Section>
          <Section style={card}>
            {documentNumber && (<><Text style={cardLabel}>{isCredit ? 'Kreditnotanummer' : 'Fakturanummer'}</Text><Text style={cardValue}>{documentNumber}</Text></>)}
            <Text style={cardLabel}>Virksomhed</Text>
            <Text style={cardValue}>{biz}</Text>
            <Text style={cardLabel}>{isCredit ? 'Krediteret beløb' : 'Beløb'}</Text>
            <Text style={{ ...cardValue, margin: 0 }}>{formatServicePrice(Math.abs(amount))}</Text>
          </Section>
          {downloadUrl && (
            <>
              <Section style={buttonSection}><Button href={downloadUrl} style={button}>Hent {kind}</Button></Section>
              <Text style={muted}>Linket virker i 7 dage. Kontakt virksomheden, hvis du har brug for et nyt.</Text>
            </>
          )}
          {isCredit && <Text style={muted}>Eventuel tilbagebetaling aftales med virksomheden.</Text>}
          <Section style={footer}>
            <Text style={footerText}>Sendt af {biz} via {SITE_NAME}.</Text>
            <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link></Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AccountingDocument,
  subject: (data: Record<string, unknown>) => `${data.isCredit ? 'Kreditnota' : 'Faktura'} fra ${data.businessName || 'din serviceyder'}`,
  displayName: 'Faktura og kreditnota',
  previewData: { customerName: 'Hans', businessName: 'Rengøring København ApS', documentNumber: '123', amount: 80, isCredit: true, downloadUrl: 'https://serviceydere.dk' },
} satisfies TemplateEntry
