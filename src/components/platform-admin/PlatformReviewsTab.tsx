import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, Trash2, Download, TrendingUp, MessageSquare, Flag, EyeOff, Eye, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { exportCsv } from "./lib/csv";
import { PageHeader, SearchInput, EmptyState, StatCard, SectionCard } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";

type ReviewFilter = "all" | "low" | "flagged" | "hidden";

const FLAG_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "abusive", label: "Krænkende" },
  { value: "fake", label: "Fake/falsk" },
  { value: "off_topic", label: "Off-topic" },
  { value: "other", label: "Andet" },
];

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
    const flaggedCount = list.filter((r: any) => r.flagged_at).length;
    const hiddenCount = list.filter((r: any) => r.hidden_at).length;
    return { distribution, total, avg, newWeek, lowCount, flaggedCount, hiddenCount };
  }, [data]);

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
            <Button
              key={c.v}
              size="sm"
              variant={stateFilter === c.v ? "default" : "outline"}
              className="h-9 text-xs"
              onClick={() => setStateFilter(c.v)}
            >
              {c.l}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={5} />
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
              <div key={r.id} className={cn(
                "flex items-start gap-3 px-4 py-3 hover:bg-secondary/30",
                r.flagged_at && "bg-amber-500/5",
                r.hidden_at && "opacity-60",
              )}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{r.reviewer_name}</p>
                    <span className="text-xs text-muted-foreground">→ {r.businesses?.name || "—"}</span>
                    {r.flagged_at && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Flag className="h-2.5 w-2.5" /> {r.flagged_reason || "flagget"}
                      </span>
                    )}
                    {r.hidden_at && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        <EyeOff className="h-2.5 w-2.5" /> skjult
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="ml-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("da-DK")}</span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-foreground/80">{r.comment}</p>}
                  {r.admin_note && (
                    <p className="mt-1 text-xs text-muted-foreground italic flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> Admin-note: {r.admin_note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {r.flagged_at ? (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Fjern flag"
                      onClick={() => unflag.mutate(r.id)}>
                      <Flag className="h-3.5 w-3.5 text-amber-600" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Flag som problem"
                      onClick={() => setFlagDialog(r)}>
                      <Flag className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                    title={r.hidden_at ? "Vis igen" : "Skjul fra offentlig"}
                    onClick={() => toggleHide.mutate({ id: r.id, hide: !r.hidden_at })}>
                    {r.hidden_at ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => { if (confirm("Slet anmeldelse?")) del.mutate(r.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!flagDialog} onOpenChange={(o) => !o && setFlagDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag anmeldelse</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
              <p className="font-medium text-foreground">{flagDialog?.reviewer_name} → {flagDialog?.businesses?.name}</p>
              {flagDialog?.comment && <p className="mt-1 text-muted-foreground italic">"{flagDialog.comment}"</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Årsag</label>
              <Select value={flagReason} onValueChange={setFlagReason}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FLAG_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Intern note (valgfri)</label>
              <Textarea value={flagNote} onChange={(e) => setFlagNote(e.target.value)} rows={3} className="mt-1 text-sm" placeholder="Kontekst for andre admins..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialog(null)}>Annullér</Button>
            <Button onClick={() => flag.mutate({ id: flagDialog.id, reason: flagReason, note: flagNote })} disabled={flag.isPending}>
              {flag.isPending ? "Flagger..." : "Flag anmeldelse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformReviewsTab;
