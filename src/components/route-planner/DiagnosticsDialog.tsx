/**
 * L3 — Diagnostik-dialog for ikke-projicérbare aftaler.
 *
 * Viser per-aftale årsag + handlingsknap der enten åbner aftalen eller
 * tildeler en foretrukken rute. Bygger på `describeUnprojectable` fra
 * forslagsmotoren, så fejlteksten er konsistent overalt.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { describeUnprojectable, type UnprojectableReason } from "@/lib/route-suggestions";
import { useNavigate } from "react-router-dom";

export type UnprojectableItem = {
  source: any;
  reason: UnprojectableReason | string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: UnprojectableItem[];
  onAssignRoute?: (source: any) => void;
};

export function DiagnosticsDialog({ open, onOpenChange, items, onAssignRoute }: Props) {
  const navigate = useNavigate();

  const openAgreement = (source: any) => {
    if (source?.id) navigate(`/admin/agreements?focus=${encodeURIComponent(source.id)}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {items.length === 1 ? "1 aftale kan ikke projiceres" : `${items.length} aftaler kan ikke projiceres`}
          </DialogTitle>
          <DialogDescription>
            Hver række viser hvorfor aftalen mangler i kalenderen og hvad du kan gøre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.map((it, idx) => {
            const d = describeUnprojectable(it.reason as UnprojectableReason);
            const customerName = it.source?.customer_name || it.source?.address || "Aftale uden navn";
            const isMissingRoute = it.reason === "missing_route";
            return (
              <div key={`${it.source?.id ?? idx}`} className="rounded-md border p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{customerName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {it.source?.address ? `${it.source.address}${it.source?.city ? ", " + it.source.city : ""}` : "Ingen adresse"}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">{d.title}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{d.hint}</p>
                <div className="flex justify-end gap-2">
                  {isMissingRoute && onAssignRoute && (
                    <Button size="sm" variant="secondary" onClick={() => { onAssignRoute(it.source); onOpenChange(false); }}>
                      Tildel rute
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openAgreement(it.source)}>
                    Åbn aftale
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Ingen aftaler at vise.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Luk</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}