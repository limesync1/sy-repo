import { lazy, Suspense, useEffect, useState } from "react";
import type { EditableCustomer } from "./CustomerEditDialog";

const loadDialog = () => import("./CustomerEditDialog");
const CustomerEditDialog = lazy(loadDialog);
type Listener = (initial: EditableCustomer | null) => void;
const channels = new Map<string, Set<Listener>>();

export function openCustomerDialog(channel: string, initial: EditableCustomer | null = null) {
  channels.get(channel)?.forEach((listener) => listener(initial));
}

/** Own dialog state separately so opening/closing never rerenders the customer list. */
export default function CustomerDialogHost({ businessId, businessName, channel }: {
  businessId: string;
  businessName: string;
  channel: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [initial, setInitial] = useState<EditableCustomer | null>(null);

  useEffect(() => {
    const listener: Listener = (customer) => {
      setInitial(customer);
      setMounted(true);
      setOpen(true);
    };
    const listeners = channels.get(channel) ?? new Set<Listener>();
    channels.set(channel, listeners);
    listeners.add(listener);
    const timer = setTimeout(() => { void loadDialog(); }, 1000);
    return () => {
      clearTimeout(timer);
      listeners.delete(listener);
      if (listeners.size === 0) channels.delete(channel);
    };
  }, [channel]);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setMounted(false), 180);
    return () => clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <CustomerEditDialog open={open} onOpenChange={setOpen} initial={initial}
        businessId={businessId} businessName={businessName} />
    </Suspense>
  );
}