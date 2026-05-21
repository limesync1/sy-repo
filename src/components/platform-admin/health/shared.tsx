import { Card } from "@/components/ui/card";

export type Health = {
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

export type HealthExt = {
  top_tables: { schema: string; name: string; bytes: number; rows: number }[];
  cron_jobs: { jobid: number; jobname: string | null; schedule: string; active: boolean; command: string; last_run_at: string | null; last_status: string | null }[];
  has_cron: boolean;
  buckets: { id: string; name: string; public: boolean; created_at: string; objects: number; bytes: number }[];
  generated_at: string;
};

export const STATUS_LABEL: Record<string, string> = {
  sent: "Leveret", pending: "Afventer", suppressed: "Blokeret",
  failed: "Fejlet", bounced: "Bounced", complained: "Klage", dlq: "DLQ",
};

export function formatBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

export function sumStatus(obj: Record<string, number> | null | undefined, keys: string[]) {
  if (!obj) return 0;
  return keys.reduce((s, k) => s + (Number(obj[k]) || 0), 0);
}

export function HealthStatCard({
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