/**
 * PlatformRouteEventsTab — Bølge 3.2 i .lovable/plan.md.
 *
 * Visuel debugger for `route_events` (domæne-event-log fra Bølge 3.1).
 * Læser kun. Giver platform-admins en tidslinje over hvad triggers
 * faktisk har gjort efter en mutation:
 *
 *   STOP_COMPLETED → OCCURRENCE_UPDATED → INVOICE_ENQUEUED → ACCOUNTING_SYNCED
 *
 * Bruges til at diagnosticere "hvorfor blev der ikke faktureret?" eller
 * "hvor blev den næste occurrence af?" uden at skulle læse trigger-kode.
 */
import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { da } from "date-fns/locale";
import { Activity, ChevronDown, ChevronRight, Filter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 200;

const RANGES: { value: string; label: string; days: number | null }[] = [
  { value: "1h", label: "1 time", days: 1 / 24 },
  { value: "24h", label: "24 timer", days: 1 },
  { value: "7d", label: "7 dage", days: 7 },
  { value: "30d", label: "30 dage", days: 30 },
  { value: "all", label: "Alle", days: null },
];

const EVENT_TYPES = [
  "all",
  "STOP_COMPLETED",
  "OCCURRENCE_UPDATED",
  "OCCURRENCE_REMOVED",
  "NEXT_OCCURRENCE_CREATED",
  "INVOICE_ENQUEUED",
  "ACCOUNTING_SYNCED",
  "ACCOUNTING_FAILED",
  "ROUTE_SNAPSHOTTED",
] as const;

type RouteEventRow = {
  id: string;
  business_id: string;
  entity_type: string;
  entity_id: string | null;
  route_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

const eventVariant = (t: string): "default" | "secondary" | "destructive" | "outline" => {
  if (t.endsWith("_FAILED")) return "destructive";
  if (t === "STOP_COMPLETED" || t === "ACCOUNTING_SYNCED") return "default";
  if (t === "INVOICE_ENQUEUED" || t === "ROUTE_SNAPSHOTTED") return "secondary";
  return "outline";
};

export default function PlatformRouteEventsTab() {
  const [q, setQ] = useState("");
  const [range, setRange] = useState("24h");
  const [eventType, setEventType] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["route-events", range, eventType],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let query: any = (supabase as any)
        .from("route_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const r = RANGES.find((x) => x.value === range);
      if (r?.days != null) {
        const since = new Date(Date.now() - r.days * 86_400_000).toISOString();
        query = query.gte("created_at", since);
      }
      if (eventType !== "all") query = query.eq("event_type", eventType);
      if (pageParam) query = query.lt("created_at", pageParam);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RouteEventRow[];
    },
    getNextPageParam: (last) => (last.length === PAGE_SIZE ? last[last.length - 1].created_at : undefined),
  });

  const rows = useMemo(() => {
    const flat = (data?.pages ?? []).flat();
    if (!q.trim()) return flat;
    const needle = q.trim().toLowerCase();
    return flat.filter((r) =>
      [r.entity_id, r.route_id, r.event_type, r.entity_type, JSON.stringify(r.payload)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [data, q]);

  // Group by route_id for at vise rute-tidslinjer (sekundær gruppering).
  const grouped = useMemo(() => {
    const byRoute = new Map<string, RouteEventRow[]>();
    const orphans: RouteEventRow[] = [];
    for (const r of rows) {
      if (r.route_id) {
        const list = byRoute.get(r.route_id) ?? [];
        list.push(r);
        byRoute.set(r.route_id, list);
      } else {
        orphans.push(r);
      }
    }
    return { byRoute, orphans };
  }, [rows]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Activity className="h-4 w-4" /> Domæne-events
          </span>
        }
        description="Tidslinje af hvad rute-triggerne har gjort. Læser fra route_events — ingen mutationer."
      />

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søg på rute-id, entity-id eller payload…"
            className="pl-8"
          />
        </div>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="w-[220px]">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Event-type" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t === "all" ? "Alle event-typer" : t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {isLoading ? (
        <ListCardSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Activity />}
          title="Ingen events i intervallet"
          description="Prøv at udvide tidsrummet eller fjern filtre."
        />
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.byRoute.entries()).map(([routeId, list]) => (
            <RouteTimeline
              key={routeId}
              routeId={routeId}
              events={list}
              openId={openId}
              setOpenId={setOpenId}
            />
          ))}
          {grouped.orphans.length > 0 && (
            <RouteTimeline
              routeId={null}
              events={grouped.orphans}
              openId={openId}
              setOpenId={setOpenId}
            />
          )}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Henter…" : "Hent flere"}
          </Button>
        </div>
      )}
    </div>
  );
}

function RouteTimeline({
  routeId,
  events,
  openId,
  setOpenId,
}: {
  routeId: string | null;
  events: RouteEventRow[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  // events kommer ned-sorteret — vend i visning så ældste er øverst (kausal læsning).
  const ordered = useMemo(() => [...events].reverse(), [events]);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const durationMs = last && first ? parseISO(last.created_at).getTime() - parseISO(first.created_at).getTime() : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Rute</div>
          <div className="font-mono text-sm truncate">{routeId ?? "(ingen route_id)"}</div>
        </div>
        <div className="text-right text-xs text-muted-foreground tabular-nums">
          <div>{ordered.length} events</div>
          <div>{(durationMs / 1000).toFixed(2)}s span</div>
        </div>
      </div>
      <ol className="relative border-l border-border pl-4 space-y-2">
        {ordered.map((e, i) => {
          const prev = ordered[i - 1];
          const delta = prev ? parseISO(e.created_at).getTime() - parseISO(prev.created_at).getTime() : 0;
          const isOpen = openId === e.id;
          return (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full bg-foreground" />
              <button
                onClick={() => setOpenId(isOpen ? null : e.id)}
                className="w-full text-left rounded-md border border-border bg-card hover:bg-muted/50 px-3 py-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    <Badge variant={eventVariant(e.event_type)} className="font-mono text-[10px]">{e.event_type}</Badge>
                    <span className="text-xs text-muted-foreground truncate">{e.entity_type}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                    {prev && <span className="mr-2">+{(delta / 1000).toFixed(2)}s</span>}
                    <time>{format(parseISO(e.created_at), "HH:mm:ss.SSS")}</time>
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="mt-1 ml-1 rounded-md bg-muted/40 border border-border p-3 text-xs space-y-1">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    <span>entity_id: <span className="font-mono text-foreground">{e.entity_id ?? "—"}</span></span>
                    <span>actor: <span className="font-mono text-foreground">{e.created_by ?? "system"}</span></span>
                    <span>{formatDistanceToNow(parseISO(e.created_at), { locale: da, addSuffix: true })}</span>
                  </div>
                  <pre className={cn("mt-1 overflow-auto rounded bg-background p-2 text-[11px] leading-snug")}>
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}