// CreateOrderDialogHost
// -----------------------------------------------------------------------------
// "Opret bestilling"-dialogen laggede fordi dens open-state lå i RoutePlanner:
// hvert åbn/luk re-renderede hele planlæggeren (kalender, kort, lister).
// Her holdes state i en lille ekstern store, så kun denne host re-renderer,
// og selve dialogen lazy-loades + unmountes når den er lukket.
import { lazy, Suspense, useEffect, useState } from "react";

const CreateManualOrderDialog = lazy(
  () => import("@/components/route-planner/CreateManualOrderDialog"),
);

type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();

export function openCreateOrderDialog() {
  listeners.forEach((l) => l(true));
}

export default function CreateOrderDialogHost({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const [open, setOpen] = useState(false);
  // Holder dialogen monteret et øjeblik efter luk, så exit-animationen kan køre.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const listener: Listener = (v) => {
      if (v) setMounted(true);
      setOpen(v);
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
      <CreateManualOrderDialog
        open={open}
        onOpenChange={setOpen}
        businessId={businessId}
        businessName={businessName}
      />
    </Suspense>
  );
}
