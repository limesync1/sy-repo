// Tjeklister til kvalitetssikring: start fra en standardskabelon til
// branchen, og ret punkterne (ja/nej, måling med enhed eller fritekst).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { newItemId, suggestedTemplates, type QualityItem, type QualityItemType } from "@/lib/trade-modules";

type Template = { id: string; name: string; description: string | null; items: QualityItem[] };
const TYPE_LABEL: Record<QualityItemType, string> = { check: "OK / Fejl", number: "Måling", text: "Tekst" };

export function QualityTemplatesDialog({ open, onOpenChange, businessId, categories }: {
  open: boolean; onOpenChange: (o: boolean) => void; businessId: string; categories: string[];
}) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: templates = [] } = useQuery({
    queryKey: ["quality-templates", businessId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("quality_templates").select("id, name, description, items")
        .eq("business_id", businessId).eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Template[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["quality-templates", businessId] });
  const suggestions = suggestedTemplates(categories).filter((s) => !templates.some((t) => t.name === s.name));

  const save = async () => {
    if (!edit) return;
    const items = edit.items.filter((i) => i.label.trim());
    if (!edit.name.trim() || !items.length) { toast.error("Giv tjeklisten et navn og mindst ét punkt"); return; }
    setBusy(true);
    const payload = { name: edit.name.trim(), description: edit.description?.trim() || null, items: items as any, updated_at: new Date().toISOString() };
    const { error } = edit.id
      ? await supabase.from("quality_templates").update(payload).eq("id", edit.id)
      : await supabase.from("quality_templates").insert({ ...payload, business_id: businessId });
    setBusy(false);
    if (error) { toast.error("Kunne ikke gemme tjeklisten"); return; }
    refresh(); setEdit(null); toast.success("Tjekliste gemt");
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("quality_templates").update({ is_active: false }).eq("id", id);
    if (error) { toast.error("Kunne ikke slette"); return; }
    refresh(); setEdit(null);
  };
  const setItem = (id: string, patch: Partial<QualityItem>) =>
    setEdit((e) => e && { ...e, items: e.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setEdit(null); }}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-4 text-left">
          <DialogTitle>{edit ? (edit.id ? "Ret tjekliste" : "Ny tjekliste") : "Tjeklister til kvalitetssikring"}</DialogTitle>
          <DialogDescription>Udfyldes af medarbejderen på opgaven, med målinger og kundens underskrift.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {!edit ? (
            <>
              {templates.length > 0 && (
                <ul className="space-y-2">
                  {templates.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => setEdit(t)} className="flex min-h-11 w-full flex-col rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="text-sm font-medium text-foreground">{t.name}</span>
                        <span className="text-xs text-muted-foreground">{t.items.length} punkter{t.description ? ` · ${t.description}` : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Start fra en standard</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestions.map((s) => (
                      <Button key={s.key} variant="outline" className="h-auto min-h-11 justify-start whitespace-normal py-2 text-left"
                        onClick={() => setEdit({ id: "", name: s.name, description: s.description, items: s.items.map((i) => ({ ...i, id: newItemId() })) })}>
                        <span><span className="block font-medium">{s.name}</span><span className="block text-xs text-muted-foreground">{s.items.length} punkter</span></span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Button className="h-11 w-full gap-2" onClick={() => setEdit({ id: "", name: "", description: "", items: [{ id: newItemId(), label: "", type: "check", required: true }] })}>
                <Plus className="h-4 w-4" /> Lav egen tjekliste
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Navn på tjeklisten" className="h-11" aria-label="Navn på tjeklisten" />
              <Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Kort beskrivelse (valgfri)" className="h-11" aria-label="Beskrivelse" />
              <ul className="space-y-2">
                {edit.items.map((i) => (
                  <li key={i.id} className="space-y-2 rounded-lg border border-border bg-card p-2">
                    <div className="flex gap-2">
                      <Input value={i.label} onChange={(e) => setItem(i.id, { label: e.target.value })} placeholder="Punkt" className="h-11 flex-1" aria-label="Punkt" />
                      <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Fjern punkt"
                        onClick={() => setEdit({ ...edit, items: edit.items.filter((x) => x.id !== i.id) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={i.type} onValueChange={(v) => setItem(i.id, { type: v as QualityItemType })}>
                        <SelectTrigger className="h-11 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(TYPE_LABEL) as QualityItemType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                      </Select>
                      {i.type === "number" && <Input value={i.unit ?? ""} onChange={(e) => setItem(i.id, { unit: e.target.value })} placeholder="Enhed (fx bar)" className="h-11 w-32" aria-label="Enhed" />}
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <Checkbox checked={!!i.required} onCheckedChange={(v) => setItem(i.id, { required: !!v })} /> Skal udfyldes
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="h-11 w-full gap-2" onClick={() => setEdit({ ...edit, items: [...edit.items, { id: newItemId(), label: "", type: "check", required: true }] })}>
                <Plus className="h-4 w-4" /> Tilføj punkt
              </Button>
            </div>
          )}
        </div>
        {edit && (
          <div className="flex flex-wrap gap-2 border-t border-border p-3">
            <Button variant="outline" className="h-11 gap-1" onClick={() => setEdit(null)}><ArrowLeft className="h-4 w-4" /> Tilbage</Button>
            {edit.id && <Button variant="ghost" className="h-11 text-destructive" onClick={() => remove(edit.id)}>Slet</Button>}
            <Button className="ml-auto h-11" disabled={busy} onClick={save}>{busy ? "Gemmer…" : "Gem tjekliste"}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
