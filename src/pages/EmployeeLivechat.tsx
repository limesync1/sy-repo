// EmployeeLivechat — viser virksomhedens livechat-indbakke for medarbejdere
// der har fået `livechat_enabled = true` på deres employee-record.
// Genbruger BusinessLiveChatTab så medarbejderen ser præcis det samme som
// virksomhedsejeren (filtreret på business_id), bare i medarbejder-shellen.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import EmployeeShell from "@/components/employee/EmployeeShell";
import BusinessLiveChatTab from "@/components/admin/BusinessLiveChatTab";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";

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
  const businessName = employee?.business?.name;

  return (
    <EmployeeShell activeTab={"livechat" as any} title="Livechat">
      {businessId && businessName ? (
        <BusinessLiveChatTab businessId={businessId} businessName={businessName} />
      ) : (
        <ListCardSkeleton rows={5} />
      )}
    </EmployeeShell>
  );
};

export default EmployeeLivechat;