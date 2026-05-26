// Audit-log viewer for én rute. Læser fra `route_audit_log` og viser
// hvem der gjorde hvad hvornår — så planlæggeren kan se hvorfor en rute
// pludselig ser anderledes ud.
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Loader2, History, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import EmptyState from "./EmptyState";

const ACTION_LABEL: Record<string, string> = {
  create: "Oprettet",
  update: "Opdateret",
  delete: "Slettet",
  move: "Flyttet",
  optimize: "Optimeret",
  add_stop: "Stop tilføjet",
  remove_stop: "Stop fjernet",
  reorder: "Rækkefølge ændret",
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  routeId: string | null;
  routeName?: string;
};

export default function RouteHistoryDialog({ open, onOpenChange, routeId, routeName }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["route-audit", routeId],
    enabled: open && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_audit_log")
        .select("id, action, scope, affected_count, created_at, actor_id")
        .eq("route_id", routeId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Historik {routeName && <span className="text-muted-foreground font-normal">— {routeName}</span>}
          </DialogTitle>
          <DialogDescription>De seneste 100 ændringer på denne rute.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto -mx-2 px-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Henter…
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState icon={<History className="h-5 w-5" />} title="Ingen historik endnu" compact />
          ) : (
            <ol className="space-y-2">
              {data!.map((row: any) => (
                <li key={row.id} className="rounded-md border border-border bg-card p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{ACTION_LABEL[row.action] ?? row.action}</span>
                    <time className="tabular-nums text-muted-foreground">
                      {format(parseISO(row.created_at), "d. MMM HH:mm", { locale: da })}
                    </time>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {row.actor_id ? row.actor_id.slice(0, 8) : "system"}</span>
                    {row.scope && <span>· {row.scope}</span>}
                    {row.affected_count > 0 && <span>· {row.affected_count} påvirket</span>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}