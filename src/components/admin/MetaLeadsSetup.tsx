import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, RefreshCw, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/admin/shared/AdminUI";

type MetaConnection = {
  status: "disconnected" | "pending" | "connected" | "expired" | "error";
  page_name: string | null;
  instagram_account_name: string | null;
  selected_form_ids: string[];
  pixel_id: string | null;
  lead_ads_enabled: boolean;
  conversions_api_enabled: boolean;
  last_synced_at: string | null;
  last_error: string | null;
};

const statusLabel: Record<MetaConnection["status"], string> = {
  disconnected: "Ikke forbundet",
  pending: "Afventer opsætning",
  connected: "Forbundet",
  expired: "Forbind igen",
  error: "Kræver handling",
};

export const MetaLeadsSetup = ({ businessId }: { businessId: string }) => {
  const { data: connection, isFetching, refetch } = useQuery({
    queryKey: ["meta-leads-connection", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_connections")
        .select("status, page_name, instagram_account_name, selected_form_ids, pixel_id, lead_ads_enabled, conversions_api_enabled, last_synced_at, last_error")
        .eq("business_id", businessId)
        .maybeSingle();
      if (error) throw error;
      return data as MetaConnection | null;
    },
  });

  const connected = connection?.status === "connected";
  const startSetup = async () => {
    const { data, error } = await supabase.functions.invoke("meta-oauth-start", { body: { businessId } });
    if (error || !data?.url) return;
    window.location.assign(data.url);
  };

  return (
    <SectionCard
      title="Meta Lead Ads og måling"
      icon={<Settings2 />}
      description="Saml leads fra Facebook og Instagram her, og mål indsendte leads og bookinger med samtykke."
      className="overflow-hidden shadow-premium"
      action={<Badge variant={connected ? "default" : "secondary"}>{statusLabel[connection?.status ?? "disconnected"]}</Badge>}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <MetaCapability label="Lead Ads" active={!!connection?.lead_ads_enabled} detail={connection?.page_name || "Vælg Facebook-side og formularer"} />
          <MetaCapability label="Pixel og Conversions API" active={!!connection?.conversions_api_enabled} detail={connection?.pixel_id ? `Pixel ${connection.pixel_id}` : "Mål leads og bookinger med samtykke"} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Opdatér
          </Button>
          <Button type="button" size="sm" onClick={startSetup} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> {connected ? "Administrér Meta" : "Forbind Meta"}
          </Button>
        </div>
      </div>
      {connection?.last_error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{connection.last_error}</p>}
    </SectionCard>
  );
};

const MetaCapability = ({ label, active, detail }: { label: string; active: boolean; detail: string }) => (
  <div className="flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2.5">
    <CheckCircle2 className={active ? "mt-0.5 h-4 w-4 shrink-0 text-success" : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"} />
    <div className="min-w-0"><p className="font-semibold text-foreground">{label}</p><p className="mt-0.5 truncate text-muted-foreground">{detail}</p></div>
  </div>
);

export default MetaLeadsSetup;