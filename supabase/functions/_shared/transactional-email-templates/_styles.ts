// Shared inline styles for Serviceydere transactional emails.
// Mirrors the look of the auth email templates.

export const SITE_NAME = 'Serviceydere'
export const SITE_URL = 'https://serviceydere.dk'
export const LOGO_URL =
  'https://gkectsellkpltrxvusot.supabase.co/storage/v1/object/public/email-assets/serviceydere-logo.png'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
}
export const container = { padding: '32px 28px', maxWidth: '560px' }
export const logoSection = { marginBottom: '24px' }
export const logo = { display: 'block' }
export const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0d1729',
  margin: '0 0 16px',
  letterSpacing: '-0.01em',
}
export const text = {
  fontSize: '15px',
  color: '#4b5563',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
export const muted = {
  fontSize: '12px',
  color: '#9ca3af',
  lineHeight: '1.5',
  margin: '24px 0 0',
}
export const link = { color: '#0d1729', textDecoration: 'underline' }
export const buttonSection = { margin: '24px 0 8px' }
export const button = {
  backgroundColor: '#0d1729',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
export const card = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px',
  margin: '16px 0 24px',
}
export const cardRow = {
  fontSize: '14px',
  color: '#4b5563',
  margin: '4px 0',
  lineHeight: '1.5',
}
export const cardLabel = {
  fontSize: '12px',
  color: '#9ca3af',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 4px',
}
export const totalRow = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#0d1729',
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid #e5e7eb',
}
export const footer = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '32px 0 0',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '16px',
}
export const badge = (color: string, bg: string) => ({
  display: 'inline-block',
  backgroundColor: bg,
  color,
  padding: '4px 12px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
})
