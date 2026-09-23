// StopDetailsSheetById — read-only "Vis detaljer" Sheet til et rute-stop
// vi kun kender stop-id'et på (fx fra statistik-listen). Henter selve stop-
// rækken + dens rute, og rendrer den fælles StopDetailsContent. Erstatter
// "kun vis adresse + ordre-id"-flowet, så medarbejderen ser præcis det samme
// detaljepanel som på sin "min dag"/rutekørsel — bare uden markér-udført.
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { StopDetailsContent } from "./StopDetailsContent";
import type { RouteStop } from "@/hooks/useRoutes";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stopId: string | null;
};

const useStopWithRoute = (stopId: string | null) => {
  return useQuery({
    queryKey: ["stop-with-route", stopId],
    enabled: !!stopId,
    queryFn: async () => {
      if (!stopId) return null;
      const { data: stop, error } = await supabase
        .from("route_stops")
        .select("*")
        .eq("id", stopId)
        .maybeSingle();
      if (error) throw error;
      if (!stop) return null;

      // Hent assignees så vi kan vise "delt med X kollega(er)"
      const { data: assignees } = await supabase
        .from("route_stop_assignees")
        .select("employee_id")
        .eq("stop_id", stopId);

      const { data: route } = await supabase
        .from("routes")
        .select("name, color, route_date")
        .eq("id", (stop as any).route_id)
        .maybeSingle();

      // Find stoppets index på ruten (1-baseret nummerering matches resten af appen)
      const { data: siblings } = await supabase
        .from("route_stops")
        .select("id, sort_order")
        .eq("route_id", (stop as any).route_id)
        .order("sort_order", { ascending: true });
      const idx = (siblings || []).findIndex((s: any) => s.id === stopId);

      const enriched = {
        ...(stop as any),
        assignee_ids: (assignees || []).map((a: any) => a.employee_id),
      } as RouteStop;

      return {
        stop: enriched,
        index: idx >= 0 ? idx : 0,
        route: route ? {
          name: (route as any).name,
          color: (route as any).color,
          date: (route as any).route_date,
        } : undefined,
      };
    },
  });
};

export const StopDetailsSheetById = ({ open, onOpenChange, stopId }: Props) => {
  const { data, isLoading } = useStopWithRoute(stopId);
  const isCompact = useIsBelowBreakpoint(1024);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Bottom-sheet på mobil (native, tommel-venlig) — højre-side
          på desktop som matcher virksomhedspanelets StopDetailSheet. */}
      <SheetContent
        side={isCompact ? "bottom" : "right"}
        className={
          isCompact
            ? "planner-overlay h-[92dvh] w-full !inset-x-0 !bottom-0 !rounded-t-[6px] !rounded-b-none !border-x-0 !border-b-0 p-0 flex flex-col"
            : "planner-overlay w-full p-0 flex flex-col sm:max-w-lg"
        }
      >
        {isLoading || !data ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Henter detaljer…
          </div>
        ) : (
          <StopDetailsContent
            stop={data.stop}
            index={data.index}
            themeColor={data.route?.color || "hsl(var(--foreground))"}
            route={data.route}
            readOnly
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default StopDetailsSheetById;