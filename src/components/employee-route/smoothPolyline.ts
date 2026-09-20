/**
 * Centripetal Catmull-Rom spline interpolation for lat/lng polylines.
 *
 * Rutetjenesten returnerer rute-geometrier som en serie af brudte linjer — i drej
 * giver det skarpe "knæk" hvor flere segmenter mødes i et punkt.  Ved at
 * interpolere ekstra punkter via en centripetal Catmull-Rom spline får vi
 * blødt buede svinger uden at afvige mærkbart fra den oprindelige rute.
 *
 * Vi bruger ækvirektangulær (lokal) projektion til selve interpolationen
 * — det er præcist nok til ruter på <100 km og meget billigere end fuld
 * sfærisk math.  Tæthed (samples pr. segment) skaleres ned med segment-
 * længde for ikke at bombardere Leaflet med ekstra punkter på lange,
 * rette stykker hvor det ikke er nødvendigt.
 */

const toRad = (d: number) => (d * Math.PI) / 180;
const M_PER_DEG_LAT = 111320;

/** Centripetal Catmull-Rom interpolering mellem p1 og p2 med kontrolpunkter p0, p3. */
const catmullRom = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  samples: number,
): [number, number][] => {
  const out: [number, number][] = [];
  // Centripetal alpha = 0.5 (giver glatte kurver uden loops).
  const alpha = 0.5;
  const t01 = Math.pow(distance2d(p0, p1), alpha);
  const t12 = Math.pow(distance2d(p1, p2), alpha);
  const t23 = Math.pow(distance2d(p2, p3), alpha);
  const safe = (v: number) => (v < 1e-9 ? 1e-9 : v);
  const T01 = safe(t01);
  const T12 = safe(t12);
  const T23 = safe(t23);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const tt = T12 * t;
    // De Boor-style blending.
    const a1x = ((T01 - tt) / T01) * p0[0] + (tt / T01) * p1[0];
    const a1y = ((T01 - tt) / T01) * p0[1] + (tt / T01) * p1[1];
    const a2x = ((T12 - tt) / T12) * p1[0] + (tt / T12) * p2[0];
    const a2y = ((T12 - tt) / T12) * p1[1] + (tt / T12) * p2[1];
    const a3x = ((T23 - tt) / T23) * p2[0] + (tt / T23) * p3[0];
    const a3y = ((T23 - tt) / T23) * p2[1] + (tt / T23) * p3[1];
    const b1x = ((T01 + T12 - tt) / (T01 + T12)) * a1x + (tt / (T01 + T12)) * a2x;
    const b1y = ((T01 + T12 - tt) / (T01 + T12)) * a1y + (tt / (T01 + T12)) * a2y;
    const b2x = ((T12 + T23 - tt) / (T12 + T23)) * a2x + (tt / (T12 + T23)) * a3x;
    const b2y = ((T12 + T23 - tt) / (T12 + T23)) * a2y + (tt / (T12 + T23)) * a3y;
    const cx = ((T12 - tt) / T12) * b1x + (tt / T12) * b2x;
    const cy = ((T12 - tt) / T12) * b1y + (tt / T12) * b2y;
    out.push([cx, cy]);
  }
  return out;
};

const distance2d = (a: [number, number], b: [number, number]) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
};

/** Approx meter-distance mellem to lat/lng punkter (lokal flad approx). */
const meterDistance = (a: [number, number], b: [number, number]): number => {
  const dLat = (b[0] - a[0]) * M_PER_DEG_LAT;
  const cosLat = Math.cos(toRad((a[0] + b[0]) / 2));
  const dLng = (b[1] - a[1]) * M_PER_DEG_LAT * cosLat;
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

/**
 * Glat en polyline med Catmull-Rom.
 *
 * - Korte segmenter (≤8 m) = ingen ekstra punkter (det er allerede tæt nok).
 * - Lange segmenter (≥150 m) = beholdes som rette linjer (det er typisk
 *   motorvej/lige strækninger hvor interpolation kun er støj).
 * - Mellemstore segmenter (8-150 m) = 2-6 ekstra interpolerede punkter
 *   afhængigt af længde — det er her drej og bløde sving findes.
 *
 * Resultatet er typisk 2-3× flere punkter, men de ekstra punkter er
 * koncentreret i sving hvor de gør størst forskel visuelt.
 */
export const smoothPolyline = (line: [number, number][]): [number, number][] => {
  const n = line.length;
  if (n < 4) return line.slice();
  const out: [number, number][] = [];
  out.push(line[0]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = line[i === 0 ? 0 : i - 1];
    const p1 = line[i];
    const p2 = line[i + 1];
    const p3 = line[i + 2 < n ? i + 2 : n - 1];
    const segM = meterDistance(p1, p2);
    if (segM <= 8) {
      // Allerede tæt — ingen interpolation.
    } else if (segM >= 150) {
      // Lang og lige — ingen interpolation, undgå unødigt detail.
    } else {
      // Vælg samples afhængigt af længde: 2 (korte) → 6 (mellemlange).
      const samples = Math.max(2, Math.min(6, Math.round(segM / 25)));
      const interp = catmullRom(p0, p1, p2, p3, samples);
      for (const pt of interp) out.push(pt);
    }
    out.push(p2);
  }
  return out;
};