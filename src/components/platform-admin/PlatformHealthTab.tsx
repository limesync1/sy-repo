// PlatformHealthTab — drift- og sundhedsoverblik for platformen.
// Henter alle tal i ét RPC-kald (admin_health_stats) så fanen loader hurtigt
// uden N kald. Viser e-mailleverancer, notifikationskø, accounting DLQ og
// aktivitetsstatistik. Bruges af admins til at fange driftsproblemer tidligt.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { StatGridSkeleton, ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import {
  Mail, MailX, Ban, Bell, AlertTriangle, RefreshCw, Activity, Clock, Database, CalendarClock, HardDrive, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

type Health = {
  email_7d: Record<string, number>;
  email_24h: Record<string, number>;
  suppressed_total: number;
  suppressed_by_reason: Record<string, number>;
  notif_pending: number;
  notif_failed_24h: number;
  notif_oldest_pending: string | null;
  dlq_unresolved: number;
  dlq_24h: number;
  sync_queue_pending: number;
  sync_queue_failed: number;
  audit_24h: number;
  audit_top_actions: { action: string; n: number }[];
  generated_at: string;
};

type HealthExt = {
  top_tables: { schema: string; name: string; bytes: number; rows: number }[];
  cron_jobs: { jobid: number; jobname: string | null; schedule: string; active: boolean; command: string; last_run_at: string | null; last_status: string | null }[];
  has_cron: boolean;
  buckets: { id: string; name: string; public: boolean; created_at: string; objects: number; bytes: number }[];
  generated_at: string;
};

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

const STATUS_LABEL: Record<string, string> = {
  sent: "Leveret",
  pending: "Afventer",
  suppressed: "Blokeret",
  failed: "Fejlet",
  bounced: "Bounced",
  complained: "Klage",
  dlq: "DLQ",
};

function sumStatus(obj: Record<string, number> | null | undefined, keys: string[]) {
  if (!obj) return 0;
  return keys.reduce((s, k) => s + (Number(obj[k]) || 0), 0);
}

function StatCard({
  title, value, sub, icon: Icon, tone = "default",
}: { title: string; value: string | number; sub?: string; icon: any; tone?: "default" | "danger" | "warn" | "ok" }) {
  const toneRing =
    tone === "danger" ? "ring-destructive/40"
    : tone === "warn" ? "ring-amber-400/40"
    : tone === "ok" ? "ring-emerald-400/40"
    : "ring-border";
  const toneIcon =
    tone === "danger" ? "text-destructive bg-destructive/10"
    : tone === "warn" ? "text-amber-600 bg-amber-100 dark:bg-amber-500/10"
    : tone === "ok" ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10"
    : "text-foreground bg-secondary";
  return (
    <Card className={`rounded-xl border-border p-4 shadow-sm ring-1 ${toneRing}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneIcon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

export default function PlatformHealthTab() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-health-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_health_stats" as any);
      if (error) throw error;
      return data as unknown as Health;
    },
    refetchInterval: 60_000,
  });

  const ext = useQuery({
    queryKey: ["admin-health-extended"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_health_extended" as any);
      if (error) throw error;
      return data as unknown as HealthExt;
    },
    refetchInterval: 120_000,
  });

  const runFullCheck = async () => {
    toast.loading("Kører fuld sundhedskontrol…", { id: "health-check" });
    try {
      await Promise.all([refetch(), ext.refetch()]);
      toast.success("Sundhedskontrol færdig", { id: "health-check" });
    } catch (e: any) {
      toast.error(`Fejl: ${e?.message || "ukendt"}`, { id: "health-check" });
    }
  };

  const e7 = data?.email_7d || {};
  const e24 = data?.email_24h || {};
  const delivered7 = sumStatus(e7, ["sent"]);
  const failed7 = sumStatus(e7, ["failed", "bounced", "complained", "dlq"]);
  const total7 = Object.values(e7).reduce((s, n) => s + Number(n || 0), 0);
  const deliveryRate = total7 > 0 ? Math.round((delivered7 / total7) * 100) : null;

  const oldestMin = data?.notif_oldest_pending
    ? Math.max(0, Math.round((Date.now() - new Date(data.notif_oldest_pending).getTime()) / 60000))
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sundhed"
        description={
          data?.generated_at
            ? `Opdateret ${new Date(data.generated_at).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`
            : "Drift- og leverance-status for platformen"
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Opdatér
            </Button>
            <Button size="sm" onClick={runFullCheck} disabled={isFetching || ext.isFetching}>
              <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
              Kør fuld kontrol
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <>
          <StatGridSkeleton count={4} />
          <ListCardSkeleton rows={4} />
        </>
      ) : !data ? (
        <Card className="p-6 text-sm text-muted-foreground">Kunne ikke hente sundhedsdata.</Card>
      ) : (
        <>
          {/* Email-leverance */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mailleverance</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Leveret · 7 dage"
                value={delivered7.toLocaleString("da-DK")}
                sub={deliveryRate != null ? `${deliveryRate}% leveringsrate` : "Ingen data"}
                icon={Mail}
                tone={deliveryRate != null && deliveryRate < 90 ? "warn" : "ok"}
              />
              <StatCard
                title="Fejlet · 7 dage"
                value={failed7.toLocaleString("da-DK")}
                sub={`${sumStatus(e24, ["failed", "bounced", "complained", "dlq"])} sidste 24t`}
                icon={MailX}
                tone={failed7 > 0 ? "danger" : "default"}
              />
              <StatCard
                title="Blokerede modtagere"
                value={(data.suppressed_total || 0).toLocaleString("da-DK")}
                sub={
                  Object.entries(data.suppressed_by_reason || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "Ingen"
                }
                icon={Ban}
                tone={data.suppressed_total > 0 ? "warn" : "default"}
              />
              <StatCard
                title="Admin-handlinger · 24t"
                value={(data.audit_24h || 0).toLocaleString("da-DK")}
                sub="Aktivitet i platform-admin"
                icon={Activity}
              />
            </div>

            <Card className="rounded-xl border-border p-4 shadow-sm">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Status pr. type (sidste 7 dage)</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(e7).length === 0 ? (
                  <span className="text-xs text-muted-foreground">Ingen e-mails sendt.</span>
                ) : (
                  Object.entries(e7)
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .map(([status, n]) => (
                      <Badge
                        key={status}
                        variant="outline"
                        className={
                          status === "sent"
                            ? "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : ["failed", "bounced", "complained", "dlq"].includes(status)
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-secondary/60 text-foreground"
                        }
                      >
                        {STATUS_LABEL[status] || status}: <span className="ml-1 font-semibold tabular-nums">{n}</span>
                      </Badge>
                    ))
                )}
              </div>
            </Card>
          </section>

          {/* Køer */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Køer & integration</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Kundenotifikationer i kø"
                value={(data.notif_pending || 0).toLocaleString("da-DK")}
                sub={
                  oldestMin != null
                    ? `Ældste afventer i ${oldestMin >= 60 ? `${Math.round(oldestMin / 60)}t` : `${oldestMin}m`}`
                    : "Ingen afventende"
                }
                icon={Bell}
                tone={oldestMin != null && oldestMin > 60 ? "warn" : "default"}
              />
              <StatCard
                title="Notifikationer fejlet · 24t"
                value={(data.notif_failed_24h || 0).toLocaleString("da-DK")}
                sub="Kræver evt. manuelt opsamlingsforsøg"
                icon={AlertTriangle}
                tone={data.notif_failed_24h > 0 ? "danger" : "default"}
              />
              <StatCard
                title="Bogføring DLQ"
                value={(data.dlq_unresolved || 0).toLocaleString("da-DK")}
                sub={`${data.dlq_24h || 0} flyttet sidste 24t`}
                icon={AlertTriangle}
                tone={data.dlq_unresolved > 0 ? "danger" : "ok"}
              />
              <StatCard
                title="Sync-kø"
                value={(data.sync_queue_pending || 0).toLocaleString("da-DK")}
                sub={`${data.sync_queue_failed || 0} fejlede`}
                icon={Clock}
                tone={data.sync_queue_failed > 0 ? "warn" : "default"}
              />
            </div>
          </section>

          {/* Top admin-handlinger */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top admin-handlinger (7 dage)</h2>
            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
              {(data.audit_top_actions || []).length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Ingen handlinger registreret.</div>
              ) : (
                <div className="divide-y divide-border">
                  {data.audit_top_actions.map((a) => {
                    const max = data.audit_top_actions[0]?.n || 1;
                    const pct = Math.max(4, Math.round((a.n / max) * 100));
                    return (
                      <div key={a.action} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-48 truncate text-sm font-medium text-foreground">{a.action}</span>
                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="absolute inset-y-0 left-0 rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-sm font-semibold tabular-nums text-foreground">{a.n}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>
        </>
      )}

      {/* Database, cron & storage */}
      {ext.data && (
        <>
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Største tabeller
            </h2>
            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
              {(ext.data.top_tables || []).length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Ingen data.</div>
              ) : (
                <div className="divide-y divide-border">
                  {ext.data.top_tables.map((t) => {
                    const max = ext.data!.top_tables[0]?.bytes || 1;
                    const pct = Math.max(4, Math.round((t.bytes / max) * 100));
                    return (
                      <div key={`${t.schema}.${t.name}`} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-56 truncate text-sm font-medium text-foreground">{t.schema}.{t.name}</span>
                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="absolute inset-y-0 left-0 rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">{t.rows.toLocaleString("da-DK")} rk.</span>
                        <span className="w-20 text-right text-sm font-semibold tabular-nums text-foreground">{formatBytes(t.bytes)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" /> Planlagte jobs (pg_cron)
            </h2>
            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
              {!ext.data.has_cron ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">pg_cron er ikke aktiveret på denne database.</div>
              ) : ext.data.cron_jobs.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">Ingen jobs registreret.</div>
              ) : (
                <div className="divide-y divide-border">
                  {ext.data.cron_jobs.map((j) => (
                    <div key={j.jobid} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {j.jobname || `Job #${j.jobid}`}
                          {!j.active && <Badge variant="outline" className="ml-2 text-[10px]">Inaktiv</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate font-mono">{j.schedule} · {j.command}</p>
                      </div>
                      <div className="text-right">
                        {j.last_run_at ? (
                          <>
                            <Badge variant="outline" className={
                              j.last_status === "succeeded"
                                ? "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : j.last_status === "failed"
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : "border-border bg-secondary/60"
                            }>{j.last_status || "—"}</Badge>
                            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                              {new Date(j.last_run_at).toLocaleString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Ikke kørt endnu</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5" /> Storage-buckets
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(ext.data.buckets || []).length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">Ingen buckets.</Card>
              ) : (
                ext.data.buckets.map((b) => (
                  <Card key={b.id} className="rounded-xl border-border p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.public ? "Offentlig" : "Privat"}
                        </p>
                      </div>
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-2xl font-semibold tabular-nums text-foreground">{formatBytes(b.bytes)}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{b.objects.toLocaleString("da-DK")} filer</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}