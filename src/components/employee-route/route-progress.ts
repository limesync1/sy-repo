import { haversineMeters } from '@/lib/geo-distance';
/** Project onto road geometry, keeping distance tied to the road rather than a straight line. */
export function roadProgress(pos: [number, number], line: [number, number][]) {
  let nearest = Infinity, progress = 0, total = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const cos = Math.cos(pos[0] * Math.PI / 180);
    const dx = (b[1] - a[1]) * cos, dy = b[0] - a[0];
    const t = Math.max(0, Math.min(1, ((pos[1] - a[1]) * cos * dx + (pos[0] - a[0]) * dy) / (dx * dx + dy * dy || 1)));
    const distance = haversineMeters(pos[0], pos[1], a[0] + dy * t, a[1] + (b[1] - a[1]) * t);
    const length = haversineMeters(a[0], a[1], b[0], b[1]);
    if (distance < nearest) { nearest = distance; progress = total + length * t; }
    total += length;
  }
  return { remaining: Math.max(0, total - progress), total, progress, offRoad: nearest };
}
