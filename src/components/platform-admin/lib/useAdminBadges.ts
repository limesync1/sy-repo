// useAdminBadges — beregner ulæste/aktive antal pr. admin-fane ud fra
// admin_notification_feed (samme kilde som klokke-popoveren). Bruges til
// at vise små badges/dots i sidebar og bottom-nav, så drift-uregelmæssigheder
// (ulæste chats, forfaldne ordrer, fejlede mails) er synlige uden at åbne
// notifikations-popoveren.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Notif = {
  id: string;
  category: string;
  severity: "info" | "warn" | "danger";
  link_tab: string | null;
  created_at: string;
};

export type AdminBadgeMap = Record<string, { count: number; warn: boolean }>;

// Map fra notifikations-kategori til admin-fane.
const CATEGORY_TO_TAB: Record<string, string> = {
  chat_unread: "livechat",
  order_overdue: "orders",
  mail_failed: "mails",
  new_business: "businesses",
  trial_expiring: "subscriptions",
};

export function useAdminBadges(): AdminBadgeMap {
  const { data } = useQuery({
    queryKey: ["admin-notif-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_notification_feed" as any, { p_limit: 40 });
      if (error) throw error;
      return (data || []) as Notif[];
    },
    refetchInterval: 60_000,
  });

  const map: AdminBadgeMap = {};
  (data || []).forEach((n) => {
    const tab = CATEGORY_TO_TAB[n.category];
    if (!tab) return;
    if (!map[tab]) map[tab] = { count: 0, warn: false };
    map[tab].count += 1;
    if (n.severity === "danger" || n.severity === "warn") map[tab].warn = true;
  });
  return map;
}