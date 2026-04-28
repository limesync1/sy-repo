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
 card, cardAccent, cardWarning,
 cardLabel, cardValue,
 itemRow, itemRowLast, itemName, itemDetail, itemPrice, stepLine, totalRow,
 badge,
 stepList, stepItem, stepNumber,
 helpBox, helpBoxTitle, helpBoxText,
 footer, footerText, footerLink,
} from './_styles.ts'

/* Types matching the actual app lifecycle (AftaleTab.STATUS_CONFIG) 
 status: pending | confirmed | in_progress | completed | cancelled
 business_response: null | 'accepted' | 'adjusted' | 'rejected'
 When business_response = 'adjusted' and order is still pending, the
 business has proposed a price/scope change. The customer must accept
 or reject. We render this as a distinct "adjusted" state in the email.
*/
type EventType =
 | 'pending' // Ny bestilling oprettet (sjælden typisk dækkes af order-confirmation)
 | 'adjusted' // Virksomheden har sendt et tilpasset forslag
 | 'confirmed' // Aftalt (godkendt direkte eller efter accept af forslag)
 | 'in_progress' // Arbejdet er i gang
 | 'completed' // Udført
 | 'cancelled' // Annulleret

interface StepDetail {
 label: string
 value: number | string
 unit?: string
 subtotal?: number
 price_per_unit?: number
}

interface OrderItemSummary {
 name: string
 quantity?: number
 price: number
 intervalLabel?: string
 description?: string
 stepDetails?: StepDetail[]
}

interface OrderStatusUpdateProps {
 customerName?: string
 businessName?: string
 businessPhone?: string
 businessEmail?: string
 businessAddress?: string
 orderId?: string
 event?: EventType // primær trigger afgør hele e-mailens indhold
 message?: string // valgfri besked fra virksomheden
 serviceDate?: string // aftalt servicedato (hvis sat)
 // Beløb
 originalAmount?: number // beløb før evt. justering
 proposedAmount?: number // beløb i tilpasset forslag
 finalAmount?: number // endeligt beløb (for confirmed/in_progress/completed)
 // Bestilte services (samme format som order-confirmation)
 items?: OrderItemSummary[]
 proposedItems?: OrderItemSummary[] // det justerede forslag
 // Kontekst
 hasRecurring?: boolean // sand hvis ordren har en tilbagevendende service
}

const STATUS_LABEL: Record<EventType, string> = {
 pending: 'Ny bestilling',
 adjusted: 'Forslag fra leverandøren',
 confirmed: 'Aftalt',
 in_progress: 'I gang',
 completed: 'Udført',
 cancelled: 'Annulleret',
}

const STATUS_COLOR: Record<EventType, { fg: string; bg: string }> = {
 pending: { fg: '#92400e', bg: '#fef3c7' },
 adjusted: { fg: '#9a3412', bg: '#ffedd5' },
 confirmed: { fg: '#1e3a8a', bg: '#dbeafe' },
 in_progress: { fg: '#5b21b6', bg: '#ede9fe' },
 completed: { fg: '#065f46', bg: '#d1fae5' },
 cancelled: { fg: '#991b1b', bg: '#fee2e2' },
}

const STATUS_HEADLINE: Record<EventType, string> = {
 pending: 'Vi har modtaget din bestilling',
 adjusted: 'Forslag til din bestilling ',
 confirmed: 'Din bestilling er aftalt ',
 in_progress: 'Din service er i gang ',
 completed: 'Din service er udført ',
 cancelled: 'Din bestilling er annulleret',
}

const STATUS_INTRO: Record<EventType, (biz: string) => string> = {
 pending: (biz) =>`${biz} har modtaget din bestilling og vender tilbage hurtigst muligt.`,
 adjusted: (biz) =>`${biz} har gennemgået din bestilling og foreslået en justering. Du skal godkende eller afvise forslaget for, at aftalen kan fortsætte.`,
 confirmed: (biz) =>`${biz} har bekræftet din bestilling. I er nu enige om aftalen, og servicen udføres på den aftalte dato.`,
 in_progress: (biz) =>`${biz} er nu gået i gang med din service. Du modtager besked, så snart arbejdet er udført.`,
 completed: (biz) =>`${biz} har afsluttet servicen. Tak fordi du valgte os vi håber, du er tilfreds med resultatet.`,
 cancelled: (biz) =>`Din bestilling hos ${biz} er blevet annulleret. Du bliver ikke opkrævet noget for denne ordre.`,
}

const STATUS_NEXT: Record<EventType, string[]> = {
 pending: [
 'Leverandøren bekræfter, foreslår en tilpasning, eller afviser ordren.',
 'Du får en e-mail, så snart der er nyt typisk inden for 24 timer.',
 ],
 adjusted: [
 'Åbn ordren i dit kundepanel og gennemgå forslaget.',
 'Tryk Godkend, hvis du accepterer så bliver aftalen bekræftet.',
 'Tryk Afvis, hvis du ikke ønsker tilpasningen leverandøren får besked og kan sende et nyt forslag.',
 ],
 confirmed: [
 'Hav adressen klar og sørg for adgang på den aftalte dato.',
 'Kontakt leverandøren direkte, hvis tidspunktet ikke længere passer.',
 'Du får en e-mail, når servicen går i gang og igen, når den er udført.',
 ],
 in_progress: [
 'Leverandøren arbejder lige nu på din service.',
 'Du modtager en bekræftelse, så snart arbejdet er udført.',
 ],
 completed: [
 'Hvis du er tilfreds, vil leverandøren sætte stor pris på en anmeldelse.',
 'Har du en tilbagevendende aftale, planlægges næste service automatisk.',
 ],
 cancelled: [
 'Du kan altid afgive en ny bestilling fra leverandørens side eller søge en ny.',
 'Hvis du har spørgsmål til annulleringen, så kontakt leverandøren direkte.',
 ],
}

const fmt = (n: number) =>
 new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(n)

const fmtDate = (s?: string) => {
 if (!s) return null
 try {
 return new Date(s).toLocaleDateString('da-DK', {
 weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
 })
 } catch { return s }
}

const renderItems = (items: OrderItemSummary[]) => (
 <div>
 {items.map((it, i) => {
 const qty = it.quantity && it.quantity > 1 ? `${it.quantity}×` : ''
 const isLast = i === items.length - 1
 return (
 <div key={i} style={isLast ? itemRowLast : itemRow}>
 <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse' }}>
 <tr>
 <td style={{ verticalAlign: 'top' }}>
 <Text style={itemName}>{qty}{it.name}</Text>
 {it.intervalLabel && <Text style={itemDetail}> {it.intervalLabel}</Text>}
 {it.description && !it.stepDetails?.length && (
 <Text style={itemDetail}>{it.description}</Text>
 )}
 {it.stepDetails?.map((sd, j) => (
 <Text key={j} style={stepLine}>
 {sd.label}: <strong>{sd.value} {sd.unit || ''}</strong>
 {sd.subtotal != null ? ` ${fmt(sd.subtotal)}` : ''}</Text>
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
)

const OrderStatusUpdateEmail = ({
 customerName,
 businessName,
 businessPhone,
 businessEmail,
 businessAddress,
 orderId,
 event = 'confirmed',
 message,
 serviceDate,
 originalAmount,
 proposedAmount,
 finalAmount,
 items = [],
 proposedItems = [],
 hasRecurring = false,
}: OrderStatusUpdateProps) => {
 const colors = STATUS_COLOR[event] ?? STATUS_COLOR.confirmed
 const headline = STATUS_HEADLINE[event] ?? STATUS_HEADLINE.confirmed
 const businessLabel = businessName || 'Leverandøren'
 const intro = (STATUS_INTRO[event] ?? STATUS_INTRO.confirmed)(businessLabel)
 const nextSteps = STATUS_NEXT[event] ?? []
 const date = fmtDate(serviceDate)
 const shortId = orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : null

 // Hvilke items skal vi vise?
 // - adjusted: vis det FORESLÅEDE indhold (proposedItems) det er pointen
 // - alle andre: vis de aktuelle items
 const visibleItems = event === 'adjusted' && proposedItems.length > 0 ? proposedItems : items
 const visibleTotal =
 event === 'adjusted'
 ? (proposedAmount ?? finalAmount ?? originalAmount)
 : (finalAmount ?? originalAmount)

 const showPriceChange =
 event === 'adjusted' &&
 originalAmount != null &&
 proposedAmount != null &&
 originalAmount !== proposedAmount

 // CTA tekst pr. event
 const ctaLabel =
 event === 'adjusted' ? 'Godkend eller afvis forslag'
 : event === 'completed' ? 'Skriv en anmeldelse'
 : event === 'cancelled' ? 'Find en ny leverandør'
 : 'Se ordren'

 const ctaHref =
 event === 'cancelled'
 ? `${SITE_URL}/search`
 : `${SITE_URL}/dashboard${orderId ? `?order=${orderId}` : ''}`

 return (
 <Html lang="da" dir="ltr">
 <Head />
 <Preview>{headline}{businessName ? ` ${businessName}` : ''}</Preview>
 <Body style={main}>
 <Container style={wrapper}>
 <Section style={headerBar}>
 <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
</Section>

 <Container style={container}>
 <Heading style={h1}>{headline}</Heading>
 <Text style={text}>
 Hej{customerName ? ` ${customerName}` : ''}, {intro}</Text>

 {/* Status badge */}
 <Section style={{ margin: '0 0 8px' }}>
 <span style={badge(colors.fg, colors.bg)}>{STATUS_LABEL[event] ?? event}</span>
</Section>

 {/* Adjusted: pris-sammenligning øverst */}
 {showPriceChange && (
 <Section style={cardWarning}>
 <Text style={{ ...cardLabel, color: '#9a3412' }}>Oprindeligt beløb</Text>
 <Text style={{ ...cardValue, textDecoration: 'line-through', color: '#9ca3af' }}>
 {fmt(originalAmount!)}</Text>
 <Text style={{ ...cardLabel, color: '#9a3412' }}>Foreslået nyt beløb</Text>
 <Text style={{ ...cardValue, fontSize: '22px', color: '#9a3412' }}>
 {fmt(proposedAmount!)}</Text>
 <Text style={{ ...text, fontSize: '13px', margin: '8px 0 0', color: '#9a3412' }}>
 Forslaget træder først i kraft, når du godkender det.
</Text>
</Section>
 )}

 {/* Ordre-detaljer kort */}
 <Section style={card}>
 {shortId && (
 <>
 <Text style={cardLabel}>Ordrenummer</Text>
 <Text style={cardValue}>{shortId}</Text>
 </>
 )}
 {businessName && (
 <>
 <Text style={cardLabel}>Leverandør</Text>
 <Text style={cardValue}>{businessName}</Text>
 </>
 )}
 {date && (
 <>
 <Text style={cardLabel}>{event === 'completed' ? 'Udført dato' : 'Servicedato'}</Text>
 <Text style={cardValue}>{date}</Text>
 </>
 )}

 {visibleItems.length > 0 && (
 <>
 <Text style={{ ...cardLabel, marginTop: '8px' }}>
 {event === 'adjusted' ? 'Foreslåede services' : 'Bestilte services'}</Text>
 {renderItems(visibleItems)}
 </>
 )}

 {typeof visibleTotal === 'number' && (
 <div style={totalRow}>
 <span>{event === 'adjusted' ? 'Nyt total' : 'I alt'}</span>
 <span>{fmt(visibleTotal)}</span>
 </div>
 )}
</Section>

 {/* Besked fra virksomheden */}
 {message && (
 <>
 <Text style={h2}>Besked fra {businessLabel}</Text>
 <Section style={event === 'adjusted' ? cardWarning : cardAccent}>
 <Text style={{ ...text, fontStyle: 'italic', margin: 0, color: '#374151' }}>
 "{message}"
</Text>
</Section>
 </>
 )}

 {/* Hvad sker der nu */}
 {nextSteps.length > 0 && (
 <>
 <Text style={h2}>Hvad sker der nu?</Text>
 <ol style={stepList}>
 {nextSteps.map((step, i) => (
 <li key={i} style={stepItem}>
 <span style={stepNumber}>{i + 1}</span>
 {step}
 </li>
 ))}
 </ol>
 </>
 )}

 {/* Genbestilling-tip ved completed + recurring */}
 {event === 'completed' && hasRecurring && (
 <Section style={cardAccent}>
 <Text style={{ ...text, fontWeight: 600, color: '#0d1729', margin: '0 0 6px' }}>
 Næste service er allerede planlagt
</Text>
 <Text style={{ ...text, fontSize: '13px', margin: 0, color: '#0e7490' }}>
 Du har en tilbagevendende aftale. Næste servicedato planlægges automatisk 
 du kan altid pause, ændre interval eller opsige fra dit kundepanel.
</Text>
</Section>
 )}

 <Section style={buttonSection}>
 <Button style={button} href={ctaHref}>{ctaLabel}</Button>
</Section>

 {/* Kontaktinfo til virksomheden */}
 {(businessPhone || businessEmail || businessAddress) && (
 <Section style={helpBox}>
 <Text style={helpBoxTitle}>Kontakt {businessLabel}</Text>
 <Text style={helpBoxText}>
 {businessAddress && <> {businessAddress}<br /></>}
 {businessPhone && (
 <><Link href={`tel:${businessPhone}`} style={link}>{businessPhone}</Link></>
 )}
 {businessPhone && businessEmail && ' · '}
 {businessEmail && (
 <><Link href={`mailto:${businessEmail}`} style={link}>{businessEmail}</Link></>
 )}</Text>
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
 © {new Date().getFullYear()} {SITE_NAME}. Du modtager denne e-mail, fordi der er sket en opdatering på din ordre.
</Text>
</Section>
 </Container>
 </Body>
 </Html>
 )
}

export const template = {
 component: OrderStatusUpdateEmail,
 subject: (data) => {
 const lbl = STATUS_LABEL[data.event as EventType] ?? 'Opdatering'
 const biz = data.businessName ? ` ${data.businessName}` : ''
 const id = data.orderId ? ` #${String(data.orderId).slice(0, 8).toUpperCase()}` : ''
 if (data.event === 'adjusted') return`Forslag fra ${data.businessName || 'leverandøren'}${id} godkend eller afvis`
 if (data.event === 'completed') return`Din service er udført${biz}`
 if (data.event === 'in_progress') return`Din service er i gang${biz}`
 if (data.event === 'confirmed') return`Din bestilling er aftalt${biz}`
 if (data.event === 'cancelled') return`Din bestilling er annulleret${biz}`
 return`${lbl}${biz}${id}`
 },
 displayName: 'Ordre-opdatering',
 previewData: {
 customerName: 'Mette',
 businessName: 'Rengøring København ApS',
 businessPhone: '+45 70 20 30 40',
 businessEmail: 'kontakt@rengoering-kbh.dk',
 businessAddress: 'Vesterbrogade 12, 1620 København V',
 orderId: 'a1b2c3d4-1234',
 event: 'adjusted',
 message: 'Vi har gennemgået boligens størrelse og tilføjet 1 ekstra time, så vi kan nå alt grundigt.',
 serviceDate: '2026-05-05',
 originalAmount: 599,
 proposedAmount: 749,
 items: [
 { name: 'Privatrengøring', price: 599, intervalLabel: 'Hver 14. dag',
 stepDetails: [{ label: 'Boligstørrelse', value: 80, unit: 'm²', subtotal: 480 }] },
 ],
 proposedItems: [
 { name: 'Privatrengøring', price: 749, intervalLabel: 'Hver 14. dag',
 stepDetails: [
 { label: 'Boligstørrelse', value: 95, unit: 'm²', subtotal: 570 },
 { label: 'Ekstra timer', value: 1, unit: 'time', subtotal: 179 },
 ] },
 ],
 hasRecurring: true,
 },
} satisfies TemplateEntry

export default OrderStatusUpdateEmail
