/** Integer tile levels with a dead band and dwell prevent speed-driven zoom pumping. */
export function navigationZoom(speed: number, current: number): number {
  if (current === 18 && speed > 8) return 17;
  if (current === 17 && speed < 4) return 18;
  if (current === 17 && speed > 17) return 16;
  if (current === 16 && speed < 12) return 17;
  return current;
}