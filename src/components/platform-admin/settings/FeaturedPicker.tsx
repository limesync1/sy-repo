import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { FieldLabel } from "@/components/admin/shared/AdminUI";

/* FeaturedPicker — søger blandt aktive virksomheder og lader admin vælge op
   til 3 stk. Rækkefølgen i listen er den rækkefølge de vises på forsiden. */
export default function FeaturedPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);

  useEffect(() => {
    if (!value.length) { setSelected([]); return; }
    supabase.from("businesses").select("id, name, slug, logo_url, city, is_verified").in("id", value).then(({ data }) => {
      const ordered = value.map((id) => (data ?? []).find((b) => b.id === id)).filter(Boolean) as any[];
      setSelected(ordered);
    });
  }, [value]);

  useEffect(() => {
    const t = setTimeout(async () => {
      let req = supabase.from("businesses").select("id, name, slug, logo_url, city, is_verified").eq("is_active", true).limit(20);
      if (q.trim()) req = req.ilike("name", `%${q.trim()}%`);
      else req = req.order("is_verified", { ascending: false }).order("created_at", { ascending: false });
      const { data } = await req;
      setOptions(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const add = (id: string) => {
    if (value.includes(id)) return;
    if (value.length >= 3) { toast.error("Du kan højst vælge 3 virksomheder"); return; }
    onChange([...value, id]);
  };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));
  const move = (id: string, dir: -1 | 1) => {
    const i = value.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Valgte ({value.length}/3)</FieldLabel>
        {selected.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card px-3 py-3 text-xs text-muted-foreground">
            Ingen valgt — forsiden viser automatisk de senest oprettede verificerede virksomheder.
          </p>
        ) : (
          <ul className="space-y-2">
            {selected.map((b, i) => (
              <li key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <span className="flex flex-col">
                  <button type="button" onClick={() => move(b.id, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                  <button type="button" onClick={() => move(b.id, 1)} disabled={i === selected.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                  {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-contain p-0.5" /> : <span className="text-[10px] font-bold">{b.name?.[0]}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{b.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{b.city || "—"}</span>
                </span>
                <button type="button" onClick={() => remove(b.id)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Fjern">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <FieldLabel>Tilføj virksomhed</FieldLabel>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg efter navn…" className="h-10 pl-9" />
        </div>
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-card p-1">
          {options.length === 0 && <li className="px-2 py-3 text-xs text-muted-foreground">Ingen resultater.</li>}
          {options.map((b) => {
            const picked = value.includes(b.id);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => add(b.id)}
                  disabled={picked}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-secondary disabled:opacity-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                    {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-contain p-0.5" /> : <span className="text-[10px] font-bold">{b.name?.[0]}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{b.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{b.city || "—"}{b.is_verified ? " · Verificeret" : ""}</span>
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">{picked ? "Valgt" : "Tilføj"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}