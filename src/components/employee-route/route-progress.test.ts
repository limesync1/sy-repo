import { expect, it } from 'vitest';
import { roadProgress } from './route-progress';
it('reduces remaining road distance as the driver moves', () => {
 const line: [number, number][] = [[56,9],[56.001,9],[56.001,9.001]];
 expect(roadProgress([56,9],line).remaining).toBeGreaterThan(roadProgress([56.001,9],line).remaining);
 expect(roadProgress([56.001,9.001],line).remaining).toBeLessThan(1);
});
