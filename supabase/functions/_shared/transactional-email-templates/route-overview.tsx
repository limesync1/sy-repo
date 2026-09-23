import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

type Stop = { number: number; customerName: string; address: string; service?: string }
type Props = { employeeName?: string; businessName?: string; routeName?: string; routeDate?: string; stops?: Stop[]; appUrl?: string }

const RouteOverview = ({ employeeName, businessName, routeName, routeDate, stops = [], appUrl }: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{routeName || 'Din ruteplan'} · {stops.length} stop</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SERVICEYDERE</Text>
        <Heading style={heading}>{routeName || 'Din ruteplan'}</Heading>
        <Text style={intro}>Hej {employeeName || 'medarbejder'}. Her er din plan fra {businessName || 'virksomheden'}{routeDate ? ` for ${routeDate}` : ''}.</Text>
        <Section style={summary}><Text style={summaryText}>{stops.length} {stops.length === 1 ? 'stop' : 'stop'} i planlagt rækkefølge</Text></Section>
        {stops.map((stop) => (
          <Section key={`${stop.number}-${stop.address}`} style={stopCard}>
            <Text style={stopTitle}>{stop.number}. {stop.customerName}</Text>
            <Text style={stopText}>{stop.address}</Text>
            {stop.service ? <Text style={service}>{stop.service}</Text> : null}
          </Section>
        ))}
        {appUrl ? <Button href={appUrl} style={button}>Åbn min plan</Button> : null}
        <Hr style={hr} />
        <Text style={footer}>Planen opdateres i medarbejderpanelet, hvis rækkefølgen ændres.</Text>
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

const main = { backgroundColor: '#ffffff', color: '#14213d', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 10px' }
const container = { margin: '0 auto', maxWidth: '560px', padding: '24px' }
const brand = { color: '#0a8f94', fontSize: '12px', fontWeight: 700, letterSpacing: '1px' }
const heading = { color: '#14213d', fontSize: '26px', lineHeight: '1.2', margin: '8px 0 10px' }
const intro = { color: '#4b5563', fontSize: '15px', lineHeight: '1.6' }
const summary = { backgroundColor: '#f4f6f8', borderLeft: '4px solid #0fa3a8', margin: '20px 0', padding: '2px 14px' }
const summaryText = { color: '#14213d', fontSize: '14px', fontWeight: 700 }
const stopCard = { borderBottom: '1px solid #e5e7eb', padding: '12px 0' }
const stopTitle = { color: '#14213d', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }
const stopText = { color: '#4b5563', fontSize: '14px', lineHeight: '1.45', margin: 0 }
const service = { color: '#0a7377', fontSize: '13px', margin: '4px 0 0' }
const button = { backgroundColor: '#14213d', borderRadius: '6px', color: '#ffffff', display: 'block', fontSize: '14px', fontWeight: 700, margin: '24px 0', padding: '13px 18px', textAlign: 'center' as const, textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const footer = { color: '#6b7280', fontSize: '12px', lineHeight: '1.5' }