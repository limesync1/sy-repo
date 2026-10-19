// Åbner kundens redigeringsvindue fra et stop i ruteplanlæggeren.
// Finder kunden i kartoteket via aftalens e-mail; findes den ikke, oprettes
// en ny kartotekspost med aftalens oplysninger.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CustomerEditDialog, { type EditableCustomer } from "@/components/admin/CustomerEditDialog";

type Props = { orderId: string | null; onClose: () => void };

export default function StopCustomerEditDialog({ orderId, onClose }: Props) {
  const [ctx, setCtx] = useState<{ businessId: string; businessName: string; initial: EditableCustomer } | null>(null);

  useEffect(() => {
    if (!orderId) { setCtx(null); return; }
    let cancelled = false;
    (async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select("business_id, customer_name, customer_email, customer_phone, address, zip_code, city, businesses ( name )")
        .eq("id", orderId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !order) { toast.error("Kunne ikke hente kunden"); onClose(); return; }
      const o = order as any;
      const email = (o.customer_email || "").trim();
      let initial: EditableCustomer | null = null;
      if (email) {
        const [{ data: priv }, { data: biz }] = await Promise.all([
          supabase.from("private_customers" as any).select("*").eq("business_id", o.business_id).ilike("email", email).maybeSingle(),
          supabase.from("business_customers" as any).select("*").eq("business_id", o.business_id).ilike("email", email).maybeSingle(),
        ]);
        const row: any = priv || biz;
        if (row) {
          initial = {
            id: row.id,
            type: priv ? "private" : "business",
            name: row.name ?? undefined,
            company_name: row.company_name ?? undefined,
            cvr: row.cvr ?? undefined,
            contact_name: row.contact_name ?? undefined,
            email: row.email,
            phone: row.phone, address: row.address, zip_code: row.zip_code, city: row.city,
            latitude: row.latitude, longitude: row.longitude, notes: row.notes, avatar_url: row.avatar_url ?? null,
            customer_number: row.customer_number ?? null, customer_group: row.customer_group ?? null,
            vat_zone: row.vat_zone ?? null, is_blocked: row.is_blocked ?? false,
            payment_terms_days: row.payment_terms_days ?? null, ean_number: row.ean_number ?? null,
          };
        }
      }
      if (cancelled) return;
      setCtx({
        businessId: o.business_id,
        businessName: o.businesses?.name || "",
        initial: initial ?? {
          type: "private", name: o.customer_name || "", email,
          phone: o.customer_phone, address: o.address, zip_code: o.zip_code, city: o.city,
        },
      });
    })();
    return () => { cancelled = true; };
  }, [orderId, onClose]);

  if (!ctx) return null;
  return (
    <CustomerEditDialog
      open={!!orderId}
      onOpenChange={(o) => { if (!o) onClose(); }}
      businessId={ctx.businessId}
      businessName={ctx.businessName}
      initial={ctx.initial}
    />
  );
}
