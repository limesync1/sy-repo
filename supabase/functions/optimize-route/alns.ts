// ALNS (Adaptive Large Neighbourhood Search) med simuleret annealing.
// Ren algoritme – ingen AI. Fjerner gentagne gange en del af stoppene og
// sætter dem ind igen; operatorer der giver bedre ruter vælges oftere.
import type { EmployeeCtx, ScheduledStop, Stop } from "./types.ts";

type IRoute = ScheduledStop[];
type Sol = Map<string, IRoute>;
type InsertOpt = { emp: EmployeeCtx; pos: number; cost: number };

export interface AlnsInput {
  initial: Sol;
  initialUnassigned: string[];
  employees: EmployeeCtx[];
  stops: Stop[];
  movable: Set<string>;
  cost: (r: Sol, unassignedCount: number) => number;
  polish: (r: Sol) => void;
  insertCost: (stop: Stop, r: Sol) => InsertOpt[];
  dist: (a: string, b: string) => number;
  budgetMs: number;
  seed: number;
  maxIterations?: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clone = (r: Sol): Sol => {
  const m = new Map<string, IRoute>();
  for (const [k, v] of r) m.set(k, v.map((s) => ({ ...s, assignees: [...s.assignees] })));
  return m;
};

const removeStop = (r: Sol, id: string) => {
  for (const [k, v] of r) r.set(k, v.filter((s) => s.stop_id !== id));
};

export function runAlns(inp: AlnsInput): { routes: Sol; unassigned: string[]; cost: number } {
  const rand = mulberry32(inp.seed);
  const byId = new Map(inp.stops.map((s) => [s.id, s]));
  const deadline = Date.now() + inp.budgetMs;
  const maxIt = inp.maxIterations ?? 5000;

  let cur = clone(inp.initial);
  let curUn = [...inp.initialUnassigned];
  let curCost = inp.cost(cur, curUn.length);
  let best = clone(cur);
  let bestUn = [...curUn];
  let bestCost = curCost;

  // Destroy: 0 tilfældig, 1 dyreste, 2 relateret (Shaw/klynge). Repair: 0 grådig, 1 regret-2.
  const dW = [1, 1, 1];
  const rW = [1, 1];
  const pick = (w: number[]) => {
    const tot = w.reduce((a, b) => a + b, 0);
    let x = rand() * tot;
    for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; }
    return w.length - 1;
  };

  // Temperatur: start så en 5 % dårligere løsning accepteres med ~50 %.
  let T = Math.max(1, curCost * 0.05) / Math.log(2);
  const cooling = 0.995;

  for (let it = 0; it < maxIt && Date.now() < deadline; it++) {
    const assigned: string[] = [];
    for (const v of cur.values()) for (const s of v) if (inp.movable.has(s.stop_id)) assigned.push(s.stop_id);
    const uniq = [...new Set(assigned)];
    if (uniq.length < 2) break;
    const q = Math.max(2, Math.min(uniq.length, Math.round(uniq.length * (0.1 + rand() * 0.2))));

    const cand = clone(cur);
    const d = pick(dW);
    let removed: string[] = [];
    if (d === 0) {
      const pool = [...uniq];
      while (removed.length < q && pool.length) removed.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    } else if (d === 1) {
      const base = inp.cost(cand, 0);
      const scored = uniq.map((id) => {
        const t = clone(cand);
        removeStop(t, id);
        return { id, gain: base - inp.cost(t, 0) + rand() * 0.5 };
      }).sort((a, b) => b.gain - a.gain);
      removed = scored.slice(0, q).map((x) => x.id);
    } else {
      const seedId = uniq[Math.floor(rand() * uniq.length)];
      removed = [...uniq].sort((a, b) => inp.dist(seedId, a) - inp.dist(seedId, b)).slice(0, q);
    }
    for (const id of removed) removeStop(cand, id);

    const r = pick(rW);
    const pending = [...removed, ...curUn.filter((id) => inp.movable.has(id))];
    const candUn = curUn.filter((id) => !inp.movable.has(id));
    while (pending.length) {
      let bestIdx = -1;
      let bestOpt: InsertOpt | null = null;
      let bestScore = -Infinity;
      for (let i = 0; i < pending.length; i++) {
        const opts = inp.insertCost(byId.get(pending[i])!, cand).sort((a, b) => a.cost - b.cost);
        if (!opts.length) continue;
        const score = r === 0 ? -opts[0].cost : (opts[1]?.cost ?? opts[0].cost + 1e4) - opts[0].cost;
        if (score > bestScore) { bestScore = score; bestIdx = i; bestOpt = opts[0]; }
      }
      if (bestIdx < 0 || !bestOpt) { candUn.push(...pending); break; }
      const id = pending.splice(bestIdx, 1)[0];
      cand.get(bestOpt.emp.id)!.splice(bestOpt.pos, 0, {
        stop_id: id, sequence: 0, arrival_min: 0, departure_min: 0,
        assignees: [bestOpt.emp.id], travel_min_to_next: null, travel_km_to_next: null,
      });
    }
    inp.polish(cand);
    const cCost = inp.cost(cand, candUn.length);

    let reward = 0;
    if (cCost + 0.01 < bestCost) {
      best = clone(cand); bestUn = [...candUn]; bestCost = cCost; reward = 3;
    }
    const better = cCost + 0.01 < curCost;
    if (better || rand() < Math.exp(-(cCost - curCost) / Math.max(T, 1e-6))) {
      cur = cand; curUn = candUn; curCost = cCost;
      if (!reward) reward = better ? 2 : 0.5;
    }
    dW[d] = dW[d] * 0.8 + reward * 0.2 + 0.05;
    rW[r] = rW[r] * 0.8 + reward * 0.2 + 0.05;
    T *= cooling;
  }

  return { routes: best, unassigned: bestUn, cost: bestCost };
}
