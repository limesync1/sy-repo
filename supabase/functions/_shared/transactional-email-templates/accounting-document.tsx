import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { Button } from '../email-button.tsx'
import type { TemplateEntry } from './registry.ts'
import { main, wrapper, h1, text, button, LOGO_URL } from './_styles.ts'
import { formatServicePrice } from './_service-price.ts'

interface Props { customerName?: string; businessName?: string; documentNumber?: string; amount?: number; downloadUrl?: string; isCredit?: boolean }
const AccountingDocument = ({ customerName, businessName, documentNumber, amount = 0, downloadUrl, isCredit = false }: Props) => (
  <Html lang="da"><Head /><Preview>{isCredit ? 'Din kreditnota' : 'Din faktura'} fra {businessName || 'din serviceyder'}</Preview>
    <Body style={main}><Container style={wrapper}>
      <Img src={LOGO_URL} height="32" alt="Serviceydere" />
      <Heading style={h1}>{isCredit ? 'Kreditnota' : 'Faktura'} {documentNumber || ''}</Heading>
      <Text style={text}>Hej {customerName || 'kunde'}</Text>
      <Text style={text}>{businessName || 'Din serviceyder'} har {isCredit ? 'krediteret din faktura' : 'sendt din faktura igen'}.</Text>
      <Text style={text}>{isCredit ? 'Krediteret beløb' : 'Servicebeløb'}: {formatServicePrice(Math.abs(amount))}</Text>
      {downloadUrl && <Button href={downloadUrl} style={button}>Hent {isCredit ? 'kreditnota' : 'faktura'}</Button>}
      {downloadUrl && <Text style={text}>Downloadlinket er gyldigt i 7 dage. Kontakt virksomheden, hvis du har brug for et nyt.</Text>}
      {isCredit && <Text style={text}>Eventuel tilbagebetaling aftales med virksomheden.</Text>}
    </Container></Body>
  </Html>
)
export const template = {
  component: AccountingDocument,
  subject: (data: Record<string, unknown>) => `${data.isCredit ? 'Kreditnota' : 'Faktura'} fra ${data.businessName || 'din serviceyder'}`,
  displayName: 'Faktura og kreditnota',
  previewData: { customerName: 'Hans', businessName: 'Serviceydere', documentNumber: '123', amount: 80, isCredit: true },
} satisfies TemplateEntry