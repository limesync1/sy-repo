// Pure rules shared by the action handler and regression tests.
export const mayCancelAppointment = (isOwner: boolean, assignedOrderId: string | null, orderId: string) =>
  isOwner || assignedOrderId === orderId;
export const shouldCreateCredit = (paymentStatus: string | null) => paymentStatus !== 'credited';
export const documentMailKey = (orderId: string, documentId: string, isCredit: boolean, now: number) =>
  isCredit ? `credit-document-${orderId}-${documentId}` : `invoice-resend-${orderId}-${Math.floor(now / 60000)}`;