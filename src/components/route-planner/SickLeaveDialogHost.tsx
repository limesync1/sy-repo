// Lazy-mounted host for "Meld syg"-dialogen, så planlæggeren ikke re-renderer
// ved åbn/luk (samme mønster som CreateOrderDialogHost).
import { lazy, Suspense, useEffect, useState } from "react";

const SickLeaveDialog = lazy(() => import("@/components/route-planner/SickLeaveDialog"));

type Payload = { employeeId?: string | null } | null;
type Listener = (p: Payload) => void;
const listeners = new Set<Listener>();

export function openSickLeaveDialog(employeeId?: string | null) {
  listeners.forEach((l) => l({ employeeId: employeeId ?? null }));
}

export default function SickLeaveDialogHost({
  businessId, employees, date,
}: {
  businessId: string;
  employees: {
    id: string;
    name: string;
    is_active?: boolean;
    max_stops_per_day?: number | null;
    avatar_url?: string | null;
    color?: string | null;
  }[];
  date?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const listener: Listener = (p) => {
      setEmployeeId(p?.employeeId ?? null);
      setMounted(true);
      setOpen(true);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <SickLeaveDialog
        open={open}
        onOpenChange={setOpen}
        businessId={businessId}
        employees={employees}
        initialEmployeeId={employeeId}
        initialDate={date}
      />
    </Suspense>
  );
}