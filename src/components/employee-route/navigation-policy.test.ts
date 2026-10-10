import { describe, expect, it } from 'vitest';
import { arrivalRadius, arrivalDwellMs, canDetectArrival, headingDelta } from './navigation-policy';
describe('navigation proximity', () => {
  it('recognizes accurate slow arrival immediately but confirms uncertain GPS', () => {
    expect(arrivalDwellMs(80, 0, 10)).toBe(0);
    expect(arrivalDwellMs(80, 1, 25)).toBe(0);
    expect(arrivalDwellMs(80, 0, 70)).toBe(1000);
    expect(arrivalDwellMs(80, 12, 10)).toBe(1000);
  });
  it('recognizes a stopped driver 40 metres from the entrance', () => { expect(canDetectArrival(40, 0, 8)).toBe(true); });
  it('does not start work while driving past or with poor GPS', () => { expect(canDetectArrival(40, 12, 8)).toBe(false); expect(canDetectArrival(40, 0, 150)).toBe(false); });
  it('bounds the radius and rotates along the shortest arc', () => { expect(arrivalRadius(10)).toBe(100); expect(arrivalRadius(200)).toBe(120); expect(headingDelta(359, 1)).toBe(2); });
  it('counts 95 m as at the customer', () => { expect(canDetectArrival(95, 0, 15)).toBe(true); expect(canDetectArrival(130, 0, 15)).toBe(false); });
  it('handles negative camera bearings without a full rotation', () => { expect(headingDelta(270, -90)).toBe(0); expect(headingDelta(359, -1)).toBe(0); });
});
