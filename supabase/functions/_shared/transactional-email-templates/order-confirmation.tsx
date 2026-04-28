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
 itemRow, itemRowLast, itemName, itemDetail, itemPrice, stepLine,
 totalRow, badge,
 stepList, stepItem, stepNumber,
 helpBox, helpBoxTitle, helpBoxText,
 footer, footerText, footerLink,
} from './_styles.ts'

interface StepDetail {
 label: string
 value: number | string
 unit?: string
 subtotal?: number
 price_per_unit?: number
}

interface OrderItem {
 name: string
 quantity?: number
 price: number
 interval?: string
 intervalLabel?: string
 description?: string
 stepDetails?: StepDetail[]
}

interface OrderConfirmationProps {
 customerName?: string
 customerEmail?: string
 customerPhone?: string
 businessName?: string
 businessPhone?: string
 businessEmail?: string
 businessAddress?: string
 orderId?: string
 items?: OrderItem[]
 totalAmount?: number
 hasRecurring?: boolean
}

const fmt = (n: number) =>
 new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)

const OrderConfirmationEmail = ({
 customerName,
 customerEmail,
 customerPhone,
 businessName,
 businessPhone,
 businessEmail,
 businessAddress,
 orderId,
 items = [],
 totalAmount = 0,
 hasRecurring = false,
}: OrderConfirmationProps) => {
 const shortId = orderId ?`#${orderId.slice(0, 8).toUpperCase()}` : null
 const businessLabel = businessName || 'leverandøren'

 return (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>
 Vi har modtaget din ordre{businessName ?` hos ${businessName}` : ''} total {fmt(totalAmount)}
 </Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
 </Section>

 <Container style={container}>
 <Heading style={h1}>Tak for din ordre </Heading>
 <Text style={text}>
 Hej{customerName ?` ${customerName}` : ''}, vi har modtaget din ordre
 {businessName ?` hos ${businessName}` : ''} og sendt den videre til {businessLabel}.
 Du modtager en ny e-mail, så snart de bekræfter eller justerer ordren.
 </Text>

 {/* Status badge */}
 <Section style={{ margin: '0 0 8px' }}>
 <span style={badge('#92400e', '#fef3c7')}>Afventer bekræftelse</span>
 </Section>

 {/* Order details card */}
 <Section style={card}>
 {shortId && (
 <>
 <Text style={cardLabel}>Ordrenummer</Text>
 <Text style={cardValue}>{shortId}</Text>
 </>
 )}

 {items.length > 0 && (
 <>
 <Text style={{ ...cardLabel, marginTop: '4px' }}>Bestilte services</Text>
 <div>
 {items.map((it, i) => {
 const qty = it.quantity && it.quantity > 1 ?`${it.quantity}×` : ''
 const isLast = i === items.length - 1
 return (
 <div key={i} style={isLast ? itemRowLast : itemRow}>
 <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse' }}>
 <tr>
 <td style={{ verticalAlign: 'top' }}>
 <Text style={itemName}>
 {qty}{it.name}
 </Text>
 {it.intervalLabel && (
 <Text style={itemDetail}>
 {it.intervalLabel}
 </Text>
 )}
 {it.description && !it.stepDetails?.length && (
 <Text style={itemDetail}>{it.description}</Text>
 )}
 {it.stepDetails?.map((sd, j) => (
 <Text key={j} style={stepLine}>
 {sd.label}: <strong>{sd.value} {sd.unit || ''}</strong>
 {sd.subtotal != null ?` ${fmt(sd.subtotal)}` : ''}
 </Text>
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

 <div style={totalRow}>
 <span>I alt</span>
 <span>{fmt(totalAmount)}</span>
 </div>
 </Section>

 {/* Customer contact info echo */}
 {(customerEmail || customerPhone) && (
 <>
 <Text style={h2}>Vi kontakter dig på</Text>
 <Section style={card}>
 {customerName && <Text style={cardRowText}> {customerName}</Text>}
 {customerEmail && <Text style={cardRowText}> {customerEmail}</Text>}
 {customerPhone && <Text style={cardRowText}> {customerPhone}</Text>}
 </Section>
 </>
 )}

 {/* Business contact */}
 {(businessName || businessPhone || businessEmail || businessAddress) && (
 <>
 <Text style={h2}>Leverandøren</Text>
 <Section style={card}>
 {businessName && (
 <Text style={{ ...cardRowText, fontWeight: 600, color: '#0d1729', fontSize: '15px' }}>
 {businessName}
 </Text>
 )}
 {businessAddress && <Text style={cardRowText}> {businessAddress}</Text>}
 {businessPhone && (
 <Text style={cardRowText}>
 <Link href={`tel:${businessPhone}`} style={link}>{businessPhone}</Link>
 </Text>
 )}
 {businessEmail && (
 <Text style={cardRowText}>
 <Link href={`mailto:${businessEmail}`} style={link}>{businessEmail}</Link>
 </Text>
 )}
 </Section>
 </>
 )}

 {/* What happens next */}
 <Text style={h2}>Hvad sker der nu?</Text>
 <ol style={stepList}>
 <li style={stepItem}>
 <span style={stepNumber}>1</span>
 {businessLabel.charAt(0).toUpperCase() + businessLabel.slice(1)} gennemgår din ordre og bekræfter eller foreslår en tilpasning.
 </li>
 <li style={stepItem}>
 <span style={stepNumber}>2</span>
 Du får en e-mail, så snart der er nyt. Du kan også følge ordren i dit kundepanel.
 </li>
 <li style={stepItem}>
 <span style={stepNumber}>3</span>
 Når ordren er bekræftet, aftaler I tid og {businessLabel} udfører servicen.
 </li>
 </ol>

 {hasRecurring && (
 <Section style={cardAccent}>
 <Text style={{ ...text, fontWeight: 600, color: '#0d1729', margin: '0 0 6px' }}>
 Du har bestilt en tilbagevendende service
 </Text>
 <Text style={{ ...text, fontSize: '13px', margin: 0, color: '#0e7490' }}>
 Næste servicedato planlægges automatisk efter første gennemførsel.
 Du kan pause, ændre interval eller annullere når som helst fra dit kundepanel.
 </Text>
 </Section>
 )}

 <Section style={buttonSection}>
 <Button style={button} href={`${SITE_URL}/dashboard`}>
 Se og følg din ordre
 </Button>
 </Section>

 <Section style={helpBox}>
 <Text style={helpBoxTitle}>Spørgsmål til ordren?</Text>
 <Text style={helpBoxText}>
 Kontakt {businessLabel} direkte
 {businessPhone ?` på ${businessPhone}` : ''}
 {businessEmail ?`, eller skriv til ${businessEmail}` : ''}.
 Har du spørgsmål til selve platformen, så skriv til{' '}
 <Link href={`mailto:${SUPPORT_EMAIL}`} style={link}>{SUPPORT_EMAIL}</Link>.
 </Text>
 </Section>
 </Container>

 <Section style={footer}>
 <Text style={footerText}>
 <Link href={SITE_URL} style={footerLink}>serviceydere.dk</Link> ·{' '}
 <Link href={`${SITE_URL}/dashboard`} style={footerLink}>Mit kundepanel</Link>
 </Text>
 <Text style={footerText}>
 © {new Date().getFullYear()} {SITE_NAME}. Du modtager denne e-mail, fordi du har afgivet en ordre på serviceydere.dk.
 </Text>
 </Section>
 </Container>
 </Body>
 </Html>
 )
}

const cardRowText = {
 fontSize: '14px',
 color: '#374151',
 margin: '4px 0',
 lineHeight: '1.5',
}

export const template = {
 component: OrderConfirmationEmail,
 subject: (data) =>
`Ordrebekræftelse${data.orderId ?` #${String(data.orderId).slice(0, 8).toUpperCase()}` : ''}${data.businessName ?` ${data.businessName}` : ''}`,
 displayName: 'Ordrebekræftelse',
 previewData: {
 customerName: 'Mette Hansen',
 customerEmail: 'mette@example.dk',
 customerPhone: '+45 22 33 44 55',
 businessName: 'Rengøring København ApS',
 businessPhone: '+45 70 20 30 40',
 businessEmail: 'kontakt@rengoering-kbh.dk',
 businessAddress: 'Vesterbrogade 12, 1620 København V',
 orderId: 'a1b2c3d4-1234',
 items: [
 {
 name: 'Privatrengøring',
 quantity: 1,
 price: 599,
 intervalLabel: 'Hver 14. dag',
 stepDetails: [
 { label: 'Boligstørrelse', value: 80, unit: 'm²', subtotal: 480 },
 { label: 'Antal badeværelser', value: 2, unit: 'stk', subtotal: 119 },
 ],
 },
 { name: 'Vinduespudsning', quantity: 1, price: 299, description: 'Indvendig + udvendig' },
 ],
 totalAmount: 898,
 hasRecurring: true,
 },
} satisfies TemplateEntry

export default OrderConfirmationEmail
