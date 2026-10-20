/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, wrapper, container, headerBar,
  h1, text, footer, footerText,
} from './_styles.ts'

interface Props {
  subject?: string
  body?: string
  businessName?: string
}

// Generisk skabelon der bruges af alle kunde-notifikationer (planlagt, udført,
// osv.). Selve teksten bestemmes pr. virksomhed via customer_notification_templates
// og pladsholdere er allerede udfyldt af dispatcheren.
const CustomerNotificationEmail = ({ subject, body, businessName }: Props) => {
  const paragraphs = (body ?? '').split(/\n\s*\n/).map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean)).filter((p) => p.length > 0)
  return (
    <Html lang="da" dir="ltr">
      <Head />
      <Preview>{subject ?? `Besked fra ${businessName ?? SITE_NAME}`}</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={headerBar}>
            <Img src={LOGO_URL} alt={SITE_NAME} height="36" style={{ display: 'block' }} />
          </Section>
          <Container style={container}>
            <Heading style={h1}>{subject}</Heading>
            {paragraphs.map((p, i) => (
              <Text key={i} style={text}>{p.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{l}</React.Fragment>)}</Text>
            ))}
            <Text style={{ ...footerText, marginTop: '20px' }}>Eventuelle servicepriser er uden moms. Moms kommer oveni.</Text>
          </Container>
          <Section style={footer}>
            <Text style={footerText}>
              Sendt af {businessName ?? SITE_NAME} via {SITE_NAME}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CustomerNotificationEmail,
  subject: (data: Record<string, any>) => data?.subject ?? 'Besked',
  displayName: 'Kunde-notifikation (generisk)',
  previewData: {
    subject: 'Vi kommer i morgen',
    body: 'Hej Mette,\n\nVi kigger forbi i morgen og udfører jeres aftalte rengøring.\n\nVenlig hilsen,\nRengøring København',
    businessName: 'Rengøring København',
  },
} satisfies TemplateEntry

export default CustomerNotificationEmail
