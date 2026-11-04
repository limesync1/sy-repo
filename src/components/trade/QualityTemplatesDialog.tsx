// Tjeklister til kvalitetssikring: start fra en standardskabelon til
// branchen, og ret punkterne (ja/nej, måling med enhed eller fritekst).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, ClipboardCheck, Copy, ListChecks, Plus, Sparkles, Trash2 } from "lucide-react";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "@/components/route-planner/SheetSection";
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
  const refresh = () => { qc.invalidateQueries({ queryKey: ["quality-templates", businessId] }); qc.invalidateQueries({ queryKey: ["trade-counts", businessId] }); };
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
  const move = (idx: number, dir: -1 | 1) =>
    setEdit((e) => {
      if (!e) return e;
      const items = [...e.items]; const j = idx + dir;
      if (j < 0 || j >= items.length) return e;
      [items[idx], items[j]] = [items[j], items[idx]];
      return { ...e, items };
    });
  const setItem = (id: string, patch: Partial<QualityItem>) =>
    setEdit((e) => e && { ...e, items: e.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setEdit(null); }}>
      <DialogContent className="modal-large planner-overlay flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-md p-0 sm:max-h-[92vh]" onOpenAutoFocus={(e) => { if (window.matchMedia("(pointer: coarse)").matches) e.preventDefault(); }}>
        <DialogHeader className="planner-overlay-header shrink-0 space-y-0 border-b px-4 py-2.5 pr-12 text-left sm:px-5">
          <SheetHeaderBlock
            icon={<ClipboardCheck className="h-5 w-5" />}
            title={<DialogTitle className="text-base">{edit ? (edit.id ? "Ret tjekliste" : "Ny tjekliste") : "Tjeklister til kvalitetssikring"}</DialogTitle>}
            description={<DialogDescription className="text-xs leading-snug">Medarbejderen udfylder tjeklisten på opgaven, med målinger og kundens underskrift.</DialogDescription>}
          />
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-secondary/20 p-3 sm:p-4">
          {!edit ? (
            <>
              <Section icon={<ListChecks />} tone="primary" title="Jeres tjeklister" hint={`${templates.length} i alt`}>
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">I har ingen tjeklister endnu. Start fra en standard nedenfor, eller lav jeres egen.</p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
                    {templates.map((t) => (
                      <li key={t.id} className="flex items-center gap-1">
                        <button type="button" onClick={() => setEdit(t)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-medium text-foreground">{t.name}</span>
                            <span className="block text-xs text-muted-foreground">{t.items.length} punkter · {t.items.filter((i) => i.required).length} skal udfyldes{t.description ? ` · ${t.description}` : ""}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        </button>
                        <Button variant="ghost" size="icon" className="mr-1 h-11 w-11 shrink-0" aria-label={`Kopiér ${t.name}`}
                          onClick={() => setEdit({ id: "", name: `${t.name} (kopi)`, description: t.description, items: t.items.map((i) => ({ ...i, id: newItemId() })) })}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              {suggestions.length > 0 && (
                <Section icon={<Sparkles />} tone="sky" title="Start fra en standard" hint="Til jeres brancher">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestions.map((s) => (
                      <button key={s.key} type="button"
                        onClick={() => setEdit({ id: "", name: s.name, description: s.description, items: s.items.map((i) => ({ ...i, id: newItemId() })) })}
                        className="flex min-h-14 items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-foreground">{s.name}</span><span className="block text-xs text-muted-foreground">{s.items.length} punkter</span></span>
                        <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    ))}
                  </div>
                </Section>
              )}
            </>
          ) : (
            <>
              <Section icon={<ClipboardCheck />} tone="primary" title="Om tjeklisten">
                <Field label="Navn" required><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Fx Trykprøvning af vandinstallation" className="h-11" /></Field>
                <Field label="Kort beskrivelse" optional><Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Hvornår bruges den?" className="h-11" /></Field>
              </Section>
              <Section icon={<ListChecks />} title="Punkter" hint={`${edit.items.length} punkter`}>
                <ol className="space-y-2">
                  {edit.items.map((i, idx) => (
                    <li key={i.id} className="space-y-2 rounded-md border border-border bg-card p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground" aria-hidden>{idx + 1}</span>
                        <Input value={i.label} onChange={(e) => setItem(i.id, { label: e.target.value })} placeholder="Hvad skal tjekkes?" className="h-11 flex-1" aria-label={`Punkt ${idx + 1}`} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:pl-9">
                        <Select value={i.type} onValueChange={(v) => setItem(i.id, { type: v as QualityItemType })}>
                          <SelectTrigger className="h-11 w-36" aria-label="Type"><SelectValue /></SelectTrigger>
                          <SelectContent>{(Object.keys(TYPE_LABEL) as QualityItemType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                        </Select>
                        {i.type === "number" && <Input value={i.unit ?? ""} onChange={(e) => setItem(i.id, { unit: e.target.value })} placeholder="Enhed (fx bar)" className="h-11 w-32" aria-label="Enhed" />}
                        <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
                          <Checkbox checked={!!i.required} onCheckedChange={(v) => setItem(i.id, { required: !!v })} /> Skal udfyldes
                        </label>
                        <div className="ml-auto flex">
                          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Flyt op" disabled={idx === 0} onClick={() => move(idx, -1)}><ArrowUp className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Flyt ned" disabled={idx === edit.items.length - 1} onClick={() => move(idx, 1)}><ArrowDown className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-11 w-11 text-destructive" aria-label="Fjern punkt"
                            onClick={() => setEdit({ ...edit, items: edit.items.filter((x) => x.id !== i.id) })}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <Button variant="outline" className="h-11 w-full gap-2" onClick={() => setEdit({ ...edit, items: [...edit.items, { id: newItemId(), label: "", type: "check", required: true }] })}>
                  <Plus className="h-4 w-4" /> Tilføj punkt
                </Button>
              </Section>
            </>
          )}
        </div>
        <SheetFooterBar>
          {edit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="h-11 gap-1" onClick={() => setEdit(null)}><ArrowLeft className="h-4 w-4" /> Tilbage</Button>
              {edit.id && <Button variant="ghost" className="h-11 text-destructive" onClick={() => remove(edit.id)}>Slet</Button>}
              <Button className="ml-auto h-11" disabled={busy} onClick={save}>{busy ? "Gemmer…" : "Gem tjekliste"}</Button>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>Luk</Button>
              <Button className="h-11 gap-2" onClick={() => setEdit({ id: "", name: "", description: "", items: [{ id: newItemId(), label: "", type: "check", required: true }] })}>
                <Plus className="h-4 w-4" /> Lav egen tjekliste
              </Button>
            </div>
          )}
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
}
