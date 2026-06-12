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
import { SheetHeaderBlock } from "./SheetSection";

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
        .select("id, agreement_id, subscription_id, order_id")
        .eq("route_id", route!.id);
      if (error) throw error;
      const total = stops?.length || 0;
      const agreements = stops?.filter((s: any) => s.agreement_id).length || 0;
      const subs = stops?.filter((s: any) => s.subscription_id).length || 0;
      const orders = stops?.filter((s: any) => s.order_id && !s.agreement_id && !s.subscription_id).length || 0;
      return { total, agreements, subs, orders, linked: agreements + subs + orders };
    },
  });

  const hasLinked = (data?.linked ?? 0) > 0;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader className="text-left space-y-2">
          <SheetHeaderBlock
            icon={<Trash2 className="h-4 w-4" />}
            title={<AlertDialogTitle className="text-base">Slet rute?</AlertDialogTitle>}
          />
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>
                <strong>{route?.name}</strong> slettes permanent. Tilkoblede medarbejdere fjernes fra ruten.
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tjekker tilknytninger…
                </div>
              ) : hasLinked ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <div className="font-medium text-destructive">Ruten har {data?.total} stop med tilknytninger</div>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        {data!.agreements > 0 && <li>{data!.agreements} aftale-stop ryger tilbage i aftalepoolen</li>}
                        {data!.subs > 0 && <li>{data!.subs} abonnement-stop ryger tilbage i aftalepoolen</li>}
                        {data!.orders > 0 && <li>{data!.orders} ordre-stop ryger tilbage som ikke-planlagt</li>}
                      </ul>
                      <div className="text-xs text-muted-foreground pt-1">
                        Selve aftalerne/ordrerne slettes ikke — de kan tildeles en ny rute bagefter.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Ingen aftaler eller ordrer påvirkes.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annullér</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Sletter…</>
            ) : hasLinked ? "Slet rute alligevel" : "Slet rute"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}