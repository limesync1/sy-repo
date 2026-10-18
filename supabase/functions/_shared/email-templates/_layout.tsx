/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

export const LOGO_URL = 'https://gkectsellkpltrxvusot.supabase.co/storage/v1/object/public/email-assets/serviceydere-logo-dark.png?v=2'
const ink = '#0f172a', soft = '#475569', muted = '#64748b', line = '#e2e8f0', teal = '#0b8a96'

const s = {
  main: { backgroundColor: '#f1f5f9', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', margin: 0, padding: '40px 12px', color: ink },
  card: { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', border: `1px solid ${line}`, borderTop: `4px solid ${teal}`, overflow: 'hidden' as const },
  head: { padding: '28px 36px 0' },
  body: { padding: '24px 36px 32px' },
  eyebrow: { fontSize: '12px', fontWeight: 700 as const, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: teal, margin: '0 0 10px' },
  h1: { fontSize: '26px', lineHeight: '1.25', fontWeight: 700 as const, color: ink, margin: '0 0 14px', letterSpacing: '-0.015em' },
  text: { fontSize: '16px', lineHeight: '1.65', color: soft, margin: '0 0 16px' },
  btnWrap: { margin: '28px 0 24px' },
  btn: { backgroundColor: teal, color: '#ffffff', fontSize: '16px', fontWeight: 600 as const, borderRadius: '10px', padding: '15px 28px', textDecoration: 'none', display: 'inline-block' },
  fallback: { backgroundColor: '#f8fafc', border: `1px solid ${line}`, borderRadius: '10px', padding: '14px 16px', margin: '0 0 8px' },
  small: { fontSize: '13px', lineHeight: '1.6', color: muted, margin: '0 0 6px' },
  smallLink: { fontSize: '12px', color: teal, wordBreak: 'break-all' as const },
  note: { borderTop: `1px solid ${line}`, paddingTop: '18px', marginTop: '24px' },
  foot: { maxWidth: '560px', margin: '0 auto', padding: '20px 36px', textAlign: 'center' as const },
  footText: { fontSize: '12px', lineHeight: '1.6', color: '#94a3b8', margin: '0 0 4px' },
  footLink: { color: muted, textDecoration: 'underline' },
  codeBox: { backgroundColor: '#f8fafc', border: `1px solid ${line}`, borderRadius: '12px', padding: '22px', textAlign: 'center' as const, margin: '8px 0 20px' },
  code: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '32px', fontWeight: 700 as const, letterSpacing: '0.3em', color: ink, margin: 0 },
}

interface Props {
  preview: string
  eyebrow: string
  title: string
  children: React.ReactNode
  cta?: { label: string; href: string }
  code?: string
  note: string
}

export const AuthLayout = ({ preview, eyebrow, title, children, cta, code, note }: Props) => (
  <Html lang="da" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={s.main}>
      <Container style={s.card}>
        <Section style={s.head}><Img src={LOGO_URL} alt="Serviceydere" height="32" style={{ display: 'block', height: '32px' }} /></Section>
        <Section style={s.body}>
          <Text style={s.eyebrow}>{eyebrow}</Text>
          <Heading style={s.h1}>{title}</Heading>
          {children}
          {code && <Section style={s.codeBox}><Text style={s.code}>{code}</Text></Section>}
          {cta && (
            <>
              <Section style={s.btnWrap}><Button style={s.btn} href={cta.href}>{cta.label}</Button></Section>
              <Section style={s.fallback}>
                <Text style={s.small}>Virker knappen ikke? Kopiér linket ind i din browser:</Text>
                <Link href={cta.href} style={s.smallLink}>{cta.href}</Link>
              </Section>
            </>
          )}
          <Section style={s.note}><Text style={{ ...s.small, margin: 0 }}>{note}</Text></Section>
        </Section>
      </Container>
      <Section style={s.foot}>
        <Text style={s.footText}>Serviceydere · Software og markedsplads for serviceydere i Danmark</Text>
        <Text style={s.footText}>Spørgsmål? <Link href="mailto:kontakt@serviceydere.dk" style={s.footLink}>kontakt@serviceydere.dk</Link></Text>
      </Section>
    </Body>
  </Html>
)

export const P = ({ children }: { children: React.ReactNode }) => <Text style={s.text}>{children}</Text>
export const Strong = ({ children }: { children: React.ReactNode }) => <strong style={{ color: ink }}>{children}</strong>
