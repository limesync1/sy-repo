// Shared inline styles for Serviceydere transactional emails.
// Mirrors the look of the auth email templates.

export const SITE_NAME = 'Serviceydere'
export const SITE_URL = 'https://serviceydere.dk'
export const SUPPORT_EMAIL = 'kontakt@serviceydere.dk'
export const LOGO_URL =
  'https://gkectsellkpltrxvusot.supabase.co/storage/v1/object/public/email-assets/serviceydere-logo.png'

export const main = {
  backgroundColor: '#f5f6f8',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0,
  padding: '24px 0',
}
export const wrapper = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e5e7eb',
  maxWidth: '600px',
  margin: '0 auto',
  overflow: 'hidden',
}
export const container = { padding: '32px 32px 28px' }
export const headerBar = {
  backgroundColor: '#0d1729',
  padding: '20px 32px',
}
export const logoSection = { margin: 0 }
export const logo = { display: 'block' }
export const headerSiteName = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 700 as const,
  letterSpacing: '-0.01em',
  margin: 0,
}
export const heroSection = {
  backgroundColor: '#0d1729',
  padding: '0 32px 28px',
}
export const heroTitle = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 700 as const,
  margin: '0 0 8px',
  letterSpacing: '-0.01em',
  lineHeight: '1.3',
}
export const heroSubtitle = {
  color: '#a3b3cc',
  fontSize: '14px',
  margin: 0,
  lineHeight: '1.5',
}
export const h1 = {
  fontSize: '22px',
  fontWeight: 700 as const,
  color: '#0d1729',
  margin: '0 0 12px',
  letterSpacing: '-0.01em',
}
export const h2 = {
  fontSize: '13px',
  fontWeight: 700 as const,
  color: '#0d1729',
  margin: '24px 0 10px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
}
export const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 14px',
}
export const muted = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: '1.55',
  margin: '0 0 12px',
}
export const tinyMuted = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: '1.5',
  margin: '12px 0 0',
}
export const link = { color: '#0d1729', textDecoration: 'underline', fontWeight: 600 as const }
export const buttonSection = { margin: '24px 0 8px', textAlign: 'center' as const }
export const button = {
  backgroundColor: '#11c4ce',
  color: '#0d1729',
  fontSize: '15px',
  fontWeight: 700 as const,
  borderRadius: '12px',
  padding: '14px 26px',
  textDecoration: 'none',
  display: 'inline-block',
}
export const buttonSecondary = {
  backgroundColor: '#ffffff',
  color: '#0d1729',
  fontSize: '14px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '10px 18px',
  textDecoration: 'none',
  display: 'inline-block',
  border: '1px solid #d1d5db',
}
export const card = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '18px 20px',
  margin: '12px 0 20px',
}
export const cardAccent = {
  backgroundColor: '#ecfeff',
  border: '1px solid #a5f3fc',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '20px 0',
}
export const cardWarning = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '20px 0',
}
export const cardRow = {
  fontSize: '14px',
  color: '#374151',
  margin: '4px 0',
  lineHeight: '1.5',
}
export const cardLabel = {
  fontSize: '11px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  margin: '0 0 4px',
  fontWeight: 600 as const,
}
export const cardValue = {
  fontSize: '14px',
  color: '#0d1729',
  fontWeight: 600 as const,
  margin: '0 0 12px',
  lineHeight: '1.4',
}
export const totalRow = {
  fontSize: '17px',
  fontWeight: 700 as const,
  color: '#0d1729',
  marginTop: '14px',
  paddingTop: '14px',
  borderTop: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between' as const,
}
export const itemRow = {
  padding: '10px 0',
  borderBottom: '1px solid #e5e7eb',
}
export const itemRowLast = {
  padding: '10px 0',
}
export const itemName = {
  fontSize: '14px',
  fontWeight: 600 as const,
  color: '#0d1729',
  margin: '0 0 2px',
}
export const itemDetail = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '2px 0 0',
  lineHeight: '1.4',
}
export const itemPrice = {
  fontSize: '14px',
  fontWeight: 700 as const,
  color: '#0d1729',
  textAlign: 'right' as const,
}
export const stepLine = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '2px 0',
  paddingLeft: '8px',
}
export const footer = {
  backgroundColor: '#f9fafb',
  borderTop: '1px solid #e5e7eb',
  padding: '20px 32px',
  textAlign: 'center' as const,
}
export const footerText = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 6px',
  lineHeight: '1.5',
}
export const footerLink = {
  color: '#0d1729',
  textDecoration: 'none',
  fontWeight: 600 as const,
  margin: '0 8px',
  fontSize: '12px',
}
export const helpBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '14px 18px',
  margin: '24px 0 0',
}
export const helpBoxTitle = {
  fontSize: '13px',
  fontWeight: 700 as const,
  color: '#0d1729',
  margin: '0 0 4px',
}
export const helpBoxText = {
  fontSize: '13px',
  color: '#6b7280',
  margin: 0,
  lineHeight: '1.5',
}
export const stepList = {
  margin: '4px 0 16px',
  padding: 0,
  listStyle: 'none' as const,
}
export const stepItem = {
  fontSize: '14px',
  color: '#374151',
  margin: '6px 0',
  lineHeight: '1.5',
  paddingLeft: '24px',
  position: 'relative' as const,
}
export const stepNumber = {
  display: 'inline-block',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#0d1729',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 700 as const,
  textAlign: 'center' as const,
  lineHeight: '20px',
  marginRight: '8px',
  position: 'absolute' as const,
  left: 0,
  top: '1px',
}
export const badge = (color: string, bg: string) => ({
  display: 'inline-block',
  backgroundColor: bg,
  color,
  padding: '5px 14px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700 as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
})
export const divider = {
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
}
