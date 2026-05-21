import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const fmt = (n: number) => n.toLocaleString("da-DK");
export const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;

export type OverviewSnapshot = {
  range: { from: string; to: string; days: number; prev_from: string; prev_to: string };
  kpis: { gmv: number; gmv_completed: number; orders: number; avg_order: number };
  prev: { gmv: number; orders: number; users: number; businesses: number };
  period_counts: { new_users: number; new_businesses: number };
  totals: { businesses_total: number; profiles_total: number; reviews_total: number; reviews_avg: number; mrr: number; active_subs: number };
  series: { date: string; orders: number; gmv: number; users: number; businesses: number }[];
  dow: { dow: number; count: number }[];
  top_categories: { label: string; value: number }[];
  top_cities: { label: string; value: number }[];
  top_businesses: { id: string; name: string; revenue: number }[];
  top_customers: { name: string; spend: number }[];
  repeat: { unique_customers: number; repeat_customers: number };
};

export type OperationalPulse = {
  ordersToday: number;
  gmvToday: number;
  signupsToday: number;
  openChats: number;
  trialExpiring: number;
  pastDue: number;
  unansweredChats: number;
  lowRatedReviews: number;
  unverifiedBiz: number;
};

/**
 * Henter komplet snapshot fra serveren — erstatter de tidligere 5 client-side tabel-hent
 * og skalerer forbi Supabase's 1000-rækkers loft.
 */
export const useOverviewSnapshot = (from: Date, to: Date) =>
  useQuery({
    queryKey: ["admin-overview-snapshot", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview_snapshot", {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });
      if (error) throw error;
      return data as unknown as OverviewSnapshot;
    },
    staleTime: 30_000,
  });

/**
 * Live operationelle tællinger — refetch hvert 30. sek for "puls"-fornemmelse.
 * Holdes adskilt fra det tunge dataset så vi ikke trækker alt hver halve minut.
 */
export const useOperationalPulse = () =>
  useQuery({
    queryKey: ["admin-operational-pulse"],
    refetchInterval: 30_000,
    queryFn: async (): Promise<OperationalPulse> => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const threeDays = new Date(Date.now() + 3 * 86400000).toISOString();
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();

      const [todayOrders, todaySignups, openChats, trialExpiring, pastDue,
             unansweredChats, lowRatedReviews, unverifiedBiz] = await Promise.all([
        supabase.from("orders")
          .select("id, total_amount", { count: "exact" })
          .gte("created_at", today.toISOString()),
        supabase.from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", today.toISOString()),
        supabase.from("chat_conversations")
          .select("id", { count: "exact", head: true })
          .eq("status", "open"),
        supabase.from("business_plans")
          .select("business_id", { count: "exact", head: true })
          .eq("status", "trialing")
          .lte("trial_ends_at", threeDays)
          .gte("trial_ends_at", new Date().toISOString()),
        supabase.from("business_plans")
          .select("business_id", { count: "exact", head: true })
          .in("status", ["past_due", "unpaid"]),
        supabase.from("chat_conversations")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
          .is("first_admin_reply_at", null)
          .lte("last_message_at", twoHoursAgo),
        supabase.from("reviews")
          .select("id", { count: "exact", head: true })
          .lte("rating", 2)
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("businesses")
          .select("id", { count: "exact", head: true })
          .eq("is_verified", false)
          .eq("is_active", true),
      ]);

      const gmvToday = (todayOrders.data || []).reduce((s, o: any) => s + (Number(o.total_amount) || 0), 0);
      return {
        ordersToday: todayOrders.count || 0,
        gmvToday,
        signupsToday: todaySignups.count || 0,
        openChats: openChats.count || 0,
        trialExpiring: trialExpiring.count || 0,
        pastDue: pastDue.count || 0,
        unansweredChats: unansweredChats.count || 0,
        lowRatedReviews: lowRatedReviews.count || 0,
        unverifiedBiz: unverifiedBiz.count || 0,
      };
    },
  });

export const trendPct = (curr: number, prev: number) => {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return 100;
  return ((curr - prev) / prev) * 100;
};