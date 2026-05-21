import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setImpersonatedBusinessId } from "@/lib/admin-impersonation";

export type ImpersonateState = {
  business: { id: string; name: string };
  sentTo: string | null;
  inputCode: string;
  loading: boolean;
  redeeming: boolean;
};

/**
 * Håndterer 5-cifret e-mail-kode-flow for admin impersonation.
 * Returnerer dialog-state + handlers. UI rendres af `ImpersonationDialog`.
 */
export function useImpersonation() {
  const navigate = useNavigate();
  const [state, setState] = useState<ImpersonateState | null>(null);

  const open = async (b: { id: string; name: string }) => {
    setState({ business: b, sentTo: null, inputCode: "", loading: true, redeeming: false });
    const { data: code, error } = await supabase.rpc("admin_create_impersonation_code", { p_business_id: b.id });
    if (error || !code) {
      toast.error("Kunne ikke generere kode: " + (error?.message ?? "ukendt fejl"));
      setState(null);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const adminEmail = userData?.user?.email;
    if (!adminEmail) {
      toast.error("Kunne ikke finde din admin-email");
      setState(null);
      return;
    }
    const adminName =
      (userData?.user?.user_metadata as Record<string, unknown>)?.full_name as string ||
      (userData?.user?.user_metadata as Record<string, unknown>)?.name as string ||
      adminEmail.split("@")[0];
    const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "admin-impersonation-code",
        recipientEmail: adminEmail,
        idempotencyKey: `admin-impersonation-${b.id}-${code}`,
        templateData: { businessName: b.name, code: code as string, expiresInMinutes: 15, adminName },
      },
    });
    if (mailErr) {
      toast.error("Kunne ikke sende kode på e-mail: " + mailErr.message);
      setState(null);
      return;
    }
    toast.success(`Kode sendt til ${adminEmail}`);
    setState({ business: b, sentTo: adminEmail, inputCode: "", loading: false, redeeming: false });
  };

  const redeem = async () => {
    if (!state) return;
    const code = state.inputCode.trim();
    if (code.length !== 5) {
      toast.error("Koden skal være 5 cifre");
      return;
    }
    setState({ ...state, redeeming: true });
    const { data, error } = await supabase.rpc("admin_redeem_impersonation_code", { p_code: code });
    if (error || !data) {
      toast.error("Ugyldig eller udløbet kode");
      setState({ ...state, redeeming: false });
      return;
    }
    setImpersonatedBusinessId(data as string);
    toast.success(`Logget ind som ${state.business.name}`);
    setState(null);
    navigate("/virksomhed");
  };

  const setCode = (v: string) => setState((p) => (p ? { ...p, inputCode: v } : p));
  const close = () => setState(null);

  return { state, open, redeem, close, setCode };
}