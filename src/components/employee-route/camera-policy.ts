/**
 * Integer tile levels with a dead band and dwell prevent speed-driven zoom pumping.
 * Speed in m/s: tæt på husnummeret i byen (<15 km/t), ud over landskabet på
 * landevej/motorvej (>70 km/t), så føreren ser vejforløbet forude.
 */
export function navigationZoom(speed: number, current: number): number {
  if (current === 18 && speed > 8) return 17;
  if (current === 17 && speed < 4) return 18;
  if (current === 17 && speed > 17) return 16;
  if (current === 16 && speed < 12) return 17;
  if (current === 16 && speed > 22) return 15;
  if (current === 15 && speed < 17) return 16;
  if (current < 15) return 15;
  if (current > 18) return 18;
  return current;
}
