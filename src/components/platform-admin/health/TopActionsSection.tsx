import { Card } from "@/components/ui/card";
import { Health } from "./shared";

export default function TopActionsSection({ data }: { data: Health }) {
  const actions = data.audit_top_actions || [];
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top admin-handlinger (7 dage)</h2>
      <Card className="rounded-xl border-border shadow-sm overflow-hidden">
        {actions.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Ingen handlinger registreret.</div>
        ) : (
          <div className="divide-y divide-border">
            {actions.map((a) => {
              const max = actions[0]?.n || 1;
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
  );
}