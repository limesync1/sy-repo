/**
 * Centralt fejl-katalog for rutekalenderen.
 *
 * Hver fejl har:
 *  - `code`: maskin-læsbar identifier (bruges i logs, audit, tests).
 *  - `severity`: error|warning|info — styrer UI-farve og om handlingen blokeres.
 *  - `title`: kort dansk overskrift.
 *  - `message(ctx)`: konkret dansk besked med kontekst (datoer, navne, antal).
 *  - `hint?`: hvad brugeren kan gøre i stedet.
 *
 * Alle fejlmeddelelser i planlæggeren går igennem dette katalog så vi aldrig
 * viser "Noget gik galt" eller "Kunne ikke opdatere" til brugeren.
 */

import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { logRouteAudit } from "./route-audit";

export type IssueSeverity = "error" | "warning" | "info";

export type Issue = {
  code: RouteErrorCode;
  severity: IssueSeverity;
  title: string;
  message: string;
  hint?: string;
  affectedIds?: string[];
  field?: string;
};

export type RouteErrorCode =
  // Dato/tid
  | "ROUTE_DATE_IN_PAST"
  | "ROUTE_DATE_TODAY_LOCKED"
  | "STOP_OUTSIDE_BUSINESS_HOURS"
  | "EMPLOYEE_DOUBLE_BOOKED"
  | "EMPLOYEE_OFF_DUTY"
  // Serie / projektion
  | "PROJECTED_ROUTE_LOCKED"
  | "PROJECTED_STOP_LOCKED"
  | "MERGE_PROJECTION_INTO_PROJECTION"
  | "MERGE_PROJECTION_INTO_REAL"
  | "SERIES_COLLISION_ON_DATE"
  | "ANOTHER_SHIFT_TARGETS_DATE"
  | "SHIFT_SAME_DATE"
  // Duplikering
  | "DUPLICATE_AGREEMENT_SAME_DAY"
  | "DUPLICATE_CUSTOMER_SAME_DAY"
  | "DUPLICATE_STOP_ON_ROUTE"
  | "DUPLICATE_ROUTE_SAME_DATE"
  // Geografi / kapacitet
  | "GEOGRAPHIC_GAP_TOO_LARGE"
  | "ROUTE_OVER_CAPACITY"
  | "ROUTE_TOO_LONG_KM"
  | "ROUTE_TOO_LONG_HOURS"
  // Sletning
  | "ROUTE_HAS_COMPLETED_STOPS"
  | "ROUTE_HAS_FUTURE_PROJECTIONS"
  // Holidays / pauses
  | "HOLIDAY_BLOCKED_DATE"
  | "AGREEMENT_PAUSED"
  // Database / generelt
  | "AUTH_REQUIRED"
  | "PERMISSION_DENIED"
  | "ROUTE_NOT_FOUND"
  | "AGREEMENT_NOT_FOUND"
  | "CONCURRENT_EDIT"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

const dk = (iso: string) => {
  try { return format(parseISO(iso), "d. MMMM yyyy", { locale: da }); }
  catch { return iso; }
};

type Ctx = Record<string, any>;

type Spec = {
  severity: IssueSeverity;
  title: string;
  build: (ctx: Ctx) => { message: string; hint?: string };
};

const SPECS: Record<RouteErrorCode, Spec> = {
  ROUTE_DATE_IN_PAST: {
    severity: "error", title: "Datoen er i fortiden",
    build: (c) => ({
      message: `Du kan ikke planlægge en rute på ${dk(c.date)} fordi datoen er passeret.`,
      hint: "Vælg en dato fra i dag eller senere.",
    }),
  },
  ROUTE_DATE_TODAY_LOCKED: {
    severity: "warning", title: "Ruten er i gang i dag",
    build: () => ({
      message: "En eller flere stops er allerede påbegyndt — ændringer kan forvirre medarbejderen.",
      hint: "Kontakt medarbejderen før du flytter ruten.",
    }),
  },
  STOP_OUTSIDE_BUSINESS_HOURS: {
    severity: "warning", title: "Uden for åbningstid",
    build: (c) => ({
      message: `Kunden er normalt kun tilgængelig ${c.window ?? "i dagtimerne"} — stoppet er planlagt kl. ${c.time ?? "?"}.`,
      hint: "Flyt stoppet eller bekræft med kunden.",
    }),
  },
  EMPLOYEE_DOUBLE_BOOKED: {
    severity: "error", title: "Medarbejder er dobbeltbooket",
    build: (c) => ({
      message: `${c.employeeName ?? "Medarbejderen"} har allerede ${c.existingCount ?? "andre"} stop på ${dk(c.date)} kl. ${c.time ?? "samme tid"}.`,
      hint: "Vælg en anden medarbejder eller flyt det eksisterende stop.",
    }),
  },
  EMPLOYEE_OFF_DUTY: {
    severity: "warning", title: "Medarbejder har fri",
    build: (c) => ({
      message: `${c.employeeName ?? "Medarbejderen"} har registreret fri på ${dk(c.date)}.`,
      hint: "Vælg en anden medarbejder eller flyt ruten.",
    }),
  },
  PROJECTED_ROUTE_LOCKED: {
    severity: "error", title: "Projiceret rute er låst",
    build: () => ({
      message: "Projicerede ruter kan ikke redigeres direkte — kun selve originalruten kan ændres.",
      hint: "Åbn originalruten for at ændre navn, farve, stops eller medarbejder.",
    }),
  },
  PROJECTED_STOP_LOCKED: {
    severity: "error", title: "Stoppet hører til en projiceret rute",
    build: () => ({
      message: "Stops i projicerede ruter er auto-genererede og kan ikke flyttes individuelt.",
      hint: "Rediger originalruten i stedet — ændringen propagerer automatisk.",
    }),
  },
  MERGE_PROJECTION_INTO_PROJECTION: {
    severity: "error", title: "Kan ikke flette to projektioner",
    build: () => ({
      message: "Begge ruter er projicerede forekomster — de findes ikke fysisk endnu.",
      hint: "Materialisér mindst én af ruterne først, eller rediger originalruten.",
    }),
  },
  MERGE_PROJECTION_INTO_REAL: {
    severity: "warning", title: "Du fletter en projektion ind i en rigtig rute",
    build: (c) => ({
      message: `Den projicerede forekomst på ${dk(c.date)} materialiseres som en del af målruten. Fremtidige forekomster i serien forbliver projicerede.`,
    }),
  },
  SERIES_COLLISION_ON_DATE: {
    severity: "error", title: "Ruten findes allerede på denne dato",
    build: (c) => ({
      message: `Der findes allerede en rute fra samme serie på ${dk(c.date)}.`,
      hint: "Flet ruterne i stedet for at flytte.",
    }),
  },
  ANOTHER_SHIFT_TARGETS_DATE: {
    severity: "error", title: "En anden forekomst peger allerede på datoen",
    build: (c) => ({
      message: `En anden projiceret forekomst er allerede flyttet til ${dk(c.date)}.`,
      hint: "Vælg en anden dato eller fortryd den anden flytning først.",
    }),
  },
  SHIFT_SAME_DATE: {
    severity: "error", title: "Samme dato",
    build: () => ({ message: "Den nye dato er den samme som den nuværende." }),
  },
  DUPLICATE_AGREEMENT_SAME_DAY: {
    severity: "error", title: "Aftalen er allerede planlagt",
    build: (c) => ({
      message: `${c.customerName ?? "Kunden"}s aftale er allerede på en rute den ${dk(c.date)}.`,
      hint: "Fjern det eksisterende stop først hvis det skal flyttes.",
    }),
  },
  DUPLICATE_CUSTOMER_SAME_DAY: {
    severity: "warning", title: "Kunden er booket to gange samme dag",
    build: (c) => ({
      message: `${c.customerName ?? "Kunden"} har allerede et andet stop på ${dk(c.date)}.`,
      hint: "Bekræft med kunden eller flyt det ene stop.",
    }),
  },
  DUPLICATE_STOP_ON_ROUTE: {
    severity: "error", title: "Stoppet findes allerede på ruten",
    build: () => ({ message: "Den samme aftale kan ikke tilføjes to gange til samme rute." }),
  },
  DUPLICATE_ROUTE_SAME_DATE: {
    severity: "error", title: "Dublet rute",
    build: (c) => ({
      message: c.name
        ? `Der findes allerede en rute der hedder "${c.name}" på ${dk(c.date)}.`
        : `Der findes allerede en rute med samme navn på ${dk(c.date)}.`,
      hint: "Giv ruten et andet navn — to ruter må ikke hedde det samme på samme dag.",
    }),
  },
  GEOGRAPHIC_GAP_TOO_LARGE: {
    severity: "warning", title: "Stort spring i ruten",
    build: (c) => ({
      message: `Stoppet ligger ${c.km ?? "?"} km fra de øvrige stop på ruten.`,
      hint: "Overvej en rute tættere på, eller optimér rækkefølgen efter slip.",
    }),
  },
  ROUTE_OVER_CAPACITY: {
    severity: "warning", title: "Ruten er ved at være fuld",
    build: (c) => ({
      message: `Ruten har allerede ${c.currentCount ?? "mange"} stop — vurder om det er realistisk på én dag.`,
      hint: "Del ruten eller flyt nogle stops til en anden dag.",
    }),
  },
  ROUTE_TOO_LONG_KM: {
    severity: "warning", title: "Lang køredistance",
    build: (c) => ({ message: `Ruten bliver ca. ${c.km ?? "?"} km lang.`, hint: "Optimér rækkefølgen efter slip." }),
  },
  ROUTE_TOO_LONG_HOURS: {
    severity: "warning", title: "Lang arbejdsdag",
    build: (c) => ({ message: `Ruten estimeres til ${c.hours ?? "?"} timer.`, hint: "Vurder om der skal splittes op." }),
  },
  ROUTE_HAS_COMPLETED_STOPS: {
    severity: "error", title: "Kan ikke slettes",
    build: (c) => ({
      message: `Ruten har ${c.completedCount ?? "fuldførte"} stop og historik der ikke må mistes.`,
      hint: "Brug 'Arkivér rute' i stedet — historikken bevares.",
    }),
  },
  ROUTE_HAS_FUTURE_PROJECTIONS: {
    severity: "warning", title: "Ruten er original for fremtidige forekomster",
    build: (c) => ({
      message: `${c.count ?? "Flere"} projicerede forekomster i serien forsvinder hvis originalruten arkiveres.`,
      hint: "Bekræft at serien skal stoppes, eller flyt aftalerne til en anden originalrute.",
    }),
  },
  HOLIDAY_BLOCKED_DATE: {
    severity: "warning", title: "Lukkedag",
    build: (c) => ({
      message: `${dk(c.date)} er registreret som lukkedag (${c.name ?? "helligdag"}).`,
      hint: "Vælg en arbejdsdag, eller fjern lukkedagen i indstillinger.",
    }),
  },
  AGREEMENT_PAUSED: {
    severity: "warning", title: "Aftalen er pauseret",
    build: (c) => ({
      message: `Aftalen er pauseret fra ${dk(c.from)} til ${dk(c.to)}.`,
      hint: "Afslut pausen eller vælg en dato uden for pausen.",
    }),
  },
  AUTH_REQUIRED: {
    severity: "error", title: "Login krævet",
    build: () => ({ message: "Du skal være logget ind for at udføre handlingen.", hint: "Log ind og prøv igen." }),
  },
  PERMISSION_DENIED: {
    severity: "error", title: "Adgang nægtet",
    build: () => ({ message: "Du har ikke rettigheder til at ændre denne rute.", hint: "Kontakt ejeren eller en administrator." }),
  },
  ROUTE_NOT_FOUND: {
    severity: "error", title: "Ruten findes ikke",
    build: () => ({ message: "Ruten kunne ikke findes — den er måske slettet eller arkiveret.", hint: "Genindlæs siden." }),
  },
  AGREEMENT_NOT_FOUND: {
    severity: "error", title: "Aftalen findes ikke",
    build: () => ({ message: "Aftalen kunne ikke findes.", hint: "Genindlæs siden." }),
  },
  CONCURRENT_EDIT: {
    severity: "error", title: "Ændringen er forældet",
    build: () => ({
      message: "En anden bruger har ændret ruten siden du åbnede den.",
      hint: "Genindlæs siden og prøv igen — så du ikke overskriver deres ændring.",
    }),
  },
  NETWORK_ERROR: {
    severity: "error", title: "Netværksfejl",
    build: () => ({ message: "Forbindelsen til serveren blev afbrudt.", hint: "Tjek internettet og prøv igen." }),
  },
  UNKNOWN_ERROR: {
    severity: "error", title: "Ukendt fejl",
    build: (c) => ({
      message: c.detail ? `Der opstod en uventet fejl: ${c.detail}` : "Der opstod en uventet fejl.",
      hint: "Prøv igen — kontakt support hvis problemet fortsætter.",
    }),
  },
};

/** Byg et issue ud fra en kode og kontekst — single source of truth. */
export function makeIssue(code: RouteErrorCode, ctx: Ctx = {}, extras: Partial<Issue> = {}): Issue {
  const spec = SPECS[code];
  const { message, hint } = spec.build(ctx);
  return {
    code,
    severity: spec.severity,
    title: spec.title,
    message,
    hint,
    ...extras,
  };
}

/** Map en rå Postgres/Supabase-fejl til den bedste matchende rute-fejlkode. */
export function mapPostgresError(err: any): Issue {
  const msg = String(err?.message || "");
  const code = String(err?.code || "");
  const detail = String(err?.details || err?.detail || "");
  const routeSeriesDate = detail.match(/routes_unique_series_per_date[\s\S]*?,\s*(\d{4}-\d{2}-\d{2})\)/i)
    || detail.match(/COALESCE\(base_route_id, id\), route_date\)=\([^)]*,\s*(\d{4}-\d{2}-\d{2})\)/i);
  if (!navigator?.onLine) return makeIssue("NETWORK_ERROR");
  if (/jwt|not authenticated|28000/i.test(msg + " " + code)) return makeIssue("AUTH_REQUIRED");
  if (/forbidden|permission denied|42501/i.test(msg + " " + code)) return makeIssue("PERMISSION_DENIED");
  if (code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
    if (/routes_unique_series_per_date/i.test(detail + msg)) {
      return makeIssue("SERIES_COLLISION_ON_DATE", { date: routeSeriesDate?.[1] ?? new Date().toISOString().slice(0, 10) });
    }
    if (/route_stops_route_order|route_stops_route_subscription|route_stops_route_occurrence/i.test(detail + msg)) {
      return makeIssue("DUPLICATE_STOP_ON_ROUTE");
    }
    if (/routes_unique_name_per_business_date/i.test(detail + msg)) {
      return makeIssue("DUPLICATE_ROUTE_SAME_DATE", { date: new Date().toISOString().slice(0, 10) });
    }
    if (/routes_base_route_id_route_date/i.test(detail + msg)) {
      return makeIssue("DUPLICATE_ROUTE_SAME_DATE", { date: new Date().toISOString().slice(0, 10) });
    }
    return makeIssue("DUPLICATE_STOP_ON_ROUTE");
  }
  if (code === "23503" || /foreign key/i.test(msg)) return makeIssue("ROUTE_NOT_FOUND");
  if (code === "40001" || /serialization failure|concurrent/i.test(msg)) return makeIssue("CONCURRENT_EDIT");
  if (/network|fetch|timeout/i.test(msg)) return makeIssue("NETWORK_ERROR");
  // Hvis serveren har returneret en dansk-pæn besked, så brug den direkte.
  if (msg && /[æøåÆØÅ]|kan ikke|allerede|findes/.test(msg)) {
    return { code: "UNKNOWN_ERROR", severity: "error", title: "Handlingen blev afvist", message: msg };
  }
  return makeIssue("UNKNOWN_ERROR", { detail: msg });
}

/** Vis et issue som en toast med titel + besked + evt. hint. */
export function toastIssue(issue: Issue, toastFn: (msg: string, opts?: any) => void): void {
  toastFn(issue.title, {
    description: issue.hint ? `${issue.message}\n${issue.hint}` : issue.message,
  });
}

/**
 * Konvenience: tag en fanget exception, map den til en konkret rute-fejl,
 * og vis den som en sonner-toast med titel + beskrivelse. Returnerer issue'et
 * så callers kan logge eller bruge det videre.
 */
export function toastRouteError(
  err: unknown,
  toastErrorFn: (msg: string, opts?: any) => void,
  override?: {
    titleFallback?: string;
    /**
     * L5: hvis sat, logges fejlen automatisk til `route_audit_log` med
     * fuld kontekst, så vi kan fejlsøge bagudrettet uden brugerbesvær.
     */
    audit?: {
      business_id?: string | null;
      action: string;
      route_id?: string | null;
      agreement_id?: string | null;
      scope?: "single" | "future" | "all" | null;
      payload?: unknown;
    };
  },
): Issue {
  const issue = mapPostgresError(err);
  toastErrorFn(override?.titleFallback ?? issue.title, {
    description: issue.hint ? `${issue.message}\n${issue.hint}` : issue.message,
  });
  // Struktureret konsol-log for udviklere / Sentry-hooks.
  // eslint-disable-next-line no-console
  console.warn("[route-error]", {
    code: issue.code,
    title: issue.title,
    message: issue.message,
    raw: err instanceof Error ? err.message : err,
  });
  if (override?.audit) {
    void logRouteAudit({
      business_id: override.audit.business_id ?? null,
      action: `error:${issue.code}:${override.audit.action}`,
      route_id: override.audit.route_id ?? null,
      agreement_id: override.audit.agreement_id ?? null,
      scope: override.audit.scope ?? null,
      affected_count: 0,
      before: override.audit.payload ?? null,
      after: {
        error_code: issue.code,
        title: issue.title,
        message: issue.message,
        raw: err instanceof Error ? err.message : String(err),
      },
    });
  }
  return issue;
}