// AccountingHealthSection — viser åbne idempotens-alerts for accounting-sync.
// Bruger den server-side funktion `accounting_health_summary` (admin-only).
// Knappen "Kør tjek nu" trigger `accounting_health_check_run()` ad hoc.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, PlayCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Alert = {
  id: string;
  business_id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  summary: string;
  details: any;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

type Summary = {
  open_count: number;
  critical_count: number;
  by_kind: Record<string, number>;
  last_seen_at: string | null;
  alerts: Alert[];
};

const KIND_LABEL: Record<string, string> = {
  duplicate_order: "Dublet-ordre",
  missing_link: "Manglende link",
  orphan_external_id: "Forældreløs reference",
};

const SEV_TONE: Record<string, "destructive" | "default" | "secondary"> = {
  critical: "destructive",
  warning: "default",
  info: "secondary",
};

export default function AccountingHealthSection() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["accounting-health-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("accounting_health_summary" as any);
      if (error) throw error;
      return data as unknown as Summary;
    },
    refetchInterval: 60_000,
  });

  const runNow = async () => {
    setRunning(true);
    toast.loading("Kører accounting-helbredstjek…", { id: "acct-health" });
    try {
      const { data, error } = await supabase.rpc("accounting_health_check_run" as any);
      if (error) throw error;
      const r = data as any;
      toast.success(
        `Færdig: ${r?.duplicates ?? 0} dubletter, ${r?.missing_links ?? 0} manglende links, ${r?.orphan_links ?? 0} forældreløse`,
        { id: "acct-health" },
      );
      await qc.invalidateQueries({ queryKey: ["accounting-health-summary"] });
    } catch (e: any) {
      toast.error(`Fejl: ${e?.message || "ukendt"}`, { id: "acct-health" });
    } finally {
      setRunning(false);
    }
  };

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("accounting_health_alerts" as any)
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Alert markeret som løst");
      await qc.invalidateQueries({ queryKey: ["accounting-health-summary"] });
    }
  };

  const open = data?.open_count ?? 0;
  const crit = data?.critical_count ?? 0;
  const allClear = !isLoading && open === 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {allClear ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : crit > 0 ? (
              <ShieldAlert className="h-4 w-4 text-destructive" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            <h3 className="text-sm font-semibold">Accounting-idempotens</h3>
            {open > 0 && (
              <Badge variant={crit > 0 ? "destructive" : "default"}>
                {open} åben{open === 1 ? "" : "e"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Dagligt tjek for dublerede regnskabsordrer, manglende lokale links og
            forældreløse externe referencer. Kører automatisk kl. 03:00.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={runNow} disabled={running}>
          <PlayCircle className={`mr-1 h-3.5 w-3.5 ${running ? "animate-pulse" : ""}`} />
          Kør tjek nu
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-xs text-muted-foreground">Henter…</p>
      ) : allClear ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Ingen åbne alerts — idempotens er sund.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {(data?.alerts ?? []).map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={SEV_TONE[a.severity] ?? "secondary"} className="text-[10px]">
                    {KIND_LABEL[a.kind] ?? a.kind}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{a.summary}</span>
                  {a.occurrence_count > 1 && (
                    <span className="text-[10px] text-muted-foreground">×{a.occurrence_count}</span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Sidst set {new Date(a.last_seen_at).toLocaleString("da-DK")} · virksomhed{" "}
                  <code className="text-[10px]">{a.business_id.slice(0, 8)}</code>
                </div>
                {a.details && Object.keys(a.details).length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                      Detaljer
                    </summary>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-secondary/40 p-2 text-[10px]">
                      {JSON.stringify(a.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => resolve(a.id)} className="h-7 text-xs">
                Markér som løst
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}