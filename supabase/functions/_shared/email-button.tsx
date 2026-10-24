/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

// Bulletproof email button: the colored cell carries the background so the
// button keeps its shape in Outlook, Gmail and dark-mode clients.
interface Props { href: string; style?: React.CSSProperties; children: React.ReactNode; className?: string }

export const Button = ({ href, style = {}, children }: Props) => {
  const bg = (style.backgroundColor as string) || '#016EA4'
  const color = (style.color as string) || '#ffffff'
  const border = (style.border as string) || `1px solid ${bg}`
  const radius = (style.borderRadius as string) || '10px'
  const fontSize = (style.fontSize as string) || '16px'
  const padding = (style.padding as string) || '14px 26px'
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: 'separate', display: 'inline-table', margin: '0 8px 8px 0' }}>
      <tbody><tr>
        <td align="center" bgcolor={bg} style={{ backgroundColor: bg, borderRadius: radius, border }}>
          <a href={href} target="_blank" style={{
            display: 'inline-block', padding, minWidth: '120px', textAlign: 'center',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
            fontSize, fontWeight: (style.fontWeight as any) || 600, lineHeight: '20px',
            color, textDecoration: 'none', borderRadius: radius,
          }}>{children}</a>
        </td>
      </tr></tbody>
    </table>
  )
}
