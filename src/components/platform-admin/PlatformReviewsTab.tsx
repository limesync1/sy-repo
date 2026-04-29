import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, Trash2, Download, TrendingUp, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCsv } from "./lib/csv";
import { PageHeader, SearchInput, EmptyState, StatCard, SectionCard } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";

const PlatformReviewsTab = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, businesses(name, slug)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast.success("Anmeldelse slettet"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (data || []).filter((r: any) => {
      if (ratingFilter !== "all" && String(r.rating) !== ratingFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return r.reviewer_name?.toLowerCase().includes(s) ||
             r.comment?.toLowerCase().includes(s) ||
             r.businesses?.name?.toLowerCase().includes(s);
    });
  }, [data, q, ratingFilter]);

  const avgRating = filtered.length ? filtered.reduce((s: number, r: any) => s + (r.rating || 0), 0) / filtered.length : 0;

  // Aggregeret indsigt — fordeling pr. stjerner + nye anmeldelser sidste 7 dage.
  // Hjælper admin med at spotte mønstre uden at scrolle hele listen.
  const insights = useMemo(() => {
    const list = data || [];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    list.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) distribution[r.rating] += 1; });
    const total = list.length;
    const avg = total ? list.reduce((s: number, r: any) => s + (r.rating || 0), 0) / total : 0;
    const newWeek = list.filter((r: any) => new Date(r.created_at).getTime() > sevenDaysAgo).length;
    const lowCount = (distribution[1] || 0) + (distribution[2] || 0);
    return { distribution, total, avg, newWeek, lowCount };
  }, [data]);

  const handleExport = () => {
    exportCsv("anmeldelser", filtered.map((r: any) => ({
      navn: r.reviewer_name, virksomhed: r.businesses?.name || "",
      rating: r.rating, kommentar: r.comment || "",
      verificeret: r.is_verified ? "ja" : "nej",
      dato: new Date(r.created_at).toLocaleDateString("da-DK"),
    })));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Anmeldelser"
        description={<>{filtered.length} anmeldelser{avgRating ? <> · <span className="font-medium text-foreground">{avgRating.toFixed(1)} ★ snit</span></> : null}</>}
        action={
          <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="I alt" value={String(insights.total)} icon={<MessageSquare />} tone="blue" />
        <StatCard label="Gennemsnit" value={insights.avg ? `${insights.avg.toFixed(1)} ★` : "—"} icon={<Star />} tone="amber"
          hint={insights.avg >= 4.5 ? "Fremragende" : insights.avg >= 4 ? "Godt" : insights.avg >= 3 ? "OK" : insights.avg ? "Bør forbedres" : undefined} />
        <StatCard label="Sidste 7 dage" value={String(insights.newWeek)} icon={<TrendingUp />} tone="emerald" />
        <StatCard label="1–2 stjerner" value={String(insights.lowCount)} icon={<Star />} tone="neutral"
          hint={insights.lowCount > 0 ? "Kræver evt. opfølgning" : "Ingen klager"} />
      </div>

      {insights.total > 0 && (
        <SectionCard title="Fordeling" icon={<Star />} description="Hvordan stjerneratings fordeler sig samlet på platformen">
          <ul className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = insights.distribution[n] || 0;
              const pct = insights.total ? (count / insights.total) * 100 : 0;
              return (
                <li key={n} className="flex items-center gap-3 text-xs">
                  <span className="flex w-10 items-center gap-0.5 text-foreground">
                    {n} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-right tabular-nums text-muted-foreground">{count} · {pct.toFixed(0)}%</span>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg navn, kommentar, virksomhed..." />
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[180px] h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} stjerner</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-secondary/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Star />}
          title="Ingen anmeldelser fundet"
          description="Prøv andre søgeord eller skift rating-filter."
        />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((r: any) => (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{r.reviewer_name}</p>
                    <span className="text-xs text-muted-foreground">→ {r.businesses?.name || "—"}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("da-DK")}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-foreground/80">{r.comment}</p>}
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { if (confirm("Slet anmeldelse?")) del.mutate(r.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlatformReviewsTab;
