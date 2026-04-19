import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { stripPrices } from "@/lib/employee-display";

const EmployeeRoutePrint = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const { user, loading } = useAuth();
  const { data, isLoading } = useMyRouteData(routeId);

  useEffect(() => {
    document.title = "Ruteliste — print";
  }, []);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Indlæser...
      </div>
    );
  }
  if (!user) return <Navigate to="/log-ind" replace />;
  if (!data) return <div className="p-8 text-center">Rute ikke fundet.</div>;

  const { route, stops, employee } = data;
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const businessName = (route as any).businesses?.name || "";

  return (
    <div className="min-h-screen bg-background">
      {/* Action bar — hidden on print */}
      <div className="print:hidden border-b bg-foreground text-background">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-background hover:bg-background/10">
            <Link to={`/medarbejder/rute/${routeId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">Print ruteliste</h1>
            <p className="text-xs opacity-80">{sorted.length} stop</p>
          </div>
          <Button onClick={() => window.print()} size="sm" variant="secondary" className="gap-2">
            <Printer className="h-4 w-4" /> Udskriv
          </Button>
        </div>
      </div>

      {/* Printable content */}
      <div className="max-w-3xl mx-auto p-6 print:p-0 print:max-w-none">
        {/* Header */}
        <div className="border-b-2 border-foreground pb-4 mb-6 print:border-black">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold print:text-black">
                {route.name || "Rute"}
              </h1>
              <p className="text-sm text-muted-foreground print:text-black mt-1">
                {format(parseISO(route.route_date), "EEEE d. MMMM yyyy", { locale: da })}
              </p>
              {employee && (
                <p className="text-sm mt-2 print:text-black">
                  <strong>Medarbejder:</strong> {employee.name}
                </p>
              )}
              {businessName && (
                <p className="text-sm print:text-black">
                  <strong>Virksomhed:</strong> {businessName}
                </p>
              )}
            </div>
            <div className="text-right text-sm">
              <p className="print:text-black"><strong>Start:</strong> {route.planned_start_time?.slice(0, 5) || "08:00"}</p>
              <p className="print:text-black"><strong>Stop:</strong> {sorted.length}</p>
              {route.total_distance_km != null && (
                <p className="print:text-black">
                  <strong>Distance:</strong> {Number(route.total_distance_km).toFixed(1)} km
                </p>
              )}
              {route.total_duration_minutes != null && (
                <p className="print:text-black">
                  <strong>Tid:</strong> {Math.floor(route.total_duration_minutes / 60)}t {route.total_duration_minutes % 60}m
                </p>
              )}
            </div>
          </div>
          {route.start_address && (
            <p className="text-sm mt-3 print:text-black">
              <strong>Startadresse:</strong> {route.start_address}
            </p>
          )}
        </div>

        {/* Stops list */}
        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Ingen stop på ruten.</p>
        ) : (
          <ol className="space-y-3">
            {sorted.map((s, i) => (
              <li
                key={s.id}
                className="border rounded-lg p-4 print:border-black print:rounded-none print:break-inside-avoid"
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox for manual marking */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="w-7 h-7 border-2 border-foreground print:border-black rounded flex items-center justify-center text-sm font-bold print:text-black">
                      {i + 1}
                    </div>
                    <div className="w-7 h-7 border-2 border-foreground print:border-black rounded" aria-label="Afkrydsningsfelt"></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-base print:text-black">
                        {s.customer_name || "Stop"}
                      </h3>
                      {s.planned_arrival && (
                        <span className="text-sm text-muted-foreground print:text-black">
                          ca. {new Date(s.planned_arrival).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>

                    {s.address && (
                      <p className="text-sm mt-1 print:text-black">📍 {s.address}</p>
                    )}
                    {s.customer_phone && (
                      <p className="text-sm mt-0.5 print:text-black">📞 {s.customer_phone}</p>
                    )}
                    {s.service_summary && stripPrices(s.service_summary) && (
                      <p className="text-sm mt-2 print:text-black">
                        <strong>Opgave:</strong> {stripPrices(s.service_summary)}
                      </p>
                    )}
                    {s.duration_minutes > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 print:text-black">
                        Forventet varighed: {s.duration_minutes} min
                      </p>
                    )}
                    {s.notes && (
                      <p className="text-sm mt-2 italic print:text-black">
                        <strong>Note:</strong> {s.notes}
                      </p>
                    )}

                    {/* Notes lines for manual writing */}
                    <div className="mt-3 print:mt-4">
                      <p className="text-xs text-muted-foreground mb-1 print:text-black">Noter / underskrift:</p>
                      <div className="border-b border-foreground/40 print:border-black h-5"></div>
                      <div className="border-b border-foreground/40 print:border-black h-5 mt-1"></div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-xs text-muted-foreground print:text-black print:border-black">
          <p>Udskrevet {new Date().toLocaleString("da-DK")} · Serviceydere</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:text-black { color: #000 !important; }
          .print\\:border-black { border-color: #000 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          .print\\:mt-4 { margin-top: 1rem !important; }
        }
      `}</style>
    </div>
  );
};

export default EmployeeRoutePrint;
