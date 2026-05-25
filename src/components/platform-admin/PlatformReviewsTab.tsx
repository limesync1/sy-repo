import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, Download, TrendingUp, MessageSquare, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCsv } from "./lib/csv";
import { PageHeader, SearchInput, EmptyState, StatCard } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { PaginationFooter } from "@/components/admin/shared/PaginationFooter";
import { useAdaptivePageSize } from "@/hooks/useAdaptivePageSize";
import { ReviewFilter, computeInsights } from "./reviews/shared";
import ReviewRow from "./reviews/ReviewRow";
import ReviewsInsights from "./reviews/ReviewsInsights";
import FlagDialog from "./reviews/FlagDialog";

const PlatformReviewsTab = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<ReviewFilter>("all");
  const [flagDialog, setFlagDialog] = useState<any | null>(null);
  const [flagReason, setFlagReason] = useState<string>("spam");
  const [flagNote, setFlagNote] = useState<string>("");

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

  const flag = useMutation({
    mutationFn: async ({ id, reason, note }: { id: string; reason: string; note: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("reviews").update({
        flagged_at: new Date().toISOString(),
        flagged_reason: reason,
        flagged_by: u.user?.id ?? null,
        admin_note: note || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Anmeldelse flagget");
      setFlagDialog(null); setFlagReason("spam"); setFlagNote("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unflag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("reviews").update({
        flagged_at: null, flagged_reason: null, flagged_by: null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast.success("Flag fjernet"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleHide = useMutation({
    mutationFn: async ({ id, hide }: { id: string; hide: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("reviews").update(
        hide
          ? { hidden_at: new Date().toISOString(), hidden_by: u.user?.id ?? null }
          : { hidden_at: null, hidden_by: null }
      ).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success(vars.hide ? "Skjult fra offentlige visninger" : "Synlig igen");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (data || []).filter((r: any) => {
      if (ratingFilter !== "all" && String(r.rating) !== ratingFilter) return false;
      if (stateFilter === "low" && (r.rating || 0) > 2) return false;
      if (stateFilter === "flagged" && !r.flagged_at) return false;
      if (stateFilter === "hidden" && !r.hidden_at) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return r.reviewer_name?.toLowerCase().includes(s) ||
             r.comment?.toLowerCase().includes(s) ||
             r.businesses?.name?.toLowerCase().includes(s);
    });
  }, [data, q, ratingFilter, stateFilter]);

  const avgRating = filtered.length ? filtered.reduce((s: number, r: any) => s + (r.rating || 0), 0) / filtered.length : 0;
  const insights = useMemo(() => computeInsights(data || []), [data]);

  const pageSize = useAdaptivePageSize();
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [q, ratingFilter, stateFilter]);
  const paged = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  const handleExport = () => {
    exportCsv("anmeldelser", filtered.map((r: any) => ({
      navn: r.reviewer_name, virksomhed: r.businesses?.name || "",
      rating: r.rating, kommentar: r.comment || "",
      verificeret: r.is_verified ? "ja" : "nej",
      flagget: r.flagged_at ? r.flagged_reason || "ja" : "",
      skjult: r.hidden_at ? "ja" : "",
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
        <StatCard label="Flagget / skjult" value={`${insights.flaggedCount} / ${insights.hiddenCount}`} icon={<Flag />}
          tone={insights.flaggedCount > 0 ? "amber" : "neutral"}
          hint={insights.lowCount > 0 ? `${insights.lowCount} har 1–2 ★` : "Ingen klager"} />
      </div>

      <ReviewsInsights insights={insights} />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg navn, kommentar, virksomhed..." />
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} stjerner</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {([
            { v: "all", l: "Alle" },
            { v: "low", l: `Lav rating (${insights.lowCount})` },
            { v: "flagged", l: `Flagget (${insights.flaggedCount})` },
            { v: "hidden", l: `Skjult (${insights.hiddenCount})` },
          ] as { v: ReviewFilter; l: string }[]).map((c) => (
            <Button key={c.v} size="sm" variant={stateFilter === c.v ? "default" : "outline"}
              className="h-9 text-xs" onClick={() => setStateFilter(c.v)}>
              {c.l}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Star />} title="Ingen anmeldelser fundet" description="Prøv andre søgeord eller skift rating-filter." />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {paged.map((r: any) => (
              <ReviewRow
                key={r.id} review={r}
                onFlag={setFlagDialog}
                onUnflag={(id) => unflag.mutate(id)}
                onToggleHide={(id, hide) => toggleHide.mutate({ id, hide })}
                onDelete={(id) => del.mutate(id)}
              />
            ))}
          </div>
        </Card>
      )}
      <PaginationFooter
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        label="anmeldelser"
      />

      <FlagDialog
        open={!!flagDialog} review={flagDialog}
        reason={flagReason} setReason={setFlagReason}
        note={flagNote} setNote={setFlagNote}
        onClose={() => setFlagDialog(null)}
        onSubmit={() => flag.mutate({ id: flagDialog.id, reason: flagReason, note: flagNote })}
        isPending={flag.isPending}
      />
    </div>
  );
};

export default PlatformReviewsTab;