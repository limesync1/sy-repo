import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle, ExternalLink, Trash2, MapPin, Mail, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;

const PlatformBusinessesTab = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: businesses, isLoading } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });
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
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("businesses").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("businesses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      qc.invalidateQueries({ queryKey: ["admin-business-stats"] });
      toast.success("Slettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (businesses || []).filter((b) => {
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        b.name?.toLowerCase().includes(s) ||
        b.city?.toLowerCase().includes(s) ||
        b.email?.toLowerCase().includes(s) ||
        b.category?.toLowerCase().includes(s)
      );
    });
  }, [businesses, q]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg navn, by, kategori, email..." className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Indlæser virksomheder...</p>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen virksomheder fundet.</CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((b) => {
              const s = stats?.get(b.id);
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-secondary/30">
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
                      {b.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent ring-1 ring-inset ring-accent/20">
                          <BadgeCheck className="h-2.5 w-2.5" strokeWidth={3} />
                          Verificeret
                        </span>
                      )}
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
                      {s ? ` ${Number(s.orders_count)} ordrer · ${fmtKr(Number(s.total_revenue || 0))}` : " Indlæser stats..."}
                      {s && Number(s.pending_count) > 0 && <span className="text-amber-700"> · {Number(s.pending_count)} afventer</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5"
                      onClick={() => updateBiz.mutate({ id: b.id, patch: { is_verified: !b.is_verified } })}>
                      {b.is_verified ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{b.is_verified ? "Fjern verif." : "Verificér"}</span>
                    </Button>
                    <Button size="sm" variant="outline" className="h-8"
                      onClick={() => updateBiz.mutate({ id: b.id, patch: { is_active: !b.is_active } })}>
                      {b.is_active ? "Deaktivér" : "Aktivér"}
                    </Button>
                    <Link to={`/b/${b.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Åbn side"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label="Slet"
                      onClick={() => {
                        if (confirm(`Slet virksomhed "${b.name}"? Dette sletter også alle services. Kan ikke fortrydes.`)) deleteBiz.mutate(b.id);
                      }}>
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
