// Audit-log viewer for én rute. Læser fra `route_audit_log` og viser
// hvem der gjorde hvad hvornår — så planlæggeren kan se hvorfor en rute
// pludselig ser anderledes ud.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { da } from "date-fns/locale";
import {
  Loader2,
  History,
  User,
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Sparkles,
  MapPinPlus,
  MapPinMinus,
  ListOrdered,
  Activity,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import EmptyState from "./EmptyState";

type ActionMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string; // tailwind classes for badge bg/text
  ring: string; // dot ring color
};

const ACTION_META: Record<string, ActionMeta> = {
  create: { label: "Oprettet", icon: Plus, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", ring: "bg-emerald-500" },
  update: { label: "Opdateret", icon: Pencil, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300", ring: "bg-sky-500" },
  delete: { label: "Slettet", icon: Trash2, tone: "bg-destructive/15 text-destructive", ring: "bg-destructive" },
  move: { label: "Flyttet", icon: ArrowRightLeft, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", ring: "bg-amber-500" },
  optimize: { label: "Optimeret", icon: Sparkles, tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300", ring: "bg-violet-500" },
  add_stop: { label: "Stop tilføjet", icon: MapPinPlus, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", ring: "bg-emerald-500" },
  remove_stop: { label: "Stop fjernet", icon: MapPinMinus, tone: "bg-destructive/15 text-destructive", ring: "bg-destructive" },
  reorder: { label: "Rækkefølge ændret", icon: ListOrdered, tone: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300", ring: "bg-indigo-500" },
};

const FALLBACK_META: ActionMeta = {
  label: "Hændelse",
  icon: Activity,
  tone: "bg-muted text-muted-foreground",
  ring: "bg-muted-foreground",
};

function dayLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "I dag";
  if (isYesterday(d)) return "I går";
  return format(d, "EEEE d. MMMM", { locale: da });
}

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

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const row of data ?? []) {
      const key = format(parseISO(row.created_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="space-y-1.5 px-5 pt-5 pb-4 border-b border-border/70 bg-gradient-to-br from-primary/5 via-card to-card">
          <DialogTitle className="flex items-center gap-2.5 text-base tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
              <History className="h-4 w-4" />
            </span>
            <span className="font-bold">Historik</span>
            {routeName && (
              <span className="text-muted-foreground font-normal truncate">— {routeName}</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            De seneste {data?.length ?? 100} ændringer på denne rute.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto px-5 py-4 bg-secondary/[0.16]">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Henter…
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState icon={<History className="h-5 w-5" />} title="Ingen historik endnu" compact />
          ) : (
            <div className="space-y-5">
              {grouped.map(([day, rows]) => (
                <section key={day}>
                  <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground capitalize">
                    {dayLabel(rows[0].created_at)}
                  </h3>
                  <ol className="relative ml-3 border-l-2 border-border/70 space-y-2 py-1">
                    {rows.map((row: any) => {
                      const meta = ACTION_META[row.action] ?? FALLBACK_META;
                      const Icon = meta.icon;
                      return (
                        <li key={row.id} className="pl-4 relative">
                          <span className={`absolute -left-[7px] top-3 h-3 w-3 rounded-full border-2 border-background shadow-sm ${meta.ring}`} />
                          <div className="rounded-lg border border-border/70 bg-card p-2.5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.tone}`}>
                                <Icon className="h-3 w-3" />
                                {meta.label}
                              </span>
                              <time className="tabular-nums text-[11px] text-muted-foreground font-medium shrink-0">
                                {format(parseISO(row.created_at), "HH:mm", { locale: da })}
                              </time>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {row.actor_id ? row.actor_id.slice(0, 8) : "system"}
                              </span>
                              {row.scope && (
                                <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground/70 border border-border/60">
                                  {row.scope}
                                </span>
                              )}
                              {row.affected_count > 0 && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {row.affected_count} påvirket
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}