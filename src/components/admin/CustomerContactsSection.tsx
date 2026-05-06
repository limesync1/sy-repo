import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Mail, Phone, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

export interface CustomerContactRow {
  id?: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  is_billing?: boolean;
  notes?: string | null;
}

interface Props {
  /** business_customers.id — when null the section shows a hint */
  businessCustomerId: string | null;
}

const CustomerContactsSection = ({ businessCustomerId }: Props) => {
  const [rows, setRows] = useState<CustomerContactRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!businessCustomerId) { setRows([]); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customer_contacts")
        .select("*")
        .eq("business_customer_id", businessCustomerId)
        .order("created_at", { ascending: true });
      if (!error) setRows((data || []) as any);
      setLoading(false);
    })();
  }, [businessCustomerId]);

  if (!businessCustomerId) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
        Gem kunden først for at tilføje ekstra kontaktpersoner (fx bogholderi-mail).
      </div>
    );
  }

  const updateRow = (idx: number, patch: Partial<CustomerContactRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const saveRow = async (idx: number) => {
    const r = rows[idx];
    if (!r.name.trim()) { toast.error("Navn er påkrævet"); return; }
    setSavingIdx(idx);
    try {
      const payload = {
        business_customer_id: businessCustomerId,
        name: r.name.trim(),
        role: r.role?.trim() || null,
        email: r.email?.trim() || null,
        phone: r.phone?.trim() || null,
        is_primary: !!r.is_primary,
        is_billing: !!r.is_billing,
        notes: r.notes?.trim() || null,
      };
      if (r.id) {
        const { error } = await supabase.from("customer_contacts").update(payload).eq("id", r.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("customer_contacts").insert(payload).select().single();
        if (error) throw error;
        updateRow(idx, { id: data.id });
      }
      toast.success("Kontakt gemt");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke gemme");
    } finally {
      setSavingIdx(null);
    }
  };

  const removeRow = async (idx: number) => {
    const r = rows[idx];
    if (r.id) {
      const { error } = await supabase.from("customer_contacts").delete().eq("id", r.id);
      if (error) { toast.error(error.message); return; }
    }
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">Ekstra kontaktpersoner</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setRows(p => [...p, { name: "", is_billing: false }])}
        >
          <Plus className="h-3 w-3" /> Tilføj
        </Button>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Indlæser…</p>}

      {rows.length === 0 && !loading && (
        <p className="text-[11px] text-muted-foreground">
          Tilføj fx bogholderi-mail eller en fast kontaktperson på adressen.
        </p>
      )}

      {rows.map((r, idx) => (
        <div key={r.id || idx} className="rounded-md border bg-background p-2.5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Navn *</Label>
              <Input value={r.name} onChange={(e) => updateRow(idx, { name: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-[11px]">Rolle</Label>
              <Input
                value={r.role || ""}
                onChange={(e) => updateRow(idx, { role: e.target.value })}
                placeholder="Fx Bogholder, Driftsleder"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              <Input
                type="email"
                value={r.email || ""}
                onChange={(e) => updateRow(idx, { email: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-[11px] flex items-center gap-1"><Phone className="h-3 w-3" /> Telefon</Label>
              <Input
                value={r.phone || ""}
                onChange={(e) => updateRow(idx, { phone: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="flex items-center gap-2 text-[11px]">
              <Switch checked={!!r.is_billing} onCheckedChange={(v) => updateRow(idx, { is_billing: v })} />
              Faktura-modtager
            </label>
            <label className="flex items-center gap-2 text-[11px]">
              <Switch checked={!!r.is_primary} onCheckedChange={(v) => updateRow(idx, { is_primary: v })} />
              Primær kontakt
            </label>
            <div className="ml-auto flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => saveRow(idx)}
                disabled={savingIdx === idx}
              >
                {savingIdx === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : "Gem"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => removeRow(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CustomerContactsSection;