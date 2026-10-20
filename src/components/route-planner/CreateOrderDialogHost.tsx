// CreateOrderDialogHost
// -----------------------------------------------------------------------------
// "Opret bestilling"-dialogen laggede fordi dens open-state lå i store sider
// (ruteplanlægger, aftaler): hvert åbn/luk re-renderede hele siden.
// Her holdes state i en lille ekstern store, så kun denne host re-renderer,
// og selve dialogen lazy-loades + unmountes når den er lukket.
// `channel` adskiller værter, hvis flere sider er monteret samtidig.
import { lazy, Suspense, useEffect, useState } from "react";

const loadDialog = () => import("@/components/route-planner/CreateManualOrderDialog");
const CreateManualOrderDialog = lazy(loadDialog);

/** Hent koden i forvejen (fx ved hover), så første åbning er øjeblikkelig. */
export const preloadCreateOrderDialog = () => { void loadDialog(); };

type Listener = (open: boolean) => void;
const channels = new Map<string, Set<Listener>>();

export function openCreateOrderDialog(channel = "planner") {
  channels.get(channel)?.forEach((l) => l(true));
}

export default function CreateOrderDialogHost({
  businessId,
  businessName,
  channel = "planner",
}: {
  businessId: string;
  businessName: string;
  channel?: string;
}) {
  const [open, setOpen] = useState(false);
  // Holder dialogen monteret et øjeblik efter luk, så exit-animationen kan køre.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const listener: Listener = (v) => {
      if (v) setMounted(true);
      setOpen(v);
    };
    let set = channels.get(channel);
    if (!set) { set = new Set(); channels.set(channel, set); }
    set.add(listener);
    // Forvarm koden i ledig tid, så første åbning ikke venter på netværket.
    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
    const id = idle(preloadCreateOrderDialog);
    return () => {
      set!.delete(listener);
      (window as any).cancelIdleCallback?.(id);
    };
  }, [channel]);

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setMounted(false), 260);
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
