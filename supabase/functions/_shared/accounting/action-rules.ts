// Pure rules shared by the action handler and regression tests.
export const mayCancelAppointment = (isOwner: boolean, assignedOrderId: string | null, orderId: string) =>
  isOwner || assignedOrderId === orderId;
type CancellationClient = {
  rpc: (name: string, args: { _stop_id: string; _order_id: string }) => PromiseLike<{ data: unknown; error: unknown }>;
};
export async function checkCancellationAccess(client: CancellationClient, stopId: string, orderId: string): Promise<boolean> {
  const { data, error } = await client.rpc('employee_can_cancel_appointment', { _stop_id: stopId, _order_id: orderId });
  return !error && data === true;
}
export const shouldCreateCredit = (paymentStatus: string | null) => paymentStatus !== 'credited';
export const documentMailKey = (orderId: string, documentId: string, isCredit: boolean, now: number) =>
  isCredit ? `credit-document-${orderId}-${documentId}` : `invoice-resend-${orderId}-${Math.floor(now / 60000)}`;