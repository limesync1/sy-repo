// Print/PDF af en hel dags ruter — ren A4-venlig visning med stop, adresser,
// telefon og noter. Bruger window.print() så browseren kan gemme som PDF.
import { useEffect } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PrintRoute = {
  id: string;
  name: string;
  color?: string | null;
  employeeName?: string | null;
  stops: {
    customerName: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    startTime?: string | null;
    durationMin?: number | null;
    notes?: string | null;
  }[];
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: string;
  routes: PrintRoute[];
  businessName?: string;
};

export default function RoutePrintDialog({ open, onOpenChange, date, routes, businessName }: Props) {
  // Tilføj print-only stylesheet midlertidigt.
  useEffect(() => {
    if (!open) return;
    const style = document.createElement("style");
    style.setAttribute("data-print-routes", "1");
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        [data-print-routes-root], [data-print-routes-root] * { visibility: visible !important; }
        [data-print-routes-root] { position: absolute; left: 0; top: 0; width: 100%; }
        [data-print-routes-page] { page-break-after: always; padding: 20mm; }
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto p-0">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background px-4 py-2 print:hidden">
          <p className="text-sm font-semibold">
            Print ruter — {format(parseISO(date), "EEEE d. MMM yyyy", { locale: da })}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Print / Gem som PDF
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpenChange(false)} aria-label="Luk">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div data-print-routes-root>
          {routes.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Ingen ruter denne dag.</p>
          ) : routes.map((r) => (
            <div key={r.id} data-print-routes-page className="p-6 space-y-3">
              <header className="border-b pb-2 flex items-center gap-3">
                <span className="h-4 w-4 rounded" style={{ backgroundColor: r.color ?? "#999" }} />
                <div>
                  <h2 className="text-lg font-bold leading-tight">{r.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {businessName && <>{businessName} · </>}
                    {format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da })}
                    {r.employeeName && <> · {r.employeeName}</>}
                  </p>
                </div>
              </header>
              <ol className="space-y-2">
                {r.stops.map((s, i) => (
                  <li key={i} className="grid grid-cols-[24px_1fr_auto] gap-2 border-b border-dashed border-border py-2 text-sm">
                    <span className="font-bold tabular-nums">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="font-medium">{s.customerName}</p>
                      {(s.address || s.city) && (
                        <p className="text-xs text-muted-foreground">{[s.address, s.city].filter(Boolean).join(", ")}</p>
                      )}
                      {s.phone && <p className="text-xs">{s.phone}</p>}
                      {s.notes && <p className="mt-1 text-xs italic text-muted-foreground">"{s.notes}"</p>}
                    </div>
                    <div className="text-right text-xs tabular-nums whitespace-nowrap">
                      {s.startTime && <p className="font-medium">{s.startTime}</p>}
                      {s.durationMin != null && s.durationMin > 0 && (
                        <p className="text-muted-foreground">{s.durationMin} min</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}