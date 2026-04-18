import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  in_progress: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
};

const PlatformOrdersTab = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, businesses(name, slug)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (data || []).filter((o: any) => {
    if (status && o.status !== status) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(s) ||
      o.customer_email?.toLowerCase().includes(s) ||
      o.businesses?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg kunde, email, virksomhed..." className="pl-9" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Alle statusser</option>
          <option value="pending">Afventer</option>
          <option value="confirmed">Bekræftet</option>
          <option value="in_progress">I gang</option>
          <option value="completed">Afsluttet</option>
          <option value="cancelled">Annulleret</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Indlæser ordrer...</p>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen ordrer fundet.</CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {o.customer_name} <span className="text-muted-foreground">·</span> <span className="text-muted-foreground">{o.businesses?.name || "—"}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.customer_email} · {new Date(o.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <Badge className={`${statusColors[o.status] || ""} text-xs font-medium border px-2 py-0.5`}>
                  {o.status}
                </Badge>
                <span className="text-sm font-bold text-foreground tabular-nums w-20 text-right">{Number(o.total_amount).toLocaleString("da-DK")} kr</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlatformOrdersTab;
