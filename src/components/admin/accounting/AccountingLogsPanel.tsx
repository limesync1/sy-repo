// Detaljeret regnskab-logvisning. Erstatter den tidligere ~40-linjers
// log-liste i `AccountingTab.tsx`. Hvert log-entry kan udvides og viser
// så kunde, aftale, rute, medarbejdere, interval-badge, pris, ISO-tid
// og rå payload — så ejeren kan følge præcist hvad der er synkroniseret.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, RefreshCw, Filter, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatInterval, intervalBadgeClass } from "@/lib/interval";

type LogRow = {
  id: string;
  business_id: string;
  provider: string;
  direction: string | null;
  entity_type: string | null;
  entity_id: string | null;
  external_id: string | null;
  status: string | null;
  message: string | null;
  payload: any;
  created_at: string;
};

type Enrichment = {
  customerName?: string | null;
  serviceName?: string | null;
  agreementId?: string | null;
  legacySubscriptionId?: string | null;
  agreementInterval?: string | null;
  agreementPrice?: number | null;
  routeName?: string | null;
  routeDate?: string | null;
  routeId?: string | null;
  employeeNames?: string[];
  occurrenceDate?: string | null;
  occurrencePlannedArrival?: string | null;
  orderId?: string | null;
  externalOrderNumber?: string | null;
  triggerReason?: string | null;
};

const ENTITY_LABEL: Record<string, string> = {
  customer: "Kunde",
  product: "Service",
  order: "Aftale",
  agreement: "Aftale",
  agreement_occurrence: "Forekomst",
  connection: "Forbindelse",
};

const STATUS_LABEL: Record<string, string> = {
  success: "Lykkedes",
  error: "Mislykkedes",
  pending: "Afventer",
};

const DIRECTION_LABEL: Record<string, string> = {
  push: "sendt til regnskab",
  pull: "hentet fra regnskab",
};

const fmtIso = (s: string) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
};

const fmtLocal = (s: string) =>
  new Date(s).toLocaleString("da-DK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const fmtPrice = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("da-DK", {
        style: "currency",
        currency: "DKK",
        maximumFractionDigits: 2,
      }).format(n);

export function AccountingLogsPanel({
  businessId,
  providerLabel,
}: {
  businessId: string;
  providerLabel: string;
}) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [enrichments, setEnrichments] = useState<Record<string, Enrichment>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("accounting_sync_log" as any)
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (entityFilter !== "all") q = q.eq("entity_type", entityFilter);
    const { data } = await q;
    const rows = ((data as any) ?? []) as LogRow[];
    setLogs(rows);
    setLoading(false);
    void enrich(rows);
  };

  const enrich = async (rows: LogRow[]) => {
    const customerIds = new Set<string>();
    const serviceIds = new Set<string>();
    const orderEntityIds = new Set<string>();
    for (const r of rows) {
      if (!r.entity_id) continue;
      if (r.entity_type === "customer") customerIds.add(r.entity_id);
      else if (r.entity_type === "product") serviceIds.add(r.entity_id);
      else if (r.entity_type === "order" || r.entity_type === "agreement_occurrence")
        orderEntityIds.add(r.entity_id);
    }

    const [custRes, svcRes, occRes, agrRes] = await Promise.all([
      customerIds.size
        ? supabase
            .from("business_customers")
            .select("id, name, email")
            .in("id", Array.from(customerIds))
        : Promise.resolve({ data: [] as any[] }),
      serviceIds.size
        ? supabase
            .from("services")
            .select("id, name, base_price")
            .in("id", Array.from(serviceIds))
        : Promise.resolve({ data: [] as any[] }),
      orderEntityIds.size
        ? supabase
            .from("agreement_occurrences")
            .select(
              "id, agreement_id, occurrence_date, planned_arrival, total_amount, route_id",
            )
            .in("id", Array.from(orderEntityIds))
        : Promise.resolve({ data: [] as any[] }),
        orderEntityIds.size
          ? supabase
              .from("agreements")
              .select(
                "id, customer_name, interval, interval_days, total_amount, preferred_route_id, employee_ids",
              )
              .in("id", Array.from(orderEntityIds))
          : Promise.resolve({ data: [] as any[] }),
    ]);

    const occs = ((occRes as any).data ?? []) as any[];
    const agreementIds = new Set<string>();
    for (const o of occs) if (o.agreement_id) agreementIds.add(o.agreement_id);
    for (const a of (agrRes as any).data ?? []) agreementIds.add(a.id);

    const [agrFullRes, routesRes] = await Promise.all([
      agreementIds.size
        ? supabase
            .from("agreements")
            .select(
              "id, legacy_subscription_id, customer_name, interval, interval_days, total_amount, preferred_route_id, employee_ids",
            )
            .in("id", Array.from(agreementIds))
        : Promise.resolve({ data: [] as any[] }),
      occs.length
        ? supabase
            .from("routes")
            .select("id, name, route_date")
            .in(
              "id",
              Array.from(
                new Set(occs.map((o: any) => o.route_id).filter(Boolean)),
              ),
            )
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const agreementById = new Map<string, any>();
    for (const a of ((agrFullRes as any).data ?? []) as any[]) agreementById.set(a.id, a);
    const occById = new Map<string, any>();
    for (const o of occs) occById.set(o.id, o);
    const routeById = new Map<string, any>();
    for (const r of ((routesRes as any).data ?? []) as any[]) routeById.set(r.id, r);
    const custById = new Map<string, any>();
    for (const c of ((custRes as any).data ?? []) as any[]) custById.set(c.id, c);
    const svcById = new Map<string, any>();
    for (const s of ((svcRes as any).data ?? []) as any[]) svcById.set(s.id, s);

    // Hent medarbejder-navne for de samlede employee_ids
    const empIds = new Set<string>();
    for (const a of agreementById.values()) {
      for (const eid of (a.employee_ids ?? []) as string[]) empIds.add(eid);
    }
    const empRes = empIds.size
      ? await supabase
          .from("employees")
          .select("id, name")
          .in("id", Array.from(empIds))
      : { data: [] as any[] };
    const empById = new Map<string, string>();
    for (const e of ((empRes as any).data ?? []) as any[]) empById.set(e.id, e.name);

    const next: Record<string, Enrichment> = {};
    for (const r of rows) {
      const e: Enrichment = {};
      // Trigger-grund: aflæses fra payload hvis edge-funktionen har sat
      // den, ellers udledt af direction (push/pull) og status.
      const payload = (r.payload || {}) as any;
      e.triggerReason =
        payload.trigger ||
        payload.reason ||
        (r.direction === "push"
          ? payload.created
            ? "Oprettet i regnskab"
            : payload.deleted
              ? "Slettet i regnskab"
              : payload.updated
                ? "Opdateret i regnskab"
                : "Pushed til regnskab"
          : r.direction === "pull"
            ? "Hentet fra regnskab"
            : null);
      if (r.external_id) e.externalOrderNumber = String(r.external_id);
      if (r.entity_type === "customer" && r.entity_id) {
        e.customerName = custById.get(r.entity_id)?.name ?? null;
      } else if (r.entity_type === "product" && r.entity_id) {
        const s = svcById.get(r.entity_id);
        e.serviceName = s?.name ?? null;
        e.agreementPrice = s?.base_price ?? null;
      } else if (
        (r.entity_type === "order" || r.entity_type === "agreement_occurrence") &&
        r.entity_id
      ) {
        e.orderId = r.entity_id;
        const occ = occById.get(r.entity_id);
        const agr = occ ? agreementById.get(occ.agreement_id) : agreementById.get(r.entity_id);
        if (occ) {
          e.occurrenceDate = occ.occurrence_date;
          e.occurrencePlannedArrival = occ.planned_arrival;
          e.agreementPrice = occ.total_amount;
          const route = occ.route_id ? routeById.get(occ.route_id) : null;
          if (route) {
            e.routeId = route.id;
            e.routeName = route.name;
            e.routeDate = route.route_date;
          }
        }
        if (agr) {
          e.agreementId = agr.id;
          e.legacySubscriptionId = agr.legacy_subscription_id ?? null;
          e.customerName = agr.customer_name;
          e.agreementInterval = agr.interval ?? null;
          if (e.agreementPrice == null) e.agreementPrice = agr.total_amount ?? null;
          e.employeeNames = ((agr.employee_ids ?? []) as string[])
            .map((id) => empById.get(id))
            .filter((n): n is string => !!n);
        }
      }
      next[r.id] = e;
    }
    setEnrichments(next);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, statusFilter, entityFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const e = enrichments[l.id] || {};
      return [
        l.message,
        l.external_id,
        l.entity_id,
        e.customerName,
        e.serviceName,
        e.routeName,
        e.employeeNames?.join(" "),
      ]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [logs, enrichments, search]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Synk-aktivitet</span>
          <span className="text-xs text-muted-foreground">
            ({filtered.length} af {logs.length})
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg kunde, service, rute…"
              className="h-8 w-56 rounded-lg pl-7 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 rounded-lg text-xs">
              <Filter className="mr-1 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statusser</SelectItem>
              <SelectItem value="success">Kun lykkedes</SelectItem>
              <SelectItem value="error">Kun mislykkedes</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-8 w-36 rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle typer</SelectItem>
              <SelectItem value="customer">Kunder</SelectItem>
              <SelectItem value="product">Services</SelectItem>
              <SelectItem value="order">Aftaler</SelectItem>
              <SelectItem value="connection">Forbindelse</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load()}
            disabled={loading}
            className="h-8 rounded-lg text-xs"
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Opdatér
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          Ingen logposter matcher dine filtre.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((l) => {
            const e = enrichments[l.id] || {};
            const isOpen = expanded.has(l.id);
            const statusVariant: any =
              l.status === "success"
                ? "secondary"
                : l.status === "error"
                  ? "destructive"
                  : "outline";
            const entityLabel = ENTITY_LABEL[l.entity_type ?? ""] ?? l.entity_type ?? "—";
            const dirLabel = DIRECTION_LABEL[l.direction ?? ""] ?? l.direction ?? "";
            const headline =
              e.customerName ||
              e.serviceName ||
              (l.entity_type === "connection" ? providerLabel : null) ||
              "—";
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => toggle(l.id)}
                  className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-secondary/40"
                >
                  <ChevronDown
                    className={`mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : "-rotate-90"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant} className="shrink-0">
                        {STATUS_LABEL[l.status ?? ""] ?? l.status}
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground">
                        {entityLabel} {dirLabel}
                      </span>
                      <span className="truncate text-sm font-semibold text-foreground">
                        {headline}
                      </span>
                      {e.triggerReason && (
                        <span className="inline-flex h-5 items-center rounded-full bg-secondary px-2 text-[10px] font-medium text-foreground/70">
                          {e.triggerReason}
                        </span>
                      )}
                      {e.agreementInterval && (
                        <span
                          className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium ${intervalBadgeClass(e.agreementInterval)}`}
                        >
                          {formatInterval(e.agreementInterval)}
                        </span>
                      )}
                      {e.agreementPrice != null && (
                        <span className="text-xs tabular-nums text-foreground/80">
                          {fmtPrice(e.agreementPrice)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span title={fmtIso(l.created_at)} className="tabular-nums">
                        {fmtLocal(l.created_at)}
                      </span>
                      {e.routeName && (
                        <span>
                          Rute: <span className="text-foreground">{e.routeName}</span>
                          {e.routeDate ? ` (${e.routeDate})` : ""}
                        </span>
                      )}
                      {e.employeeNames && e.employeeNames.length > 0 && (
                        <span>
                          Medarbejdere:{" "}
                          <span className="text-foreground">
                            {e.employeeNames.join(", ")}
                          </span>
                        </span>
                      )}
                      {l.message && (
                        <span className="truncate" title={l.message}>
                          {l.message}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-border bg-secondary/20 px-5 py-4 text-xs">
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                      <Field label="Tidspunkt (ISO)">{fmtIso(l.created_at)}</Field>
                      <Field label="Status">{STATUS_LABEL[l.status ?? ""] ?? l.status}</Field>
                      <Field label="Retning">{dirLabel || "—"}</Field>
                      <Field label="Type">{entityLabel}</Field>
                      {e.customerName && <Field label="Kunde">{e.customerName}</Field>}
                      {e.serviceName && <Field label="Service">{e.serviceName}</Field>}
                      {e.agreementId && <Field label="Aftale-ID">{e.agreementId}</Field>}
                      {e.agreementInterval && (
                        <Field label="Interval">{formatInterval(e.agreementInterval)}</Field>
                      )}
                      {e.agreementPrice != null && (
                        <Field label="Pris">{fmtPrice(e.agreementPrice)}</Field>
                      )}
                      {e.routeName && (
                        <Field label="Rute">
                          {e.routeName}
                          {e.routeDate ? ` — ${e.routeDate}` : ""}
                        </Field>
                      )}
                      {e.occurrenceDate && (
                        <Field label="Forekomst-dato">{e.occurrenceDate}</Field>
                      )}
                      {e.occurrencePlannedArrival && (
                        <Field label="Planlagt ankomst">
                          {fmtLocal(e.occurrencePlannedArrival)}
                        </Field>
                      )}
                      {e.employeeNames && e.employeeNames.length > 0 && (
                        <Field label="Medarbejdere">{e.employeeNames.join(", ")}</Field>
                      )}
                      {l.external_id && (
                        <Field label="Ekstern reference">{l.external_id}</Field>
                      )}
                      {l.entity_id && (
                        <Field label="Intern reference">{l.entity_id}</Field>
                      )}
                      {e.orderId && <Field label="Ordre-ID">{e.orderId}</Field>}
                      {e.externalOrderNumber && (
                        <Field label="Eksternt ordrenummer">{e.externalOrderNumber}</Field>
                      )}
                      {e.agreementId && (
                        <Field label="Aftale-ID (nyt)">{e.agreementId}</Field>
                      )}
                      {e.legacySubscriptionId && (
                        <Field label="Aftale-ID (legacy)">{e.legacySubscriptionId}</Field>
                      )}
                      {e.triggerReason && (
                        <Field label="Udløst af">{e.triggerReason}</Field>
                      )}
                    </dl>
                    {l.message && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Besked
                        </div>
                        <p className="mt-0.5 text-foreground">{l.message}</p>
                      </div>
                    )}
                    {l.payload && (
                      <details className="rounded-lg border border-border bg-card p-2">
                        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Rå payload
                        </summary>
                        <pre className="mt-2 max-h-72 overflow-auto rounded bg-secondary/40 p-2 text-[11px] leading-snug text-foreground">
                          {JSON.stringify(l.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-foreground" title={String(children ?? "")}>
        {children}
      </dd>
    </div>
  );
}