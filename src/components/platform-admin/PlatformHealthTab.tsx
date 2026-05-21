// PlatformHealthTab — drift- og sundhedsoverblik for platformen.
// Henter alle tal i ét RPC-kald (admin_health_stats) så fanen loader hurtigt
// uden N kald. Viser e-mailleverancer, notifikationskø, accounting DLQ og
// aktivitetsstatistik. Bruges af admins til at fange driftsproblemer tidligt.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { StatGridSkeleton, ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { RefreshCw, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Health, HealthExt } from "./health/shared";
import EmailHealthSection from "./health/EmailHealthSection";
import QueuesSection from "./health/QueuesSection";
import TopActionsSection from "./health/TopActionsSection";
import InfrastructureSections from "./health/InfrastructureSections";

export default function PlatformHealthTab() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-health-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_health_stats" as any);
      if (error) throw error;
      return data as unknown as Health;
    },
    refetchInterval: 60_000,
  });

  const ext = useQuery({
    queryKey: ["admin-health-extended"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_health_extended" as any);
      if (error) throw error;
      return data as unknown as HealthExt;
    },
    refetchInterval: 120_000,
  });

  const runFullCheck = async () => {
    toast.loading("Kører fuld sundhedskontrol…", { id: "health-check" });
    try {
      await Promise.all([refetch(), ext.refetch()]);
      toast.success("Sundhedskontrol færdig", { id: "health-check" });
    } catch (e: any) {
      toast.error(`Fejl: ${e?.message || "ukendt"}`, { id: "health-check" });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sundhed"
        description={
          data?.generated_at
            ? `Opdateret ${new Date(data.generated_at).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`
            : "Drift- og leverance-status for platformen"
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Opdatér
            </Button>
            <Button size="sm" onClick={runFullCheck} disabled={isFetching || ext.isFetching}>
              <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
              Kør fuld kontrol
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <>
          <StatGridSkeleton count={4} />
          <ListCardSkeleton rows={4} />
        </>
      ) : !data ? (
        <Card className="p-6 text-sm text-muted-foreground">Kunne ikke hente sundhedsdata.</Card>
      ) : (
        <>
          <EmailHealthSection data={data} />
          <QueuesSection data={data} />
          <TopActionsSection data={data} />
        </>
      )}

      {ext.data && <InfrastructureSections ext={ext.data} />}
    </div>
  );
}