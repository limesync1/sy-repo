/** Ca. 100 m fra adressen tæller som "hos kunden"; start af tid er altid manuel. */
export const ARRIVAL_RADIUS_M = 100;
export function arrivalRadius(accuracyM: number | null): number {
  return Math.min(120, Math.max(ARRIVAL_RADIUS_M, (accuracyM ?? 20) * 1.2));
}
export function canDetectArrival(distanceM: number | null, speedMps: number, accuracyM: number | null): boolean {
  return distanceM != null && distanceM <= arrivalRadius(accuracyM) && speedMps <= 3 && (accuracyM ?? 20) <= 100;
}
export function headingDelta(from: number, to: number): number {
  return (((to - from + 180) % 360 + 360) % 360) - 180;
}
