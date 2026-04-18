import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Trash2, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCsv } from "./lib/csv";

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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg navn, kommentar, virksomhed..." className="pl-9" />
        </div>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} stjerner</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} anmeldelser · {avgRating ? `${avgRating.toFixed(1)} ★ snit` : "—"}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-secondary/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen anmeldelser fundet.</CardContent>
        </Card>
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
