import { describe, expect, it } from 'vitest';
import { mayCancelAppointment, shouldCreateCredit, documentMailKey } from '../../supabase/functions/_shared/accounting/action-rules';
import { formatInterval, validateServiceIntervals } from './interval';
describe('accounting action rules', () => {
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