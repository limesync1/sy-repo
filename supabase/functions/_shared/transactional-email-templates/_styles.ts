// Shared inline styles for Serviceydere transactional emails — Swiss Clean design.

export const SITE_NAME = 'Serviceydere'
export const SITE_URL = 'https://serviceydere.dk'
export const SUPPORT_EMAIL = 'kontakt@serviceydere.dk'
// Cache-bust v2 — sikrer at e-mail-klienter henter det opdaterede logo
// efter ny upload til storage. Bump versionen hvis logoet udskiftes igen.
export const LOGO_URL =
  'https://gkectsellkpltrxvusot.supabase.co/storage/v1/object/public/email-assets/serviceydere-logo-dark.png?v=2'

// Palette
const ink = '#212121'        // foreground (matches site --foreground 0 0% 13%)
const inkSoft = '#525252'    // body text
const mutedColor = '#737373'      // labels
const subtle = '#a3a3a3'     // footer
const line = '#ececec'       // borders / dividers
const surface = '#fafafa'    // very subtle surfaces
const teal = '#015c96'       // accent (matches site --accent, dark-blue)

export const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0,
  padding: '32px 16px',
  color: ink,
}
export const wrapper = {
  backgroundColor: '#ffffff',
  maxWidth: '560px',
  margin: '0 auto',
}
export const container = { padding: 0 }
export const headerBar = {
  padding: '0 0 24px',
  borderBottom: `1px solid ${line}`,
  marginBottom: '32px',
}
export const logoSection = { margin: 0 }
export const logo = { display: 'block', height: '32px' }
export const headerSiteName = {
  color: ink,
  fontSize: '15px',
  fontWeight: 600 as const,
  letterSpacing: '-0.005em',
  margin: 0,
}
export const heroSection = {
  margin: '0 0 24px',
}
export const heroTitle = {
  color: ink,
  fontSize: '26px',
  fontWeight: 600 as const,
  margin: '0 0 8px',
  lineHeight: '1.2',
  letterSpacing: '-0.015em',
}
export const heroSubtitle = {
  color: mutedColor,
  fontSize: '14px',
  margin: 0,
  lineHeight: '1.6',
}
export const h1 = {
  fontSize: '26px',
  fontWeight: 600 as const,
  color: ink,
  margin: '0 0 12px',
  lineHeight: '1.2',
  letterSpacing: '-0.015em',
}
export const h2 = {
  fontSize: '12px',
  fontWeight: 600 as const,
  color: mutedColor,
  margin: '24px 0 10px',
  letterSpacing: '0.02em',
}
export const text = {
  fontSize: '15px',
  color: inkSoft,
  lineHeight: '1.65',
  margin: '0 0 14px',
}
export const muted = {
  fontSize: '13px',
  color: mutedColor,
  lineHeight: '1.55',
  margin: '0 0 12px',
}
export const tinyMuted = {
  fontSize: '12px',
  color: subtle,
  lineHeight: '1.5',
  margin: '12px 0 0',
}
export const link = { color: ink, textDecoration: 'underline', fontWeight: 500 as const }
export const buttonSection = { margin: '24px 0 8px', textAlign: 'left' as const }
export const button = {
  backgroundColor: ink,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500 as const,
  borderRadius: '8px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.01em',
}
export const buttonSecondary = {
  backgroundColor: '#ffffff',
  color: ink,
  fontSize: '13px',
  fontWeight: 500 as const,
  borderRadius: '8px',
  padding: '10px 18px',
  textDecoration: 'none',
  display: 'inline-block',
  border: `1px solid ${line}`,
}
export const card = {
  border: `1px solid ${line}`,
  borderRadius: '10px',
  padding: '18px 20px',
  margin: '14px 0 22px',
}
export const cardAccent = {
  backgroundColor: surface,
  border: `1px solid ${line}`,
  borderRadius: '10px',
  padding: '16px 20px',
  margin: '20px 0',
}
export const cardWarning = {
  border: `1px solid ${line}`,
  borderLeft: `3px solid ${teal}`,
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '20px 0',
  backgroundColor: '#ffffff',
}
export const cardRow = {
  fontSize: '14px',
  color: inkSoft,
  margin: '4px 0',
  lineHeight: '1.55',
}
export const cardLabel = {
  fontSize: '12px',
  color: mutedColor,
  margin: '0 0 4px',
  fontWeight: 500 as const,
}
export const cardValue = {
  fontSize: '15px',
  color: ink,
  fontWeight: 500 as const,
  margin: '0 0 12px',
  lineHeight: '1.45',
}
export const totalRow = {
  fontSize: '15px',
  fontWeight: 600 as const,
  color: ink,
  marginTop: '14px',
  paddingTop: '14px',
  borderTop: `1px solid ${line}`,
}
export const itemRow = {
  padding: '12px 0',
  borderBottom: `1px solid ${line}`,
}
export const itemRowLast = {
  padding: '12px 0',
}
export const itemName = {
  fontSize: '14px',
  fontWeight: 500 as const,
  color: ink,
  margin: '0 0 2px',
}
export const itemDetail = {
  fontSize: '12px',
  color: mutedColor,
  margin: '2px 0 0',
  lineHeight: '1.5',
}
export const itemPrice = {
  fontSize: '14px',
  fontWeight: 600 as const,
  color: ink,
  textAlign: 'right' as const,
}
export const stepLine = {
  fontSize: '12px',
  color: mutedColor,
  margin: '3px 0',
  paddingLeft: '8px',
}
export const footer = {
  borderTop: `1px solid ${line}`,
  marginTop: '36px',
  padding: '24px 0 0',
  textAlign: 'left' as const,
}
export const footerText = {
  fontSize: '12px',
  color: subtle,
  margin: '0 0 4px',
  lineHeight: '1.6',
}
export const footerLink = {
  color: inkSoft,
  textDecoration: 'none',
  fontWeight: 500 as const,
  margin: '0 8px 0 0',
  fontSize: '12px',
}
export const helpBox = {
  borderTop: `1px solid ${line}`,
  paddingTop: '18px',
  margin: '24px 0 0',
}
export const helpBoxTitle = {
  fontSize: '13px',
  fontWeight: 600 as const,
  color: ink,
  margin: '0 0 4px',
}
export const helpBoxText = {
  fontSize: '13px',
  color: mutedColor,
  margin: 0,
  lineHeight: '1.55',
}
export const stepList = {
  margin: '4px 0 16px',
  padding: 0,
  listStyle: 'none' as const,
}
export const stepItem = {
  fontSize: '14px',
  color: inkSoft,
  margin: '8px 0',
  lineHeight: '1.55',
  paddingLeft: '26px',
  position: 'relative' as const,
}
export const stepNumber = {
  display: 'inline-block',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: ink,
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 600 as const,
  textAlign: 'center' as const,
  lineHeight: '20px',
  marginRight: '8px',
  position: 'absolute' as const,
  left: 0,
  top: '1px',
}
export const badge = (color: string, _bg: string) => ({
  display: 'inline-block',
  color: color === '#ffffff' ? ink : color,
  border: `1px solid ${line}`,
  backgroundColor: '#ffffff',
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 500 as const,
  letterSpacing: '0.02em',
})
export const divider = {
  borderTop: `1px solid ${line}`,
  margin: '24px 0',
}
