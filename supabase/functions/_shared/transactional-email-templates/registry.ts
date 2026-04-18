/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as orderStatusUpdate } from './order-status-update.tsx'
import { template as quoteReceived } from './quote-received.tsx'
import { template as subscriptionReminder } from './subscription-reminder.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'order-confirmation': orderConfirmation,
  'order-status-update': orderStatusUpdate,
  'quote-received': quoteReceived,
  'subscription-reminder': subscriptionReminder,
}
