import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PlatformReviewsTab = () => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, businesses(name, slug)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data || [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Anmeldelse slettet");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser anmeldelser...</p>;
  if (!data || data.length === 0) {
    return (
      <Card className="rounded-xl border-dashed">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen anmeldelser endnu.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-border shadow-sm overflow-hidden">
      <div className="divide-y divide-border">
        {data.map((r: any) => (
          <div key={r.id} className="flex items-start gap-3 px-4 py-3">
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
  );
};

export default PlatformReviewsTab;
