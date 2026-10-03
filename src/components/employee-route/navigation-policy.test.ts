import { describe, expect, it } from 'vitest';
import { arrivalRadius, canDetectArrival, headingDelta } from './navigation-policy';
describe('navigation proximity', () => {
  it('recognizes a stopped driver 40 metres from the entrance', () => { expect(canDetectArrival(40, 0, 8)).toBe(true); });
  it('does not start work while driving past or with poor GPS', () => { expect(canDetectArrival(40, 12, 8)).toBe(false); expect(canDetectArrival(40, 0, 100)).toBe(false); });
  it('bounds the radius and rotates along the shortest arc', () => { expect(arrivalRadius(100)).toBe(65); expect(headingDelta(359, 1)).toBe(2); });
  it('handles negative camera bearings without a full rotation', () => { expect(headingDelta(270, -90)).toBe(0); expect(headingDelta(359, -1)).toBe(0); });
});
