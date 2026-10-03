/** Near the entrance is not the same as completing an appointment. */
export function arrivalRadius(accuracyM: number | null): number {
  return Math.min(65, Math.max(45, (accuracyM ?? 20) * 1.4 + 4));
}
export function canDetectArrival(distanceM: number | null, speedMps: number, accuracyM: number | null): boolean {
  return distanceM != null && distanceM <= arrivalRadius(accuracyM) && speedMps <= 3 && (accuracyM ?? 20) <= 65;
}
export function headingDelta(from: number, to: number): number {
  return (((to - from + 180) % 360 + 360) % 360) - 180;
}
