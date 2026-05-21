import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MailX, Ban, Activity } from "lucide-react";
import { Health, HealthStatCard, STATUS_LABEL, sumStatus } from "./shared";

export default function EmailHealthSection({ data }: { data: Health }) {
  const e7 = data.email_7d || {};
  const e24 = data.email_24h || {};
  const delivered7 = sumStatus(e7, ["sent"]);
  const failed7 = sumStatus(e7, ["failed", "bounced", "complained", "dlq"]);
  const total7 = Object.values(e7).reduce((s, n) => s + Number(n || 0), 0);
  const deliveryRate = total7 > 0 ? Math.round((delivered7 / total7) * 100) : null;

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mailleverance</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthStatCard
          title="Leveret · 7 dage" value={delivered7.toLocaleString("da-DK")}
          sub={deliveryRate != null ? `${deliveryRate}% leveringsrate` : "Ingen data"}
          icon={Mail} tone={deliveryRate != null && deliveryRate < 90 ? "warn" : "ok"}
        />
        <HealthStatCard
          title="Fejlet · 7 dage" value={failed7.toLocaleString("da-DK")}
          sub={`${sumStatus(e24, ["failed", "bounced", "complained", "dlq"])} sidste 24t`}
          icon={MailX} tone={failed7 > 0 ? "danger" : "default"}
        />
        <HealthStatCard
          title="Blokerede modtagere" value={(data.suppressed_total || 0).toLocaleString("da-DK")}
          sub={Object.entries(data.suppressed_by_reason || {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "Ingen"}
          icon={Ban} tone={data.suppressed_total > 0 ? "warn" : "default"}
        />
        <HealthStatCard
          title="Admin-handlinger · 24t" value={(data.audit_24h || 0).toLocaleString("da-DK")}
          sub="Aktivitet i platform-admin" icon={Activity}
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
                <Badge key={status} variant="outline"
                  className={
                    status === "sent"
                      ? "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : ["failed", "bounced", "complained", "dlq"].includes(status)
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border bg-secondary/60 text-foreground"
                  }>
                  {STATUS_LABEL[status] || status}: <span className="ml-1 font-semibold tabular-nums">{n}</span>
                </Badge>
              ))
          )}
        </div>
      </Card>
    </section>
  );
}