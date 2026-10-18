import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { Button } from '../email-button.tsx'
import type { TemplateEntry } from './registry.ts'
import * as S from './_styles.ts'

type Stop = { number: number; customerName: string; address: string; service?: string }
type Props = { employeeName?: string; businessName?: string; routeName?: string; routeDate?: string; stops?: Stop[]; appUrl?: string }

const RouteOverview = ({ employeeName, businessName, routeName, routeDate, stops = [], appUrl }: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{routeName || 'Din ruteplan'} · {stops.length} stop</Preview>
    <Body style={S.main}>
      <Container style={S.wrapper}>
        <Section style={S.headerBar}><Img src={S.LOGO_URL} alt={S.SITE_NAME} height="36" style={{ display: 'block' }} /></Section>
        <Section style={S.heroSection}>
          <Heading style={S.heroTitle}>{routeName || 'Din ruteplan'}</Heading>
          <Text style={S.heroSubtitle}>Hej {employeeName || 'medarbejder'}. Her er din plan fra {businessName || 'virksomheden'}{routeDate ? ` for ${routeDate}` : ''}.</Text>
        </Section>
        <Text style={S.h2}>{stops.length} stop i planlagt rækkefølge</Text>
        <Section style={S.card}>
          {stops.map((stop, i) => (
            <Section key={`${stop.number}-${stop.address}`} style={i === stops.length - 1 ? S.itemRowLast : S.itemRow}>
              <Text style={S.itemName}>{stop.number}. {stop.customerName}</Text>
              <Text style={S.itemDetail}>{stop.address}</Text>
              {stop.service ? <Text style={S.itemDetail}>{stop.service}</Text> : null}
            </Section>
          ))}
        </Section>
        {appUrl ? <Section style={S.buttonSection}><Button href={appUrl} style={S.button}>Åbn min plan</Button></Section> : null}
        <Section style={S.footer}>
          <Text style={S.footerText}>Planen opdateres i medarbejderpanelet, hvis rækkefølgen ændres.</Text>
          <Text style={S.footerText}><Link href={S.SITE_URL} style={S.footerLink}>serviceydere.dk</Link></Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RouteOverview,
  subject: (data) => `${data.routeName || 'Din ruteplan'}${data.routeDate ? ` · ${data.routeDate}` : ''}`,
  displayName: 'Ruteoversigt',
  previewData: {
    employeeName: 'William', businessName: 'Adely', routeName: 'Herning-ruten', routeDate: 'torsdag 24. september', appUrl: 'https://serviceydere.dk/medarbejder',
    stops: [
      { number: 1, customerName: 'Rema 1000', address: 'Viborgvej, Herning', service: 'Serviceaftale' },
      { number: 2, customerName: 'Bauhaus', address: 'Silkeborgvej, Herning', service: 'Serviceaftale' },
    ],
  },
} satisfies TemplateEntry

