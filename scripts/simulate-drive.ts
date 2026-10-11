/**
 * Simuleret kørsel af Haderup–Herning gennem positionsmotoren.
 *
 *   bun scripts/simulate-drive.ts            (kræver en gyldig session i ~/.cache/lovable-auth)
 *
 * Henter samme ruter som appen (oversigt og vejvisning) via route-directions,
 * laver et realistisk GPS-spor (støj, bygninger, tunnel, iPhone uden fart,
 * dubletter) og afspiller det gennem PositionEngine og den tidligere metode.
 * Skriver en rapport og et JSON-datasæt til /mnt/documents.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { PositionEngine, RouteLine, type RawFix } from "../src/components/employee-route/positionEngine";
import { haversineMeters, bearingDegrees } from "../src/lib/geo-distance";

type LL = [number, number];
const BUSINESS_ID = "8258070b-acc7-4145-b236-e2157001563c";

/** Planlagt rækkefølge. stored = appens koordinater, google = Googles geokodning (ROOFTOP/centrum). */
const STOPS: { name: string; address: string; stored: LL; google: LL }[] = [
  { name: "FDF Genbrugsbutikken Haderup", address: "Nygade 3, 7540 Haderup", stored: [56.390449, 8.996852], google: [56.3904639, 8.9968124] },
  { name: "REMA 1000 Aulum", address: "Kirkegade 7, 7490 Aulum", stored: [56.266537, 8.797195], google: [56.2666396, 8.797195] },
  { name: "365discount Aulum", address: "Skolegade 7, 7490 Aulum", stored: [56.26403, 8.79731], google: [56.2640239, 8.7971483] },
  { name: "REMA 1000 Sunds", address: "Thorupvej 2, 7451 Sunds", stored: [56.198302, 9.019814], google: [56.1983627, 9.0196957] },
  { name: "XL-BYG Sunds Tømmerhandel", address: "Navervej 21, 7451 Sunds", stored: [56.193074, 9.019994], google: [56.1932507, 9.0206644] },
  { name: "Sunds Møbler", address: "Navervej 18, 7451 Sunds", stored: [56.193634, 9.019343], google: [56.1934889, 9.0190159] },
  { name: "Herning Centret", address: "Merkurvej 1, 7400 Herning", stored: [56.135342, 8.999496], google: [56.1361127, 9.0035811] },
  { name: "jem & fix Herning", address: "Åvænget 4, 7400 Herning", stored: [56.1335655, 9.0070618], google: [56.13355, 9.0069949] },
  { name: "Bauhaus Herning", address: "Silkeborgvej 128, 7400 Herning", stored: [56.1329867, 9.0098552], google: [56.1326834, 9.0097756] },
];

const env = Object.fromEntries(readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
  const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
}));
const session = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, "utf8")).session;

type Directions = { provider: string; geometry: { coordinates: [number, number][] }; distance_m: number | null; duration_s: number | null };
async function directions(wps: LL[], navigation: boolean): Promise<Directions> {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/route-directions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ waypoints: wps.map(([lat, lng]) => ({ lat, lng })), business_id: BUSINESS_ID, ...(navigation ? { navigation: true } : {}) }),
  });
  if (!res.ok) throw new Error(`route-directions ${res.status}: ${await res.text()}`);
  return res.json();
}
const toLL = (d: Directions): LL[] => d.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
const dist = (a: LL, b: LL) => haversineMeters(a[0], a[1], b[0], b[1]);

// Deterministisk støj, så rapporten kan genskabes.
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

/** Gammel metode (før i dag): EMA-filter + træk ind på vejen ved < 25 m mod hele linjen, lineær tween. */
function oldPipeline(fixes: RawFix[], line: RouteLine) {
  let pos: LL | null = null; const out: { t: number; pos: LL }[] = [];
  for (const f of fixes) {
    const raw: LL = [f.lat, f.lng];
    pos = pos ? [pos[0] + (raw[0] - pos[0]) * 0.85, pos[1] + (raw[1] - pos[1]) * 0.85] : raw;
    const m = line.project(pos);
    out.push({ t: f.t, pos: m.dist < 25 ? line.pointAt(m.d) : pos });
  }
  return out;
}

type LegReport = {
  leg: string; overviewKm: number; navKm: number; navMin: number; overviewMin: number; navProvider: string;
  divergentStretchesM: number; maxDivergenceM: number; divergenceAt: LL | null;
  engineMaxOffRoadM: number; engineP95ErrorM: number; engineSideJumps: number; engineBackwardM: number;
  oldMaxOffRoadM: number; oldSideJumps: number; oldP95ErrorM: number; rejectedFixes: number; maxHeadingErrDeg: number;
};

async function main() {
  const reports: LegReport[] = [];
  const trace: { t: number; raw: LL; acc: number; speed: number | null; shown: LL | null; onRoute: boolean | null }[] = [];
  const traceClock = Date.now() - 3 * 3600_000; let legOffset = 0; const slowTurns: number[] = [];
  const dataset: Record<string, unknown> = {};
  const overviewAll = toLL(await directions(STOPS.map((s) => s.stored), false));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i], b = STOPS[i + 1];
    const [nav, ov] = await Promise.all([directions([a.stored, b.stored], true), directions([a.stored, b.stored], false)]);
    const navLine = toLL(nav), ovLine = toLL(ov);
    const truth = new RouteLine(navLine);
    const ovRL = new RouteLine(ovLine);

    // Hvor afviger oversigtslinjen fra vejvisningen? (prøver hver 20 m)
    let divergent = 0, maxDiv = 0, divAt: LL | null = null;
    for (let d = 0; d < ovRL.total; d += 20) {
      const p = ovRL.pointAt(d); const off = truth.project(p).dist;
      if (off > 30) divergent += 20;
      if (off > maxDiv) { maxDiv = off; divAt = p; }
    }

    // GPS-spor: kør vejvisningslinjen med realistisk fart (by 40, land 75 km/t), 1 fix/s.
    const fixes: RawFix[] = []; const truthAt: { t: number; d: number }[] = [];
    let d = 0, t = 0, rejectedExpected = 0;
    const townNear = (p: LL) => STOPS.some((s) => dist(s.stored, p) < 1500);
    const tunnelStart = truth.total > 3000 ? truth.total * 0.55 : Infinity; const tunnelEnd = tunnelStart + 300; // tunnel kun på landevej
    while (d < truth.total) {
      const p = truth.pointAt(d); const town = townNear(p);
      const speed = (town ? 11 : 21) * (0.9 + rnd() * 0.2);
      const sigma = town ? 6 : 3.5;
      const h = truth.headingAt(d);
      let lat = p[0] + (gauss() * sigma) / 111320, lng = p[1] + (gauss() * sigma) / (111320 * Math.cos((p[0] * Math.PI) / 180));
      let accuracy = sigma + rnd() * 4;
      if (town && rnd() < 0.015) { lat += 150 / 111320; accuracy = 12; rejectedExpected++; } // bygninger
      const inTunnel = d > tunnelStart && d < tunnelEnd;
      const iphone = i % 2 === 1; // hvert andet ben: ingen fart/retning
      if (!inTunnel) {
        fixes.push({ lat, lng, accuracy, heading: iphone ? null : (h + gauss() * 4 + 360) % 360, speed: iphone ? null : speed, t });
        if (rnd() < 0.01) fixes.push({ ...fixes[fixes.length - 1] }); // dublet
      }
      truthAt.push({ t, d });
      // Rødt lys i byen: holder stille i 20 s med GPS-støj.
      if (town && !inTunnel && rnd() < 0.004) {
        for (let w = 0; w < 20; w++) {
          t += 1000;
          fixes.push({ lat: p[0] + (gauss() * sigma) / 111320, lng: p[1] + (gauss() * sigma) / (111320 * Math.cos((p[0] * Math.PI) / 180)), accuracy, heading: null, speed: iphone ? null : 0, t });
          truthAt.push({ t, d });
        }
      }
      d += speed; t += 1000;
    }

    const engine = new PositionEngine(); engine.setRoute(navLine);
    let rejected = 0; let fi = 0;
    const errs: number[] = []; let maxOff = 0, sideJumps = 0, backward = 0, maxHeadErr = 0;
    let prev: LL | null = null, prevProg = -Infinity, prevHead: number | null = null, maxTurnSlow = 0;
    for (const { t: tt, d: dd } of truthAt) {
      while (fi < fixes.length && fixes[fi].t <= tt) {
        const f = fixes[fi];
        if (!engine.ingest(f, f.t)) rejected++;
        const shownNow = engine.sample(f.t);
        trace.push({ t: traceClock + legOffset + f.t, raw: [f.lat, f.lng], acc: Math.round(f.accuracy * 10) / 10, speed: f.speed, shown: shownNow ? shownNow.pos : null, onRoute: engine.state?.onRoute ?? null });
        fi++;
      }
      for (let k = 0; k < 25; k++) {
        const now = tt + k * 40; const s = engine.sample(now); if (!s) continue;
        if (s.heading != null && prevHead != null && (engine.state?.speedMps ?? 0) < 8.3) {
          maxTurnSlow = Math.max(maxTurnSlow, Math.abs(((s.heading - prevHead + 540) % 360) - 180) / 0.04);
        }
        prevHead = s.heading;
        const truthPos = truth.pointAt(dd + ((k * 40) / 1000) * 15);
        errs.push(dist(s.pos, truthPos));
        const pr = truth.project(s.pos);
        maxOff = Math.max(maxOff, pr.dist);
        if (prev) { const step = dist(prev, s.pos); if (step > 8 && !s.jump) { sideJumps++; } }
        if (pr.d < prevProg - 1) backward = Math.max(backward, prevProg - pr.d);
        prevProg = Math.max(prevProg, pr.d);
        if (s.heading != null && engine.state?.moving) {
          const he = Math.abs(((s.heading - truth.headingAt(pr.d) + 540) % 360) - 180);
          if (k === 24) maxHeadErr = Math.max(maxHeadErr, he);
        }
        prev = s.pos;
      }
    }
    const old = oldPipeline(fixes, truth);
    let oldOff = 0, oldJumps = 0; const oldErrs: number[] = [];
    for (let j = 0; j < old.length; j++) {
      oldOff = Math.max(oldOff, truth.project(old[j].pos).dist);
      const td = truthAt.find((x) => x.t >= old[j].t)?.d ?? truth.total;
      oldErrs.push(dist(old[j].pos, truth.pointAt(td)));
      if (j > 0) {
        const a2 = truth.project(old[j - 1].pos), b2 = truth.project(old[j].pos);
        if (Math.abs(a2.dist - b2.dist) > 8) oldJumps++; // sidelæns spring mellem vej og rå position
      }
    }
    const p95 = (xs: number[]) => { const s = [...xs].sort((x, y) => x - y); return s[Math.floor(s.length * 0.95)] ?? 0; };
    const leg = `${i + 1}. ${a.name} → ${b.name}`;
    reports.push({
      leg, overviewKm: ovRL.total / 1000, navKm: truth.total / 1000, navMin: (nav.duration_s ?? 0) / 60, overviewMin: (ov.duration_s ?? 0) / 60,
      navProvider: nav.provider, divergentStretchesM: divergent, maxDivergenceM: maxDiv, divergenceAt: divAt,
      engineMaxOffRoadM: maxOff, engineP95ErrorM: p95(errs), engineSideJumps: sideJumps, engineBackwardM: backward,
      oldMaxOffRoadM: oldOff, oldSideJumps: oldJumps, oldP95ErrorM: p95(oldErrs), rejectedFixes: rejected, maxHeadingErrDeg: maxHeadErr,
    });
    legOffset += (truthAt[truthAt.length - 1]?.t ?? 0) + 300_000; // 5 min ved butikken
    slowTurns.push(maxTurnSlow);
    dataset[leg] = { navLine, overviewLine: ovLine, fixes: fixes.slice(0, 2000) };
    console.log(`✓ ${leg}`);
  }

  const stopRows = STOPS.map((s) => {
    const off = dist(s.stored, s.google);
    const ovRoad = new RouteLine(overviewAll).project(s.stored).dist;
    return `| ${s.name} | ${s.address} | ${off.toFixed(0)} m${off > 40 ? " ⚠️" : ""} | ${ovRoad.toFixed(0)} m |`;
  });
  const sum = (k: keyof LegReport) => reports.reduce((n, r) => n + (r[k] as number), 0);
  const md = `# Simuleret kørsel: Haderup → Herning

Genereret ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC. Rutens rigtige veje er hentet med samme tjeneste som appen
(vejvisning: ${reports[0]?.navProvider ?? "?"}, oversigt: OSRM). GPS-sporet har støj (3,5 m på landevej, 6 m i byer),
spring på 150 m ved bygninger, en tunnel på 300 m på hver landevejsstrækning, dubletter og hver anden strækning uden fart/retning (som iPhone).

## Bilen: ny positionsmotor mod tidligere metode
| Strækning | Ny: maks. fra vejen | Ny: sidelæns hop | Ny: 95 % fejl | Før: maks. fra vejen | Før: hop vej↔GPS | Før: 95 % fejl | Afviste fixes |
|---|---|---|---|---|---|---|---|
${reports.map((r) => `| ${r.leg} | ${r.engineMaxOffRoadM.toFixed(1)} m | ${r.engineSideJumps} | ${r.engineP95ErrorM.toFixed(0)} m | ${r.oldMaxOffRoadM.toFixed(0)} m | ${r.oldSideJumps} | ${r.oldP95ErrorM.toFixed(0)} m | ${r.rejectedFixes} |`).join("\n")}
| **I alt** | | **${sum("engineSideJumps")}** | | | **${sum("oldSideJumps")}** | | ${sum("rejectedFixes")} |

"95 % fejl" er afstanden mellem den viste bil og den rigtige bil (inkl. tunnel og forsinkelse). Hop = sidelæns spring over 8 m.

## Ruteoverblik mod vejvisning
| Strækning | Oversigt | Vejvisning | Tid (oversigt / vejvisning) | Strækning hvor linjerne afviger > 30 m | Største afvigelse |
|---|---|---|---|---|---|
${reports.map((r) => `| ${r.leg} | ${r.overviewKm.toFixed(1)} km | ${r.navKm.toFixed(1)} km | ${r.overviewMin.toFixed(0)} / ${r.navMin.toFixed(0)} min | ${(r.divergentStretchesM / 1000).toFixed(1)} km | ${r.maxDivergenceM.toFixed(0)} m${r.divergenceAt ? ` ved ${r.divergenceAt[0].toFixed(5)}, ${r.divergenceAt[1].toFixed(5)}` : ""} |`).join("\n")}

## Stop: appens placering mod Googles adresse
| Butik | Adresse | Afstand til Googles placering | Afstand fra oversigtslinjen |
|---|---|---|---|
${stopRows.join("\n")}
`;
  mkdirSync("/mnt/documents", { recursive: true });
  writeFileSync("/mnt/documents/haderup-herning-afvigelser.md", md);
  writeFileSync("/tmp/haderup-herning-trace.json", JSON.stringify(trace));
  console.log("Maks. drejning under 30 km/t (°/s) pr. strækning:", slowTurns.map((x) => x.toFixed(0)).join(", "));
  writeFileSync("/tmp/haderup-herning-sim.json", JSON.stringify({ reports, dataset }));
  console.log(md);
}
main().catch((e) => { console.error(String(e).replace(/Bearer\s+\S+/g, "Bearer ***")); process.exit(1); });
