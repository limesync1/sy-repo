import { describe, expect, it, vi } from 'vitest';
import { mayCancelAppointment, checkCancellationAccess, shouldCreateCredit, documentMailKey } from '../../supabase/functions/_shared/accounting/action-rules';
import { formatInterval, validateServiceIntervals } from './interval';
describe('accounting action rules', () => {
  it.each(['office', 'now'])('authorizes cancellation before the %s credit option through the callable preflight', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    expect(await checkCancellationAccess({ rpc }, 'assigned-stop', 'assigned-order')).toBe(true);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('employee_can_cancel_appointment', { _stop_id: 'assigned-stop', _order_id: 'assigned-order' });
  });
  it('denies a mismatched order or failed access check', async () => {
    expect(await checkCancellationAccess({ rpc: async () => ({ data: false, error: null }) }, 'stop', 'other')).toBe(false);
    expect(await checkCancellationAccess({ rpc: async () => ({ data: null, error: { code: '42501' } }) }, 'stop', 'order')).toBe(false);
  });
  it('employees may cancel only their assigned order', () => {
    expect(mayCancelAppointment(false, 'assigned', 'assigned')).toBe(true);
    expect(mayCancelAppointment(false, 'other', 'assigned')).toBe(false);
    expect(mayCancelAppointment(false, null, 'assigned')).toBe(false);
  });
  it('retrying an existing credit never creates another credit note', () => {
    expect(shouldCreateCredit('credited')).toBe(false);
    expect(shouldCreateCredit('paid')).toBe(true);
  });
  it('credit email retries share the triggering document key', () => {
    expect(documentMailKey('o','c',true,1)).toBe(documentMailKey('o','c',true,999999));
    expect(documentMailKey('o','c2',true,1)).not.toBe(documentMailKey('o','c',true,1));
  });
  it('the removable one-hour test option is valid alongside normal intervals', () => {
    expect(validateServiceIntervals(['engangskøb','every_1_hour_test','daglig']).ok).toBe(true);
    expect(formatInterval('every_1_hour_test')).toBe('Hver 1 time (test)');
  });
});