// Oversætter rå audit-rækker til dansk, læsbar historik: hvad skete der,
// hvem gjorde det, hvad blev ændret, og fra hvilken enhed.

export type AuditRow = {
  id: string;
  created_at: string;
  action: string;
  scope: string | null;
  affected_count: number;
  summary: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  before_data: unknown;
  after_data: unknown;
};

export type AuditTone = "create" | "update" | "delete" | "move" | "optimize" | "warn" | "neutral";

/** Kendte handlinger — nøglen matches både eksakt og som præfiks. */
const ACTIONS: { match: string; label: string; tone: AuditTone }[] = [
  { match: "route.create", label: "Rute oprettet", tone: "create" },
  { match: "route.update", label: "Rute redigeret", tone: "update" },
  { match: "route.archive", label: "Rute arkiveret", tone: "delete" },
  { match: "route.delete", label: "Rute slettet", tone: "delete" },
  { match: "route.merge", label: "Ruter flettet", tone: "update" },
  { match: "move_route_to_date", label: "Rute flyttet til anden dato", tone: "move" },
  { match: "shift_projected_occurrence", label: "Forekomst flyttet", tone: "move" },
  { match: "occurrence.cancel", label: "Forekomst aflyst", tone: "delete" },
  { match: "occurrence.restore", label: "Forekomst gendannet", tone: "create" },
  { match: "stop.add", label: "Stop lagt på ruten", tone: "create" },
  { match: "stop.remove", label: "Stop fjernet fra ruten", tone: "delete" },
  { match: "stop.move", label: "Stop flyttet", tone: "move" },
  { match: "reorder", label: "Rækkefølge ændret", tone: "update" },
  { match: "optimize", label: "Rækkefølge optimeret", tone: "optimize" },
  { match: "sygemelding:replace", label: "Sygemelding — medarbejder erstattet", tone: "warn" },
  { match: "sygemelding:spread", label: "Sygemelding — stop fordelt på holdet", tone: "warn" },
  { match: "sygemelding:unassign", label: "Sygemelding — ruten sat fri", tone: "warn" },
  { match: "sygemelding:move_date", label: "Sygemelding — ruten flyttet til ny dato", tone: "warn" },
  { match: "sygemelding", label: "Sygemelding håndteret", tone: "warn" },
  { match: "error:", label: "Advarsel overtrumfet", tone: "warn" },
  { match: "create", label: "Oprettet", tone: "create" },
  { match: "update", label: "Opdateret", tone: "update" },
  { match: "delete", label: "Slettet", tone: "delete" },
  { match: "move", label: "Flyttet", tone: "move" },
];

export function actionLabel(action: string): { label: string; tone: AuditTone } {
  const a = (action || "").toLowerCase();
  const hit = ACTIONS.find((x) => a === x.match) ?? ACTIONS.find((x) => a.startsWith(x.match));
  if (hit) return { label: hit.label, tone: hit.tone };
  return { label: action || "Hændelse", tone: "neutral" };
}

export const SCOPE_LABEL: Record<string, string> = {
  single: "Kun denne dag",
  future: "Denne og fremtidige",
  all: "Hele serien",
};

/** Danske navne på de felter, vi gemmer i before/after. */
const FIELD_LABEL: Record<string, string> = {
  route_date: "Dato",
  name: "Navn",
  start_time: "Starttidspunkt",
  end_time: "Sluttidspunkt",
  status: "Status",
  employee_id: "Medarbejder",
  employee_name: "Medarbejder",
  replacement_id: "Afløser",
  new_date: "Ny dato",
  original_date: "Oprindelig dato",
  notes: "Noter",
  position: "Placering",
  stop_count: "Antal stop",
  is_active: "Aktiv",
};

const SKIP_FIELDS = new Set([
  "id", "business_id", "created_at", "updated_at", "route_id", "agreement_id",
  "created_by", "updated_by", "public_id",
]);

const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "tom";
  if (typeof v === "boolean") return v ? "ja" : "nej";
  if (typeof v === "object") return Array.isArray(v) ? `${v.length} stk.` : "…";
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
};

export type AuditChange = { field: string; from?: string; to?: string };

/** Finder de felter der reelt ændrede sig mellem before og after. */
export function diffChanges(before: unknown, after: unknown, max = 6): AuditChange[] {
  const b = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).filter(
    (k) => !SKIP_FIELDS.has(k),
  );
  const out: AuditChange[] = [];
  for (const k of keys) {
    const hasB = k in b;
    const hasA = k in a;
    if (hasB && hasA) {
      if (JSON.stringify(b[k]) === JSON.stringify(a[k])) continue;
      out.push({ field: FIELD_LABEL[k] ?? k, from: fmt(b[k]), to: fmt(a[k]) });
    } else if (hasA) {
      out.push({ field: FIELD_LABEL[k] ?? k, to: fmt(a[k]) });
    } else {
      out.push({ field: FIELD_LABEL[k] ?? k, from: fmt(b[k]) });
    }
    if (out.length >= max) break;
  }
  return out;
}

export const ROLE_LABEL: Record<string, string> = {
  owner: "Ejer",
  employee: "Medarbejder",
  user: "Bruger",
  system: "Systemet",
};

/** Kort, læsbar beskrivelse af enheden ud fra user-agent. */
export function describeDevice(ua: string | null): string | null {
  if (!ua) return null;
  const s = ua.toLowerCase();
  const browser =
    /edg\//.test(s) ? "Edge" :
    /opr\/|opera/.test(s) ? "Opera" :
    /chrome|crios/.test(s) ? "Chrome" :
    /firefox|fxios/.test(s) ? "Firefox" :
    /safari/.test(s) ? "Safari" : "Ukendt browser";
  const os =
    /iphone/.test(s) ? "iPhone" :
    /ipad/.test(s) ? "iPad" :
    /android/.test(s) ? "Android" :
    /windows/.test(s) ? "Windows" :
    /mac os x|macintosh/.test(s) ? "Mac" :
    /linux/.test(s) ? "Linux" : "Ukendt enhed";
  const kind = /mobile|iphone|android(?!.*tablet)/.test(s) ? "Mobil" : /ipad|tablet/.test(s) ? "Tablet" : "Computer";
  return `${browser} på ${os} · ${kind}`;
}

export function actorLabel(row: Pick<AuditRow, "actor_id" | "actor_name" | "actor_role">): string {
  if (!row.actor_id) return "Systemet";
  return row.actor_name?.trim() || "Ukendt bruger";
}
