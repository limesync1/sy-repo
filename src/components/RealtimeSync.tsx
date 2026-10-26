import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
];

export function RealtimeSync() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refreshAll = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        qc.invalidateQueries({ refetchType: "active" });
      }, 300);
    };

    let channel = supabase.channel(`global-sync-${user.id}-${Math.random().toString(36).slice(2)}`);
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refreshAll);
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
    window.addEventListener("online", refreshAll);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", refreshAll);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [qc, user?.id]);

  return null;
}

export default RealtimeSync;
