import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import deleteRouteIcon from "@/assets/content-icons/slet-rute.svg.asset.json";

interface Props {
  route: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending?: boolean;
}

/**
 * Sikkerhedsdialog ved sletning af rute. Viser hvor mange stops der er knyttet
 * til aftaler/abonnementer/ordrer, så brugeren forstår konsekvensen før den
 * destruktive handling. Aftaler og abonnementer ryger tilbage i aftalepoolen,
 * men selve aftalen slettes ikke.
 */
export function DeleteRouteDialog({ route, onOpenChange, onConfirm, pending }: Props) {
  const open = !!route;
  const { data, isLoading } = useQuery({
    queryKey: ["route-delete-impact", route?.id],
    enabled: open && !!route?.id,
    staleTime: 5_000,
    queryFn: async () => {
      const { data: stops, error } = await supabase
        .from("route_stops")
        .select("id, agreement_occurrence_id, subscription_id, order_id")
        .eq("route_id", route!.id);
      if (error) throw error;
      const total = stops?.length || 0;
      const agreements = stops?.filter((s) => s.agreement_occurrence_id).length || 0;
      const subs = stops?.filter((s) => s.subscription_id).length || 0;
      const orders = stops?.filter((s) => s.order_id && !s.agreement_occurrence_id && !s.subscription_id).length || 0;
      return { total, agreements, subs, orders, linked: agreements + subs + orders };
    },
  });

  const hasLinked = (data?.linked ?? 0) > 0;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <AlertDialogContent className="planner-overlay max-w-md gap-0 p-0 overflow-hidden">
        <AlertDialogHeader className="items-center space-y-2 px-6 pt-6 pb-4 text-center sm:text-center">
          <img src={deleteRouteIcon.url} alt="" draggable={false} className="h-16 w-16 select-none object-contain" />
          <AlertDialogTitle className="text-lg">Slet rute?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6">
            <strong className="text-foreground">{route?.name}</strong> slettes permanent, og medarbejderne fjernes fra ruten.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 pb-5">
          {isLoading ? (
            <div role="status" className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Tjekker aftaler på ruten…
            </div>
          ) : hasLinked ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="space-y-1">
                  <p className="font-semibold text-destructive">Ruten har {data?.total} stop</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                    {data!.agreements > 0 && <li>{data!.agreements} aftaler kommer tilbage i «Aftaler uden rute»</li>}
                    {data!.subs > 0 && <li>{data!.subs} faste aftaler kommer tilbage i «Aftaler uden rute»</li>}
                    {data!.orders > 0 && <li>{data!.orders} bestillinger bliver ikke-planlagte</li>}
                  </ul>
                  <p className="pt-1 text-xs text-muted-foreground">Selve aftalerne slettes ikke og kan lægges på en ny rute.</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-secondary/40 p-3 text-center text-sm text-muted-foreground">Ingen aftaler påvirkes.</p>
          )}
        </div>
        <AlertDialogFooter className="planner-overlay-footer flex-col-reverse gap-2 border-t border-border/70 bg-secondary/30 px-6 py-4 sm:flex-row sm:justify-end sm:space-x-0">
          <AlertDialogCancel disabled={pending} className="mt-0 min-h-11 sm:min-h-10">Annullér</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending || isLoading}
            className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:min-h-10"
          >
            {pending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sletter…</>
            ) : (<><Trash2 className="mr-2 h-4 w-4" />{hasLinked ? "Slet rute alligevel" : "Slet rute"}</>)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
