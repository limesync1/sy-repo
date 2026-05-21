import { Bell, AlertTriangle, Clock } from "lucide-react";
import { Health, HealthStatCard } from "./shared";

export default function QueuesSection({ data }: { data: Health }) {
  const oldestMin = data.notif_oldest_pending
    ? Math.max(0, Math.round((Date.now() - new Date(data.notif_oldest_pending).getTime()) / 60000))
    : null;

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Køer & integration</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthStatCard
          title="Kundenotifikationer i kø" value={(data.notif_pending || 0).toLocaleString("da-DK")}
          sub={oldestMin != null ? `Ældste afventer i ${oldestMin >= 60 ? `${Math.round(oldestMin / 60)}t` : `${oldestMin}m`}` : "Ingen afventende"}
          icon={Bell} tone={oldestMin != null && oldestMin > 60 ? "warn" : "default"}
        />
        <HealthStatCard
          title="Notifikationer fejlet · 24t" value={(data.notif_failed_24h || 0).toLocaleString("da-DK")}
          sub="Kræver evt. manuelt opsamlingsforsøg"
          icon={AlertTriangle} tone={data.notif_failed_24h > 0 ? "danger" : "default"}
        />
        <HealthStatCard
          title="Bogføring DLQ" value={(data.dlq_unresolved || 0).toLocaleString("da-DK")}
          sub={`${data.dlq_24h || 0} flyttet sidste 24t`}
          icon={AlertTriangle} tone={data.dlq_unresolved > 0 ? "danger" : "ok"}
        />
        <HealthStatCard
          title="Sync-kø" value={(data.sync_queue_pending || 0).toLocaleString("da-DK")}
          sub={`${data.sync_queue_failed || 0} fejlede`}
          icon={Clock} tone={data.sync_queue_failed > 0 ? "warn" : "default"}
        />
      </div>
    </section>
  );
}