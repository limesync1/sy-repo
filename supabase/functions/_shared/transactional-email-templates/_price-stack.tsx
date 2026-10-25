import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { formatExVat, formatIncVat } from './_service-price.ts'

/** Two stacked lines: first uden moms (bold), then med moms (muted). Wraps safely on mobile. */
export const PriceStack = ({ amount, size = 14, align = 'left' }: { amount: number; size?: number; align?: 'left' | 'right' }) => (
  <>
    <Text style={{ margin: 0, fontSize: `${size}px`, fontWeight: 600, color: '#0f172a', lineHeight: '1.4', textAlign: align, wordBreak: 'break-word' as const }}>
      {formatExVat(amount)}
    </Text>
    <Text style={{ margin: '2px 0 0', fontSize: `${Math.max(12, size - 2)}px`, color: '#64748b', lineHeight: '1.4', textAlign: align, wordBreak: 'break-word' as const }}>
      {formatIncVat(amount)}
    </Text>
  </>
)
