import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, CheckCircle2, XCircle, ExternalLink, Trash2, MapPin, Mail, BadgeCheck, Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportCsv } from "./lib/csv";

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;

const PlatformBusinessesTab = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "unverified" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-business-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_business_stats");
      if (error) throw error;
      const map = new Map<string, any>();
      (data || []).forEach((s: any) => map.set(s.business_id, s));
      return map;
    },
  });

  const updateBiz = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: any }) => {
      const { error } = await supabase.from("businesses").update(patch).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success(`Opdateret (${v.ids.length})`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBiz = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("businesses").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      qc.invalidateQueries({ queryKey: ["admin-business-stats"] });
      toast.success(`${ids.length} virksomheder slettet`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (businesses || []).filter((b) => {
      if (filter === "verified" && !b.is_verified) return false;
      if (filter === "unverified" && b.is_verified) return false;
      if (filter === "active" && !b.is_active) return false;
      if (filter === "inactive" && b.is_active) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        b.name?.toLowerCase().includes(s) ||
        b.city?.toLowerCase().includes(s) ||
        b.email?.toLowerCase().includes(s) ||
        b.category?.toLowerCase().includes(s)
      );
    });
  }, [businesses, q, filter]);

  const allSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));
  const someSelected = selected.size > 0;
  const toggleAll = () => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map((b) => b.id)));
  const toggleOne = (id: string, c: boolean) => {
    const n = new Set(selected); c ? n.add(id) : n.delete(id); setSelected(n);
  };

  const handleExport = () => {
    exportCsv("virksomheder", filtered.map((b: any) => {
      const s = stats?.get(b.id);
      return {
        navn: b.name, slug: b.slug, kategori: b.category || "",
        by: b.city || "", email: b.email || "", telefon: b.phone || "",
        verificeret: b.is_verified ? "ja" : "nej", aktiv: b.is_active ? "ja" : "nej",
        oprettet: new Date(b.created_at).toLocaleDateString("da-DK"),
        ordrer: s?.orders_count || 0, omsaetning: s?.total_revenue || 0,
      };
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg navn, by, kategori..." className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="verified">Verificeret</SelectItem>
            <SelectItem value="unverified">Ikke verificeret</SelectItem>
            <SelectItem value="active">Aktive</SelectItem>
            <SelectItem value="inactive">Inaktive</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} virksomheder</div>
      </div>

      {someSelected && (
        <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} valgt</span>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5">Handlinger <ChevronDown className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => updateBiz.mutate({ ids: Array.from(selected), patch: { is_verified: true } })}>Verificér</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateBiz.mutate({ ids: Array.from(selected), patch: { is_verified: false } })}>Fjern verifikation</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateBiz.mutate({ ids: Array.from(selected), patch: { is_active: true } })}>Aktivér</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateBiz.mutate({ ids: Array.from(selected), patch: { is_active: false } })}>Deaktivér</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 hover:text-red-700"
              onClick={() => { if (confirm(`Slet ${selected.size} virksomheder?`)) deleteBiz.mutate(Array.from(selected)); }}>
              <Trash2 className="h-3.5 w-3.5" /> Slet
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelected(new Set())}>Ryd</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-secondary/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen virksomheder fundet.</CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-4 py-2 text-xs font-medium text-muted-foreground">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span>Vælg alle ({filtered.length})</span>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((b) => {
              const s = stats?.get(b.id);
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-secondary/30">
                  <Checkbox checked={selected.has(b.id)} onCheckedChange={(c) => toggleOne(b.id, !!c)} />
                  <div className="relative shrink-0">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt="" className="h-10 w-10 rounded object-contain bg-secondary p-0.5" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
                        {b.name.charAt(0)}
                      </div>
                    )}
                    {b.is_verified && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground ring-2 ring-background shadow-sm">
                        <BadgeCheck className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                      {!b.is_active && (
                        <span className="inline-flex items-center rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive ring-1 ring-inset ring-destructive/20">
                          Inaktiv
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {b.category && <span>{b.category}</span>}
                      {b.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{b.city}</span>}
                      {(s?.owner_email || b.email) && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{s?.owner_email || b.email}</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Oprettet {new Date(b.created_at).toLocaleDateString("da-DK")} ·
                      {s ? ` ${Number(s.orders_count)} ordrer · ${fmtKr(Number(s.total_revenue || 0))}` : " Indlæser..."}
                      {s && Number(s.pending_count) > 0 && <span className="text-amber-700"> · {Number(s.pending_count)} afventer</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5"
                      onClick={() => updateBiz.mutate({ ids: [b.id], patch: { is_verified: !b.is_verified } })}>
                      {b.is_verified ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{b.is_verified ? "Fjern verif." : "Verificér"}</span>
                    </Button>
                    <Button size="sm" variant="outline" className="h-8"
                      onClick={() => updateBiz.mutate({ ids: [b.id], patch: { is_active: !b.is_active } })}>
                      {b.is_active ? "Deaktivér" : "Aktivér"}
                    </Button>
                    <Link to={`/b/${b.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Åbn"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label="Slet"
                      onClick={() => { if (confirm(`Slet "${b.name}"? Sletter også services. Kan ikke fortrydes.`)) deleteBiz.mutate([b.id]); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlatformBusinessesTab;
