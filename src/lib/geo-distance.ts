/** Haversine distance in meters between two lat/lng points. */
export const haversineMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Bearing in degrees from point A to point B. 0 = north, 90 = east. */
export const bearingDegrees = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/**
 * Korteste afstand i meter fra et punkt (lat,lng) til et linje-segment (a→b).
 * Bruger en lille ækvirektangulær projektion lokalt — præcis nok til
 * <50km segmenter og meget hurtigere end fuld great-circle math.
 */
const pointToSegmentMeters = (
  lat: number,
  lng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  // Lokal projektion centreret omkring punktet a.
  const cosLat = Math.cos(toRad((aLat + bLat) / 2));
  const mPerDegLat = 111320; // meter pr. grad bredde
  const ax = 0;
  const ay = 0;
  const bx = (bLng - aLng) * mPerDegLat * cosLat;
  const by = (bLat - aLat) * mPerDegLat;
  const px = (lng - aLng) * mPerDegLat * cosLat;
  const py = (lat - aLat) * mPerDegLat;
  const dx = bx - ax;
  const dy = by - ay;
  const segLen2 = dx * dx + dy * dy;
  if (segLen2 === 0) {
    // a == b
    return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / segLen2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
};

/**
 * Korteste afstand i meter fra et punkt til en polyline ([[lat,lng], ...]).
 * Returnerer Infinity for tomme linjer.
 */
export const pointToPolylineMeters = (
  lat: number,
  lng: number,
  line: [number, number][],
): number => {
  if (!line || line.length < 2) return Infinity;
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const d = pointToSegmentMeters(lat, lng, a[0], a[1], b[0], b[1]);
    if (d < min) min = d;
    // Tidlig exit hvis vi allerede er på linjen — ingen grund til at fortsætte.
    if (min < 0.5) return min;
  }
  return min;
};