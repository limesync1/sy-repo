import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, CalendarClock, HardDrive } from "lucide-react";
import { HealthExt, formatBytes } from "./shared";

export default function InfrastructureSections({ ext }: { ext: HealthExt }) {
  return (
    <>
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" /> Største tabeller
        </h2>
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          {(ext.top_tables || []).length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Ingen data.</div>
          ) : (
            <div className="divide-y divide-border">
              {ext.top_tables.map((t) => {
                const max = ext.top_tables[0]?.bytes || 1;
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
          {!ext.has_cron ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">pg_cron er ikke aktiveret på denne database.</div>
          ) : ext.cron_jobs.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Ingen jobs registreret.</div>
          ) : (
            <div className="divide-y divide-border">
              {ext.cron_jobs.map((j) => (
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
          {(ext.buckets || []).length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">Ingen buckets.</Card>
          ) : (
            ext.buckets.map((b) => (
              <Card key={b.id} className="rounded-xl border-border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.public ? "Offentlig" : "Privat"}</p>
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
  );
}