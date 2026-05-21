import { Card } from "@/components/ui/card";

interface Props {
  auditLog: any[] | undefined;
}

export default function AuditPanel({ auditLog }: Props) {
  return (
    <div className="space-y-2 mt-4">
      <Card className="p-3">
        <h3 className="text-sm font-semibold mb-2">Seneste admin-handlinger</h3>
        {!auditLog?.length ? (
          <p className="text-xs text-muted-foreground">Ingen handlinger registreret endnu.</p>
        ) : (
          <ul className="divide-y divide-border">
            {auditLog.map((e: any) => (
              <li key={e.id} className="py-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{e.action}</p>
                    <p className="text-muted-foreground">{e.admin_email || e.admin_id}</p>
                    {e.details && Object.keys(e.details).length > 0 && (
                      <pre className="mt-1 overflow-x-auto rounded bg-secondary/40 p-1.5 text-[10px] text-muted-foreground">{JSON.stringify(e.details, null, 2)}</pre>
                    )}
                  </div>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}