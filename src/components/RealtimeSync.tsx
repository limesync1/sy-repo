import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { publishPanelRefresh } from "@/lib/panel-refresh";

/**
 * Global live-synkronisering for indloggede brugere.
 * Ændringer fra andre enheder (opret/ret/slet) opdaterer alle viste lister
 * uden genindlæsning. Lytter UDEN filter, fordi filtrerede DELETE-events ikke
 * leveres af Realtime; RLS begrænser stadig hvilke rækker der sendes.
 * Ved genforbindelse, netværk tilbage eller fane i fokus hentes data igen, så
 * tabte events aldrig efterlader forældet indhold.
 */
const TABLES = [
  "orders", "order_items", "subscriptions", "routes", "route_stops",
  "agreements", "agreement_occurrences", "services", "private_customers",
  "business_customers", "employees", "reviews", "quote_requests",
  "quote_request_matches", "route_stop_assignees", "route_employees",
  "employee_absences",
  "business_owner_alerts", "customer_notification_queue",
  "accounting_sync_log", "accounting_sync_queue", "accounting_sync_dlq",
  "invoice_batches", "employee_completed_stops",
];

export function RealtimeSync() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pendingTables = new Set<string>();
    let recovery = false;
    const refreshAll = (table?: string) => {
      if (table) pendingTables.add(table);
      else recovery = true;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const changed = recovery ? null : [...pendingTables];
        recovery = false;
        pendingTables.clear();
        void qc.invalidateQueries({ refetchType: "active" });
        publishPanelRefresh(changed);
      }, 300);
    };

    let channel = supabase.channel(`global-sync-${user.id}-${Math.random().toString(36).slice(2)}`);
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => refreshAll(table));
    }
    let wasDisconnected = false;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (wasDisconnected) refreshAll();
        wasDisconnected = false;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        wasDisconnected = true;
      }
    });

    let hiddenAt = 0;
    const onVisible = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 5_000) refreshAll();
    };
    const onOnline = () => refreshAll();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [qc, user?.id]);

  return null;
}

export default RealtimeSync;
