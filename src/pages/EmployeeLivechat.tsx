// EmployeeLivechat — viser virksomhedens live-chat indbakke for medarbejdere
// der har fået `livechat_enabled = true` på deres employee-record.
// Genbruger BusinessLiveChatTab så medarbejderen ser præcis det samme som
// virksomhedsejeren (filtreret på business_id), bare i medarbejder-shellen.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import EmployeeShell from "@/components/employee/EmployeeShell";
import BusinessLiveChatTab from "@/components/admin/BusinessLiveChatTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const EmployeeLivechat = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: employee, isLoading } = useMyEmployee();

  useEffect(() => {
    if (!authLoading && !user) navigate("/log-ind");
  }, [authLoading, user, navigate]);

  // Adgang kræver at medarbejder findes OG har livechat_enabled = true.
  useEffect(() => {
    if (isLoading || !employee) return;
    if (!(employee as any).livechat_enabled) navigate("/medarbejder");
  }, [employee, isLoading, navigate]);

  const businessId = employee?.business_id;
  const { data: business } = useQuery({
    queryKey: ["business-name-livechat", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("name, settings")
        .eq("id", businessId!)
        .maybeSingle();
      return data;
    },
  });

  // Bloker også hvis virksomheden selv har slået livechat fra
  useEffect(() => {
    if (!business) return;
    if (!(business.settings as any)?.livechat_enabled) navigate("/medarbejder");
  }, [business, navigate]);

  return (
    <EmployeeShell activeTab={"livechat" as any} title="Livechat">
      {businessId && business?.name ? (
        <BusinessLiveChatTab businessId={businessId} businessName={business.name} />
      ) : (
        <div className="text-sm text-muted-foreground">Indlæser…</div>
      )}
    </EmployeeShell>
  );
};

export default EmployeeLivechat;