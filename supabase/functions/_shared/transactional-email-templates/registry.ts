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
import { template as subscriptionReminder } from './subscription-reminder.tsx'
import { template as subscriptionUpdate } from './subscription-update.tsx'
import { template as employeeWelcome } from './employee-invitation.tsx'
import { template as routeAssigned } from './route-assigned.tsx'
import { template as routeOverview } from './route-overview.tsx'
import { template as manualOrderApproval } from './manual-order-approval.tsx'
import { template as manualOrderConfirmed } from './manual-order-confirmed.tsx'
import { template as employeePasswordReset } from './employee-password-reset.tsx'
import { template as newLead } from './new-lead.tsx'
import { template as newChatMessage } from './new-chat-message.tsx'
import { template as customerNotification } from './customer-notification.tsx'
import { template as customerWelcome } from './customer-welcome.tsx'
import { template as adminImpersonationCode } from './admin-impersonation-code.tsx'
import { template as businessDeletionCode } from './business-deletion-code.tsx'
import { template as betaLaunch } from './beta-launch.tsx'
import { template as businessWelcome } from './business-welcome.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'order-confirmation': orderConfirmation,
  'order-status-update': orderStatusUpdate,
  'subscription-reminder': subscriptionReminder,
  'subscription-update': subscriptionUpdate,
  'employee-welcome': employeeWelcome,
  'route-assigned': routeAssigned,
  'route-overview': routeOverview,
  'manual-order-approval': manualOrderApproval,
  'manual-order-confirmed': manualOrderConfirmed,
  'employee-password-reset': employeePasswordReset,
  'new-lead': newLead,
  'new-chat-message': newChatMessage,
  'customer-notification': customerNotification,
  'customer-welcome': customerWelcome,
  'admin-impersonation-code': adminImpersonationCode,
  'business-deletion-code': businessDeletionCode,
  'beta-launch': betaLaunch,
  'business-welcome': businessWelcome,
}
