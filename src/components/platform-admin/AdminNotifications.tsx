// AdminNotifications — klokke i admin-topbaren med live notifikationsfeed.
// Feed beregnes pr. kald via admin_notification_feed() RPC, så vi slipper
// for at vedligeholde en separat notifikations-tabel for hver hændelsestype.
// "Nye siden sidst" beregnes ud fra admin_notification_state.last_seen_at.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Building2, Clock, AlertTriangle, MessageCircle, MailX, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Notif = {
  id: string;
  category: string;
  severity: "info" | "warn" | "danger";
  title: string;
  subtitle: string;
  link_tab: string | null;
  link_id: string | null;
  created_at: string;
};

const CATEGORY_META: Record<string, { icon: any; label: string }> = {
  new_business: { icon: Building2, label: "Ny virksomhed" },
  trial_expiring: { icon: Clock, label: "Trial udløber" },
  order_overdue: { icon: AlertTriangle, label: "Forfalden ordre" },
  chat_unread: { icon: MessageCircle, label: "Chat-besked" },
  mail_failed: { icon: MailX, label: "Fejlet mail" },
};

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-foreground/60",
  warn: "bg-amber-500",
  danger: "bg-destructive",
};

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "nu";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}t`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

type Props = {
  onSelectTab: (tab: string) => void;
};

export default function AdminNotifications({ onSelectTab }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const { data: feed } = useQuery({
    queryKey: ["admin-notif-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_notification_feed" as any, { p_limit: 40 });
      if (error) throw error;
      return (data || []) as Notif[];
    },
    refetchInterval: 60_000,
  });

  const { data: lastSeen } = useQuery({
    queryKey: ["admin-notif-last-seen"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_notifications_last_seen" as any);
      if (error) throw error;
      return (data as string | null) || null;
    },
  });

  const filtered = useMemo(() => {
    if (!feed) return [] as Notif[];
    if (filter === "all") return feed;
    return feed.filter((n) => n.category === filter);
  }, [feed, filter]);

  const unreadCount = useMemo(() => {
    if (!feed) return 0;
    if (!lastSeen) return Math.min(feed.length, 99);
    const t = new Date(lastSeen).getTime();
    return feed.filter((n) => new Date(n.created_at).getTime() > t).length;
  }, [feed, lastSeen]);

  const markAllSeen = async () => {
    const { data, error } = await supabase.rpc("admin_mark_notifications_seen" as any);
    if (!error) {
      qc.setQueryData(["admin-notif-last-seen"], data);
    }
  };

  const onSelect = (n: Notif) => {
    if (n.link_tab) {
      onSelectTab(n.link_tab);
      setOpen(false);
    }
  };

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    (feed || []).forEach((n) => (counts[n.category] = (counts[n.category] || 0) + 1));
    return counts;
  }, [feed]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllSeen(); }}>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notifikationer${unreadCount ? ` (${unreadCount} nye)` : ""}`}
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[360px] p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifikationer</p>
            <p className="text-[11px] text-muted-foreground">
              {feed?.length || 0} hændelser
              {unreadCount > 0 && ` · ${unreadCount} nye`}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllSeen}>
            <Check className="h-3 w-3 mr-1" />
            Markér læst
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-secondary/30 px-2 py-1.5 scrollbar-hide">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={feed?.length || 0}>Alle</FilterChip>
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const n = categories[key] || 0;
            if (n === 0) return null;
            return (
              <FilterChip key={key} active={filter === key} onClick={() => setFilter(key)} count={n}>
                {meta.label}
              </FilterChip>
            );
          })}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Ingen notifikationer{filter !== "all" ? " i denne kategori" : ""}.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((n) => {
                const meta = CATEGORY_META[n.category] || { icon: Bell, label: n.category };
                const Icon = meta.icon;
                const isNew = !lastSeen || new Date(n.created_at).getTime() > new Date(lastSeen).getTime();
                const clickable = !!n.link_tab;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(n)}
                      disabled={!clickable}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
                        clickable ? "hover:bg-secondary/60 cursor-pointer" : "cursor-default",
                      )}
                    >
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                        <Icon className="h-4 w-4" />
                        <span className={cn("absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-popover", SEVERITY_DOT[n.severity] || SEVERITY_DOT.info)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                          {isNew && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="ny" />}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{n.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{timeAgo(n.created_at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterChip({
  active, onClick, count, children,
}: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
    >
      {children}
      <span className={cn("rounded-full px-1 text-[10px]", active ? "bg-background/20" : "bg-secondary")}>{count}</span>
    </button>
  );
}