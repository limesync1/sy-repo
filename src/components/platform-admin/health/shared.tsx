import { StatCard } from "@/components/admin/shared/AdminUI";
import * as React from "react";

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

/**
 * HealthStatCard — tynd wrapper omkring den delte StatCard så health-faner
 * deler præcis samme visuelle sprog som resten af admin. Tone "default"
 * mappes til "neutral" og icon-komponenten renderes til JSX her.
 */
export function HealthStatCard({
  title, value, sub, icon: Icon, tone = "default",
}: { title: string; value: string | number; sub?: string; icon: any; tone?: "default" | "danger" | "warn" | "ok" }) {
  const mapped = tone === "default" ? "neutral" : tone;
  return (
    <StatCard
      label={title}
      value={value}
      icon={<Icon />}
      hint={sub}
      tone={mapped as any}
    />
  );
}