/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, SITE_URL, SUPPORT_EMAIL, LOGO_URL,
  main, wrapper, container, headerBar,
  heroSection, heroTitle, heroSubtitle,
  text, link,
  card, cardLabel, cardValue,
  itemRow, itemRowLast, itemName, itemDetail, itemPrice, stepLine,
  totalRow, badge,
  helpBox, helpBoxTitle, helpBoxText,
  footer, footerText, footerLink,
} from './_styles.ts'

interface StepDetail { label: string; value: number | string; unit?: string; subtotal?: number }
interface OrderItem { name: string; quantity?: number; price: number; intervalLabel?: string; description?: string; stepDetails?: StepDetail[] }
interface Props {
  customerName?: string
  businessName?: string
  businessPhone?: string
  businessEmail?: string
  businessMessage?: string
  orderId?: string
  address?: string
  preferredDate?: string
  items?: OrderItem[]
  totalAmount?: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)

const ManualOrderConfirmedEmail = ({
  customerName, businessName, businessPhone, businessEmail, businessMessage,
  orderId, address, preferredDate, items = [], totalAmount = 0,
}: Props) => {
  const shortId = orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : null
  const businessLabel = businessName || 'Din leverandør'
  return (
    <Html lang="da" dir="ltr">
      <Head />
      <Preview>{businessLabel} har bekræftet din bestilling på {fmt(totalAmount)}</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={headerBar}>
            <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
          </Section>
          <Container style={container}>
            <Section style={heroSection}>
              <Heading style={heroTitle}>Din bestilling er bekræftet</Heading>
              <Text style={heroSubtitle}>
                Hej{customerName ? ` ${customerName}` : ''}. {businessLabel} har oprettet og bekræftet en bestilling til dig.
              </Text>
            </Section>
            <Section style={{ margin: '0 0 10px' }}>
              <span style={badge('#065f46', '#d1fae5')}>Bekræftet</span>
            </Section>
            {businessMessage && (
              <Section style={{ ...card, borderLeft: '4px solid #11c4ce' }}>
                <Text style={cardLabel}>Besked fra {businessLabel}</Text>
                <Text style={{ ...text, margin: '4px 0 0', fontStyle: 'italic' }}>"{businessMessage}"</Text>
              </Section>
            )}
            <Section style={card}>
              {shortId && <><Text style={cardLabel}>Ordrenummer</Text><Text style={cardValue}>{shortId}</Text></>}
              {address && <><Text style={cardLabel}>Adresse</Text><Text style={cardValue}>{address}</Text></>}
              {preferredDate && <><Text style={cardLabel}>Planlagt dato</Text><Text style={cardValue}>{preferredDate}</Text></>}
              {items.length > 0 && (
                <>
                  <Text style={{ ...cardLabel, marginTop: '12px' }}>Bestilte services</Text>
                  <div>
                    {items.map((it, i) => {
                      const qty = it.quantity && it.quantity > 1 ? `${it.quantity}× ` : ''
                      const isLast = i === items.length - 1
                      return (
                        <div key={i} style={isLast ? itemRowLast : itemRow}>
                          <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse' }}>
                            <tr>
                              <td style={{ verticalAlign: 'top' }}>
                                <Text style={itemName}>{qty}{it.name}</Text>
                                {it.intervalLabel && <Text style={itemDetail}>{it.intervalLabel}</Text>}
                                {it.description && !it.stepDetails?.length && <Text style={itemDetail}>{it.description}</Text>}
                                {it.stepDetails?.map((sd, j) => (
                                  <Text key={j} style={stepLine}>{sd.label}: <strong>{sd.value} {sd.unit || ''}</strong>{sd.subtotal != null ? ` ${fmt(sd.subtotal)}` : ''}</Text>
                                ))}
                              </td>
                              <td style={{ verticalAlign: 'top', textAlign: 'right', minWidth: '70px' }}>
                                <Text style={itemPrice}>{fmt(it.price)}</Text>
                              </td>
                            </tr>
                          </table>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              <table width="100%" cellPadding="0" cellSpacing="0" style={totalRow}>
                <tr>
                  <td style={{ textAlign: 'left' }}>I alt</td>
                  <td style={{ textAlign: 'right' }}>{fmt(totalAmount)}</td>
                </tr>
              </table>
            </Section>
            <Section style={helpBox}>
              <Text style={helpBoxTitle}>Spørgsmål til bestillingen?</Text>
              <Text style={helpBoxText}>
                Kontakt {businessLabel} direkte{businessPhone ? ` på ${businessPhone}` : ''}{businessEmail ? ` eller ${businessEmail}` : ''}. Ved spørgsmål til platformen kan du skrive til <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>.
              </Text>
            </Section>
          </Container>
          <Section style={footer}>
            <Text style={footerText}><Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link></Text>
            <Text style={footerText}>© {new Date().getFullYear()} {SITE_NAME}. Du modtager denne e-mail, fordi {businessLabel} har oprettet en bestilling til dig.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ManualOrderConfirmedEmail,
  subject: (data) => `Bestilling bekræftet${data.businessName ? ` fra ${data.businessName}` : ''}`,
  displayName: 'Manuel ordre bekræftelse (kendt kunde)',
  previewData: {
    customerName: 'Mette Hansen',
    businessName: 'Rengøring København ApS',
    businessPhone: '+45 70 20 30 40',
    businessEmail: 'kontakt@rengoering-kbh.dk',
    businessMessage: 'Hej Mette, her er bekræftelsen som aftalt.',
    orderId: 'a1b2c3d4-1234',
    address: 'Vesterbrogade 12, 1620 København V',
    preferredDate: 'Onsdag d. 24. april kl. 09:00',
    items: [{ name: 'Privatrengøring', quantity: 1, price: 599, intervalLabel: 'Hver 14. dag' }],
    totalAmount: 599,
  },
} satisfies TemplateEntry

export default ManualOrderConfirmedEmail