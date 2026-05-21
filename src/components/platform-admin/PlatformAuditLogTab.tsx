// PlatformAuditLogTab — viser alle admin-handlinger på tværs af platformen.
// Kilder: admin_audit_log skrevet af _admin_log() i alle admin_* RPC'er.
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PageHeader, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Filter } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  extend_trial: "Forlænget prøveperiode",
  reset_trial: "Nulstillet prøveperiode",
  end_trial_now: "Afsluttet prøveperiode nu",
  force_active: "Markeret som betalende",
  transfer_owner: "Overdraget ejer",
  soft_delete: "Arkiveret (soft-delete)",
  restore: "Gendannet",
  hard_delete: "Slettet permanent",
};

export default function PlatformAuditLogTab() {
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: log, isLoading } = useQuery({
    queryKey: ["admin-audit-log-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return (log || []).filter((e: any) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        e.action?.toLowerCase().includes(s) ||
        e.admin_email?.toLowerCase().includes(s) ||
        e.target_label?.toLowerCase().includes(s)
      );
    });
  }, [log, q, actionFilter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aktivitetslog"
        description={`${filtered.length} handlinger`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg admin, virksomhed eller handling..." />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[220px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle handlinger</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<History />} title="Ingen handlinger" description="Når admins ændrer noget vises det her." />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((e: any) => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <History className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-foreground">{e.admin_email || "Admin"}</span>{" "}
                    <span className="text-muted-foreground">{ACTION_LABELS[e.action] || e.action}</span>{" "}
                    {e.target_label && <span className="font-medium text-foreground">{e.target_label}</span>}
                  </p>
                  {e.details && Object.keys(e.details).length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {Object.entries(e.details).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(" · ")}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}