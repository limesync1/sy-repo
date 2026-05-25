import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle2, XCircle, Calculator, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Stat } from "../lib/Stat";
import { useQuery } from "@tanstack/react-query";

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("da-DK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const PROVIDER_LABELS: Record<string, string> = {
  economic: "e-conomic",
  billy: "Billy",
  dinero: "Dinero",
  zenegy: "Zenegy",
};

interface Props {
  business: any;
  plan: any;
  daysLeft: number | null;
  businessId: string;
  onInvalidate: () => void;
}

export default function OverviewPanel({ business, plan, daysLeft, businessId, onInvalidate }: Props) {
  // Hent regnskabsintegration + tæl synkroniseringer så admin kan se
  // status uden at åbne virksomhedens eget regnskabspanel.
  const { data: accounting, isLoading: loadingAccounting } = useQuery({
    queryKey: ["admin-business-accounting", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const [{ data: integ }, { count: queueCount }, { count: failedCount }, { data: lastLog }] = await Promise.all([
        supabase.from("accounting_integrations")
          .select("id, business_id, provider, is_active, agreement_number, organization_id, last_pull_at, last_push_at, last_error, last_error_at, settings, consecutive_failures, paused_until, last_kick_at, created_at, updated_at")
          .eq("business_id", businessId).maybeSingle(),
        supabase.from("accounting_sync_queue").select("id", { count: "exact", head: true })
          .eq("business_id", businessId).in("status", ["pending", "processing"]),
        supabase.from("accounting_sync_queue").select("id", { count: "exact", head: true })
          .eq("business_id", businessId).eq("status", "failed"),
        supabase.from("accounting_sync_log").select("created_at,status,direction,entity_type,message")
          .eq("business_id", businessId).order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        integration: integ,
        pendingCount: queueCount ?? 0,
        failedCount: failedCount ?? 0,
        recentLog: lastLog ?? [],
      };
    },
  });

  return (
    <div className="space-y-3 mt-4">
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Status</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Oprettet" value={fmtDate(business?.created_at)} />
          <Stat label="Plan-status" value={plan?.status || "—"} />
          <Stat label="Verificeret" value={business?.is_verified ? "Ja" : "Nej"} />
          <Stat label="Aktiv" value={business?.is_active ? "Ja" : "Nej"} />
          <Stat label="Prøve slutter" value={fmtDate(plan?.trial_ends_at)} />
          <Stat label="Dage tilbage" value={daysLeft !== null ? `${daysLeft}` : "—"} />
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Status-handlinger</h3>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline"
            onClick={async () => {
              const { error } = await supabase.from("businesses").update({ is_verified: !business?.is_verified }).eq("id", businessId);
              if (error) toast.error(error.message); else { toast.success("Opdateret"); onInvalidate(); }
            }}>
            {business?.is_verified ? <><XCircle className="h-3.5 w-3.5 mr-1.5" />Fjern verifikation</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Verificér</>}
          </Button>
          <Button size="sm" variant="outline"
            onClick={async () => {
              const { error } = await supabase.from("businesses").update({ is_active: !business?.is_active }).eq("id", businessId);
              if (error) toast.error(error.message); else { toast.success("Opdateret"); onInvalidate(); }
            }}>
            {business?.is_active ? "Deaktivér" : "Aktivér"}
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4" />Regnskabsintegration
        </h3>
        {loadingAccounting ? (
          <p className="text-xs text-muted-foreground">Henter…</p>
        ) : !accounting?.integration ? (
          <p className="text-sm text-muted-foreground">Virksomheden har ikke integreret et regnskabsprogram.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-semibold">
                {PROVIDER_LABELS[accounting.integration.provider] || accounting.integration.provider}
              </Badge>
              <Badge variant={accounting.integration.is_active ? "default" : "secondary"}>
                {accounting.integration.is_active ? "Aktiv" : "Inaktiv"}
              </Badge>
              {accounting.failedCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />{accounting.failedCount} fejlede
                </Badge>
              )}
              {accounting.pendingCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />{accounting.pendingCount} i kø
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Aftalenummer" value={accounting.integration.agreement_number || "—"} />
              <Stat label="Organisation" value={accounting.integration.organization_id || "—"} />
              <Stat label="Seneste push" value={fmtDateTime(accounting.integration.last_push_at)} />
              <Stat label="Seneste pull" value={fmtDateTime(accounting.integration.last_pull_at)} />
              <Stat label="Sammenhængende fejl" value={String(accounting.integration.consecutive_failures ?? 0)} />
              <Stat label="Pauseret indtil" value={fmtDateTime(accounting.integration.paused_until)} />
            </div>

            {accounting.integration.last_error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs">
                <p className="font-medium text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />
                  Seneste fejl ({fmtDateTime(accounting.integration.last_error_at)})
                </p>
                <p className="mt-1 text-destructive/90 break-words">{accounting.integration.last_error}</p>
              </div>
            )}

            {accounting.recentLog.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Seneste synkroniseringer</p>
                <div className="rounded-md border divide-y">
                  {accounting.recentLog.map((row: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 px-2 py-1.5 text-xs">
                      <Badge
                        variant={row.status === "success" ? "default" : row.status === "error" ? "destructive" : "secondary"}
                        className="shrink-0 h-5"
                      >
                        {row.status}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {row.direction === "push" ? "→ " : "← "}{row.entity_type}
                          {row.message ? ` · ${row.message}` : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{fmtDateTime(row.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}