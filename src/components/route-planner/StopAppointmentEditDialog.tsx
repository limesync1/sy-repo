// Åbner «Ret aftale» (services, pris og interval) direkte fra et stop på ruten.
// Genbruger samme vindue som medarbejderne, så priser beregnes på serveren.
import { useOrderForStop } from "@/hooks/useRoutes";
import { EmployeeStopActions } from "@/components/employee/EmployeeStopActions";

type Props = {
  target: { stopId: string; orderId: string; completed: boolean; routeDate?: string | null } | null;
  onClose: () => void;
};

export default function StopAppointmentEditDialog({ target, onClose }: Props) {
  const { data: order } = useOrderForStop(target?.orderId ?? null);
  if (!target || !order) return null;
  return (
    <EmployeeStopActions
      key={target.stopId}
      stopId={target.stopId}
      order={order}
      completed={target.completed}
      routeDate={target.routeDate ?? null}
      editOnly
      onEditClosed={onClose}
    />
  );
}
