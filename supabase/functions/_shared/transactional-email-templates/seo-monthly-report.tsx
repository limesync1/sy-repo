import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { Button } from '../email-button.tsx'
import type { TemplateEntry } from './registry.ts'
import { SITE_NAME, LOGO_URL, main, wrapper, container, headerBar, h1, text, card, cardLabel, cardValue, buttonSection, footer, footerText } from './_styles.ts'

interface Metric { label: string; value: string; change?: string; up?: boolean | null }
interface Row { name: string; value: string }
interface Props { period?: string; summary?: string; metrics?: Metric[]; queries?: Row[]; pages?: Row[]; notes?: string[] }

const SeoReport = ({ period = 'sidste måned', summary, metrics = [], queries = [], pages = [], notes = [] }: Props) => (
  <Html lang="da" dir="ltr">
    <Head /><Preview>{`SEO-rapport for ${period}`}</Preview>
    <Body style={{ ...main, backgroundColor: '#ffffff' }}>
      <Container style={wrapper}>
        <Section style={headerBar}><Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} /></Section>
        <Container style={container}>
          <Heading style={h1}>SEO-rapport: {period}</Heading>
          <Text style={text}>Hej William,</Text>
          {summary && <Text style={text}>{summary}</Text>}
          <Section style={card}>
            {metrics.map((m, i) => (
              <React.Fragment key={i}>
                <Text style={cardLabel}>{m.label}</Text>
                <Text style={cardValue}>
                  {m.value}
                  {m.change && <span style={{ color: m.up === null ? '#64748b' : m.up ? '#15803d' : '#b91c1c', fontWeight: 600 }}>{`  ${m.change}`}</span>}
                </Text>
              </React.Fragment>
            ))}
          </Section>
          {queries.length > 0 && <><Heading as="h2" style={{ ...h1, fontSize: '18px' }}>Mest søgte ord</Heading>
            <Section style={card}>{queries.map((q, i) => <Text key={i} style={{ ...text, margin: '4px 0' }}>{`${i + 1}. ${q.name} — ${q.value}`}</Text>)}</Section></>}
          {pages.length > 0 && <><Heading as="h2" style={{ ...h1, fontSize: '18px' }}>Sider med flest klik</Heading>
            <Section style={card}>{pages.map((p, i) => <Text key={i} style={{ ...text, margin: '4px 0' }}>{`${i + 1}. ${p.name} — ${p.value}`}</Text>)}</Section></>}
          {notes.map((n, i) => <Text key={i} style={text}>{n}</Text>)}
          <Section style={buttonSection}><Button href="https://search.google.com/search-console">Åbn Search Console</Button></Section>
        </Container>
        <Section style={footer}><Text style={footerText}>Månedlig rapport til ejeren af {SITE_NAME}. Tallene kommer fra Google Search Console.</Text></Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SeoReport,
  subject: (d: Record<string, any>) => `SEO-rapport for ${d.period || 'sidste måned'}`,
  to: 'william@adely.dk',
  displayName: 'Månedlig SEO-rapport',
  previewData: {
    period: 'oktober 2026', summary: 'Det går fremad: flere klik og visninger end måneden før.',
    metrics: [{ label: 'Klik', value: '120', change: '+36 %', up: true }, { label: 'Visninger', value: '7.400', change: '+20 %', up: true }],
    queries: [{ name: 'ruteplanlægger', value: '22 klik' }], pages: [{ name: '/blog/ruteoptimering', value: '14 klik' }],
  },
} satisfies TemplateEntry
