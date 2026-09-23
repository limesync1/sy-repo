// Audit-log viewer for én rute. Læser via RPC'en `route_audit_feed`, der
// beriger hændelserne med navn på personen bag handlingen — og for
// virksomhedens ejer også e-mail, IP-adresse og enhed.
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
  Activity,
  AlertTriangle,
  Monitor,
  Globe,
  ArrowRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import EmptyState from "./EmptyState";
import { SheetHeaderBlock } from "./SheetSection";
import {
  actionLabel,
  actorLabel,
  describeDevice,
  diffChanges,
  ROLE_LABEL,
  SCOPE_LABEL,
  type AuditRow,
  type AuditTone,
} from "@/lib/route-audit-describe";

const TONE: Record<AuditTone, { icon: React.ComponentType<{ className?: string }>; badge: string; ring: string }> = {
  create: { icon: Plus, badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", ring: "bg-emerald-500" },
  update: { icon: Pencil, badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300", ring: "bg-sky-500" },
  delete: { icon: Trash2, badge: "bg-destructive/15 text-destructive", ring: "bg-destructive" },
  move: { icon: ArrowRightLeft, badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300", ring: "bg-amber-500" },
  optimize: { icon: Sparkles, badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300", ring: "bg-violet-500" },
  warn: { icon: AlertTriangle, badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300", ring: "bg-orange-500" },
  neutral: { icon: Activity, badge: "bg-muted text-muted-foreground", ring: "bg-muted-foreground" },
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
      const { data, error } = await (supabase as any).rpc("route_audit_feed", {
        p_route_id: routeId,
        p_limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, AuditRow[]>();
    for (const row of data ?? []) {
      const key = format(parseISO(row.created_at), "yyyy-MM-dd");
      const existing = map.get(key);
      if (existing) existing.push(row);
      else map.set(key, [row]);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="planner-overlay w-[calc(100vw-1rem)] max-w-xl max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-md p-0 overflow-hidden gap-0">
        <DialogHeader className="planner-overlay-header px-4 sm:px-5 py-3 pr-12 border-b shrink-0 space-y-0 text-left">
          <SheetHeaderBlock
            icon={<History className="h-4 w-4" />}
            title={
              <DialogTitle className="text-base">
                Historik{routeName ? <span className="text-muted-foreground font-normal"> — {routeName}</span> : null}
              </DialogTitle>
            }
            description={
               <DialogDescription className="text-xs leading-snug">
                 Hvem gjorde hvad og hvorfra. Tekniske spor er kun synlige for virksomhedens ejer.
              </DialogDescription>
            }
          />
        </DialogHeader>
        <div className="planner-overlay-body max-h-[65vh] overflow-auto px-4 sm:px-5 py-4 bg-secondary/25">
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
                    {rows.map((row) => {
                      const { label, tone } = actionLabel(row.action);
                      const meta = TONE[tone];
                      const Icon = meta.icon;
                      const changes = diffChanges(row.before_data, row.after_data);
                      const device = describeDevice(row.user_agent);
                      const role = row.actor_role ? ROLE_LABEL[row.actor_role] : null;
                      return (
                        <li key={row.id} className="pl-4 relative">
                          <span className={`absolute -left-[7px] top-3 h-3 w-3 rounded-full border-2 border-background shadow-sm ${meta.ring}`} />
                            <div className="rounded-md border border-border bg-card p-3 shadow-[0_1px_2px_hsl(var(--foreground)/0.05)] transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-sm">
                             <div className="flex items-start gap-2">
                              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                                <Icon className="h-3 w-3" />
                                {label}
                              </span>
                            </div>

                            {row.summary && (
                              <p className="mt-1.5 text-[12px] leading-snug text-foreground/90">{row.summary}</p>
                            )}

                            {changes.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5">
                                {changes.map((c, i) => (
                                  <li key={i} className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                                    <span className="font-medium text-foreground/80">{c.field}:</span>
                                    {c.from !== undefined && <span className="line-through opacity-70">{c.from}</span>}
                                    {c.from !== undefined && c.to !== undefined && <ArrowRight className="h-3 w-3 opacity-60" />}
                                    {c.to !== undefined && <span className="text-foreground/80">{c.to}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="font-medium text-foreground/80">{actorLabel(row)}</span>
                                {role && <span className="opacity-70">({role})</span>}
                              </span>
                              {row.actor_email && <span className="opacity-80">{row.actor_email}</span>}
                              {row.scope && (
                                <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground/70 border border-border/60">
                                  {SCOPE_LABEL[row.scope] ?? row.scope}
                                </span>
                              )}
                              {row.affected_count > 0 && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {row.affected_count} påvirket
                                </span>
                              )}
                            </div>

                            {(device || row.ip_address) && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-1.5 text-[10.5px] text-muted-foreground">
                                {device && (
                                  <span className="inline-flex items-center gap-1">
                                    <Monitor className="h-3 w-3" /> {device}
                                  </span>
                                )}
                                {row.ip_address && (
                                  <span className="inline-flex items-center gap-1 tabular-nums">
                                    <Globe className="h-3 w-3" /> {row.ip_address}
                                  </span>
                                )}
                              </div>
                            )}
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
