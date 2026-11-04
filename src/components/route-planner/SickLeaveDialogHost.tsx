// Lazy-mounted host for "Meld syg"-dialogen, så planlæggeren ikke re-renderer
// ved åbn/luk (samme mønster som CreateOrderDialogHost).
import { lazy, Suspense, useEffect, useState } from "react";

const SickLeaveDialog = lazy(() => import("@/components/route-planner/SickLeaveDialog"));

export type AbsenceKind = "sick" | "vacation";
type Payload = { employeeId?: string | null; kind?: AbsenceKind } | null;
type Listener = (p: Payload) => void;
const listeners = new Set<Listener>();

export function openSickLeaveDialog(employeeId?: string | null, kind: AbsenceKind = "sick") {
  listeners.forEach((l) => l({ employeeId: employeeId ?? null, kind }));
}

export function openVacationDialog(employeeId?: string | null) {
  openSickLeaveDialog(employeeId, "vacation");
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
  const [kind, setKind] = useState<AbsenceKind>("sick");

  useEffect(() => {
    const listener: Listener = (p) => {
      setEmployeeId(p?.employeeId ?? null);
      setKind(p?.kind ?? "sick");
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
        kind={kind}
      />
    </Suspense>
  );
}