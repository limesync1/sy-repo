// BusinessDetailSheet — komplet kontrolpanel for en enkelt virksomhed.
// Samler alle admin-handlinger ét sted: prøveperiode, plan, ejer,
// soft/hard-delete. Bruger admin_* RPC'er fra migrationen, som logger
// til admin_audit_log og kun kan kaldes af admins (has_role).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DangerZone from "./business-detail/DangerZone";
import PlanPanel from "./business-detail/PlanPanel";
import BusinessSheetHeader from "./business-detail/SheetHeader";
import OverviewPanel from "./business-detail/OverviewPanel";
import UsersPanel from "./business-detail/UsersPanel";
import AuditPanel from "./business-detail/AuditPanel";

interface Props {
  businessId: string | null;
  onClose: () => void;
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function BusinessDetailSheet({ businessId, onClose }: Props) {
  const qc = useQueryClient();

  const { data: business } = useQuery({
    queryKey: ["admin-business-detail", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses").select("*").eq("id", businessId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: plan } = useQuery({
    queryKey: ["admin-business-plan-detail", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_plans").select("*").eq("business_id", businessId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: owner } = useQuery({
    queryKey: ["admin-business-owner", business?.owner_id],
    enabled: !!business?.owner_id,
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_business_stats");
      const row = (data || []).find((r: any) => r.business_id === businessId);
      return row ? { email: row.owner_email } : null;
    },
  });

  const { data: auditLog } = useQuery({
    queryKey: ["admin-audit-business", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .eq("target_type", "business")
        .eq("target_id", businessId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Medarbejdere på virksomheden — vises i Brugere-fanen så admin nemt kan
  // se hvem der har adgang og fx sende password-reset.
  const { data: employees } = useQuery({
    queryKey: ["admin-business-employees", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id,name,email,phone,title,is_active,user_id,livechat_enabled,created_at")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-business-detail", businessId] });
    qc.invalidateQueries({ queryKey: ["admin-business-plan-detail", businessId] });
    qc.invalidateQueries({ queryKey: ["admin-audit-business", businessId] });
    qc.invalidateQueries({ queryKey: ["admin-businesses"] });
    qc.invalidateQueries({ queryKey: ["admin-business-plans"] });
  };

  const trialEnd = plan?.trial_ends_at ? new Date(plan.trial_ends_at) : null;
  const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / 86400000) : null;
  const isDeleted = !!business?.deleted_at;

  return (
    <Sheet open={!!businessId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <BusinessSheetHeader business={business} ownerEmail={owner?.email} isDeleted={isDeleted} />

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Oversigt</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="users">Brugere</TabsTrigger>
            <TabsTrigger value="audit">Log</TabsTrigger>
            <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">Fare</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewPanel business={business} plan={plan} daysLeft={daysLeft} businessId={businessId!} onInvalidate={invalidateAll} />
          </TabsContent>

          <TabsContent value="plan">
            <PlanPanel
              businessId={businessId!}
              plan={plan}
              ownerEmail={owner?.email}
              daysLeft={daysLeft}
              onInvalidate={invalidateAll}
            />
          </TabsContent>

          <TabsContent value="users">
            <UsersPanel business={business} ownerEmail={owner?.email} employees={employees} />
          </TabsContent>

          <TabsContent value="audit">
            <AuditPanel auditLog={auditLog} />
          </TabsContent>

          <TabsContent value="danger" className="space-y-3 mt-4">
            <DangerZone
              businessId={businessId!}
              businessName={business?.name || ""}
              isDeleted={isDeleted}
              onInvalidate={invalidateAll}
              onAfterHardDelete={onClose}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}