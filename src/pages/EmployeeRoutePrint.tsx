import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2, MapPin, Phone, Clock, StickyNote, Calendar, User, Building2, Route as RouteIcon, Timer, Rows3, Rows2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { stripPrices } from "@/lib/employee-display";

const EmployeeRoutePrint = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const { user, loading } = useAuth();
  const { data, isLoading } = useMyRouteData(routeId);
  const [compact, setCompact] = useState(false);

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
    <div className={`min-h-screen bg-muted/30 print:bg-white print-root ${compact ? "is-compact" : ""}`}>
      {/* Action bar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-lg"
          >
            <Link to={`/medarbejder/rute/${routeId}`} aria-label="Tilbage">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm tracking-tight truncate">Print ruteliste</h1>
            <p className="text-xs text-muted-foreground">
              {sorted.length} stop · A4 · {compact ? "kompakt" : "standard"}
            </p>
          </div>
          <Button
            onClick={() => setCompact((v) => !v)}
            size="sm"
            variant="outline"
            className="h-9 rounded-lg gap-2 hidden sm:inline-flex"
            title="Skift mellem kompakt og standard tæthed"
          >
            {compact ? <Rows3 className="h-4 w-4" /> : <Rows2 className="h-4 w-4" />}
            {compact ? "Standard" : "Kompakt"}
          </Button>
          <Button
            onClick={() => window.print()}
            size="sm"
            className="h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 gap-2 shadow-sm"
          >
            <Printer className="h-4 w-4" /> Udskriv
          </Button>
        </div>
      </div>

      {/* Printable content */}
      <div className="print-sheet max-w-3xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        {/* Header card */}
        <div className="print-header rounded-2xl border border-border bg-card shadow-sm overflow-hidden mb-5 print:rounded-none print:shadow-none print:border-black print:mb-4 print:break-inside-avoid">
          <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border print:border-black">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground print:text-black/70 font-medium">
                  Ruteliste
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground print:text-black mt-0.5">
                  {route.name || "Rute"}
                </h1>
                <p className="text-sm text-muted-foreground print:text-black mt-1 inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(parseISO(route.route_date), "EEEE d. MMMM yyyy", { locale: da })}
                </p>
              </div>
              {businessName && (
                <div className="text-right shrink-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground print:text-black/70 font-medium">
                    Virksomhed
                  </p>
                  <p className="text-sm font-medium text-foreground print:text-black mt-0.5 inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> {businessName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border print:divide-black/40 border-b border-border print:border-black">
            <StatCell
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Start"
              value={route.planned_start_time?.slice(0, 5) || "08:00"}
            />
            <StatCell
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Stop"
              value={String(sorted.length)}
            />
            <StatCell
              icon={<RouteIcon className="h-3.5 w-3.5" />}
              label="Distance"
              value={route.total_distance_km != null ? `${Number(route.total_distance_km).toFixed(1)} km` : "—"}
            />
            <StatCell
              icon={<Timer className="h-3.5 w-3.5" />}
              label="Tid"
              value={
                route.total_duration_minutes != null
                  ? `${Math.floor(route.total_duration_minutes / 60)}t ${route.total_duration_minutes % 60}m`
                  : "—"
              }
            />
          </div>

          {/* Meta row */}
          {(employee || route.start_address) && (
            <div className="px-5 sm:px-6 py-3 grid sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
              {employee && (
                <div className="flex items-start gap-2 text-foreground print:text-black">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground print:text-black/70 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground print:text-black/70 font-medium">
                      Medarbejder
                    </p>
                    <p className="font-medium truncate">{employee.name}</p>
                  </div>
                </div>
              )}
              {route.start_address && (
                <div className="flex items-start gap-2 text-foreground print:text-black">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground print:text-black/70 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground print:text-black/70 font-medium">
                      Startadresse
                    </p>
                    <p className="font-medium truncate">{route.start_address}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stops list */}
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground print:border-black">
            Ingen stop på ruten.
          </div>
        ) : (
          <ol className="print-stops space-y-3 print:space-y-2">
            {sorted.map((s, i) => {
              const cleanedSummary = s.service_summary ? stripPrices(s.service_summary) : "";
              const arrival = s.planned_arrival
                ? new Date(s.planned_arrival).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })
                : null;
              return (
                <li
                  key={s.id}
                  className="print-stop rounded-2xl border border-border bg-card shadow-sm overflow-hidden print:rounded-none print:shadow-none print:border-black print:break-inside-avoid"
                >
                  <div className="flex">
                    {/* Sequence rail */}
                    <div className="print-rail shrink-0 w-14 sm:w-16 bg-muted/40 print:bg-white border-r border-border print:border-black flex flex-col items-center justify-start pt-4 pb-4 gap-3">
                      <div className="w-9 h-9 rounded-full bg-foreground text-background print:bg-white print:text-black print:border-2 print:border-black flex items-center justify-center text-sm font-semibold">
                        {i + 1}
                      </div>
                      <div
                        className="w-7 h-7 border-2 border-foreground/60 print:border-black rounded-md"
                        aria-label="Afkrydsningsfelt"
                      />
                    </div>

                    {/* Body */}
                    <div className="print-body flex-1 min-w-0 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base text-foreground print:text-black truncate">
                            {s.customer_name || "Stop"}
                          </h3>
                          {s.address && (
                            <p className="mt-1 text-sm text-muted-foreground print:text-black inline-flex items-start gap-1.5">
                              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>{s.address}</span>
                            </p>
                          )}
                        </div>
                        {arrival && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground print:bg-white print:text-black print:border-black">
                            <Clock className="h-3 w-3" /> {arrival}
                          </span>
                        )}
                      </div>

                      {/* Detail grid */}
                      <div className="print-meta mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {s.customer_phone && (
                          <div className="flex items-start gap-2 text-foreground print:text-black">
                            <Phone className="h-3.5 w-3.5 mt-0.5 text-muted-foreground print:text-black/70 shrink-0" />
                            <span>{s.customer_phone}</span>
                          </div>
                        )}
                        {s.duration_minutes > 0 && (
                          <div className="flex items-start gap-2 text-foreground print:text-black">
                            <Timer className="h-3.5 w-3.5 mt-0.5 text-muted-foreground print:text-black/70 shrink-0" />
                            <span>{s.duration_minutes} min</span>
                          </div>
                        )}
                      </div>

                      {cleanedSummary && (
                        <div className="print-task mt-3 rounded-lg bg-muted/50 print:bg-white border border-border print:border-black px-3 py-2 text-sm text-foreground print:text-black">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground print:text-black/70 font-medium mb-0.5">
                            Opgave
                          </p>
                          <p>{cleanedSummary}</p>
                        </div>
                      )}

                      {s.notes && (
                        <div className="print-note mt-2 flex items-start gap-2 text-sm text-foreground print:text-black">
                          <StickyNote className="h-3.5 w-3.5 mt-0.5 text-muted-foreground print:text-black/70 shrink-0" />
                          <p className="italic">{s.notes}</p>
                        </div>
                      )}

                      {/* Notes lines */}
                      <div className="print-signature mt-4 print:mt-3">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground print:text-black/70 font-medium mb-1.5">
                          Noter / underskrift
                        </p>
                        <div className="border-b border-border/70 print:border-black h-5" />
                        <div className="border-b border-border/70 print:border-black h-5 mt-1" />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Footer */}
        <div className="print-footer mt-8 pt-4 border-t border-border text-xs text-muted-foreground print:text-black print:border-black flex items-center justify-between flex-wrap gap-2">
          <p>Udskrevet {new Date().toLocaleString("da-DK")}</p>
          <p className="font-medium">Serviceydere · {sorted.length} stop</p>
        </div>
      </div>

      {/* Dedikeret print-stylesheet — kalibreret til A4 */}
      <style>{`
        /* Skærm-tæthed når brugeren slår "Kompakt" til (preview af print) */
        .print-root.is-compact .print-body { padding: 0.875rem 1rem; }
        .print-root.is-compact .print-rail { padding-top: 0.875rem; padding-bottom: 0.875rem; }
        .print-root.is-compact .print-meta { margin-top: 0.5rem; }
        .print-root.is-compact .print-task { margin-top: 0.5rem; padding: 0.375rem 0.625rem; }
        .print-root.is-compact .print-signature { margin-top: 0.625rem; }
        .print-root.is-compact .print-stops > li + li { margin-top: 0.5rem; }

        @media print {
          /* A4 sidedimensionering — fast margin og pænt header/footer-areal */
          @page {
            size: A4 portrait;
            margin: 14mm 14mm 16mm 14mm;
          }

          /* Globale typograf-resets for forudsigelig tæthed */
          html, body {
            background: #fff !important;
            color: #000 !important;
            font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
            font-size: 10.5pt;
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Skjul alt udenfor print-roden så vi undgår uønskede elementer */
          .print-root { background: #fff !important; }

          /* Eksakt typografi-skala (i pt for stabilitet på A4) */
          .print-root h1 { font-size: 16pt; line-height: 1.2; margin: 0; }
          .print-root h3 { font-size: 11pt; line-height: 1.25; margin: 0; }
          .print-root p, .print-root span, .print-root div { font-size: 10pt; }
          .print-root .text-\\[11px\\] { font-size: 8pt !important; letter-spacing: 0.04em; }
          .print-root .text-xs { font-size: 8.5pt !important; }
          .print-root .text-sm { font-size: 9.5pt !important; }
          .print-root .text-base { font-size: 10.5pt !important; }
          .print-root .text-2xl { font-size: 16pt !important; }

          /* Faste, ensartede linjeafstande mellem blokke */
          .print-header { margin-bottom: 6mm !important; }
          .print-header .px-5,
          .print-header .sm\\:px-6 { padding-left: 6mm !important; padding-right: 6mm !important; }
          .print-header .pt-5 { padding-top: 4mm !important; }
          .print-header .pb-4 { padding-bottom: 3mm !important; }
          .print-header .py-3 { padding-top: 3mm !important; padding-bottom: 3mm !important; }

          .print-stops > li + li { margin-top: 3mm !important; }
          .print-stop { box-shadow: none !important; }
          .print-rail { padding: 4mm 0 !important; gap: 3mm !important; width: 14mm !important; }
          .print-body { padding: 4mm 5mm !important; }

          .print-meta { margin-top: 2.5mm !important; gap: 1.5mm 6mm !important; }
          .print-task { margin-top: 2.5mm !important; padding: 2mm 3mm !important; border-radius: 0 !important; background: #fff !important; }
          .print-note { margin-top: 1.5mm !important; }
          .print-signature { margin-top: 3mm !important; }
          .print-signature > div { height: 5mm !important; margin-top: 1mm !important; }
          .print-signature > div:first-of-type { margin-top: 0 !important; }

          .print-footer { margin-top: 6mm !important; padding-top: 2mm !important; }

          /* Ingen runde hjørner / skygger på print */
          .print-root .rounded-2xl,
          .print-root .rounded-lg,
          .print-root .rounded-md,
          .print-root .rounded-full,
          .print-root .rounded { border-radius: 0 !important; }
          .print-root .shadow-sm { box-shadow: none !important; }

          /* Hold cirkel-nummer og checkbox runde alligevel — de skal være tydelige */
          .print-rail > div:first-child { border-radius: 9999px !important; width: 9mm !important; height: 9mm !important; }
          .print-rail > div:nth-child(2) { width: 7mm !important; height: 7mm !important; border-radius: 1mm !important; }

          /* Sørg for at intet stop bliver klippet over to sider */
          .print-stop, .print-header, .print-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Undgå at headeren efterlades alene nederst på en side */
          .print-header { break-after: avoid; page-break-after: avoid; }
          /* Undgå "orphan"-overskrifter i stop */
          .print-body h3 { break-after: avoid; page-break-after: avoid; }

          /* Skjul interaktive elementer */
          .print\\:hidden { display: none !important; }

          /* Eksisterende utility overrides */
          .print\\:p-0 { padding: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:text-black { color: #000 !important; }
          .print\\:text-black\\/70 { color: rgba(0,0,0,0.7) !important; }
          .print\\:border-black { border-color: #000 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          .print\\:mt-4 { margin-top: 1rem !important; }
          .print\\:mt-5 { margin-top: 1.25rem !important; }
          .print\\:mt-3 { margin-top: 0.75rem !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:bg-white { background: #fff !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:divide-black\\/40 > * + * { border-color: rgba(0,0,0,0.4) !important; }
          .print\\:space-y-2 > * + * { margin-top: 0.5rem !important; }

          /* Tydelig sort streg på alle borders inde i print-roden */
          .print-root [class*="border"] { border-color: #000 !important; }
        }
      `}</style>
    </div>
  );
};

/* Lille intern hjælper til header-stat-celler */
const StatCell = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="px-4 sm:px-5 py-3">
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground print:text-black/70 font-medium inline-flex items-center gap-1">
      {icon} {label}
    </p>
    <p className="mt-0.5 text-base font-semibold text-foreground print:text-black tabular-nums">
      {value}
    </p>
  </div>
);

export default EmployeeRoutePrint;
