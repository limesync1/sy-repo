// Viser materialer og kvalitetssikring på en opgave – kun når virksomheden har
// slået modulerne til under Indstillinger › Håndværk.
import { useTradeModules } from "@/hooks/useTradeModules";
import { MaterialsSection } from "./MaterialsSection";
import { QualitySection } from "./QualitySection";

type Props = {
  orderId?: string | null; businessId?: string | null; stopId?: string | null;
  canManage?: boolean; readOnly?: boolean; customerName?: string | null;
};

export function TradeWorkPanel({ orderId, businessId, stopId, canManage, readOnly, customerName }: Props) {
  const { data } = useTradeModules(businessId);
  if (!orderId || !businessId || !data || (!data.materials && !data.quality)) return null;
  return (
    <>
      {data.materials && <MaterialsSection orderId={orderId} businessId={businessId} stopId={stopId} canManage={canManage} readOnly={readOnly} />}
      {data.quality && <QualitySection orderId={orderId} businessId={businessId} stopId={stopId} canManage={canManage} readOnly={readOnly} customerName={customerName} />}
    </>
  );
}
