import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2, Rows3, Rows2 } from "lucide-react";
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
  const startTime = route.planned_start_time?.slice(0, 5) || "08:00";
  const distance = route.total_distance_km != null ? `${Number(route.total_distance_km).toFixed(1)} km` : "—";
  const totalTime = route.total_duration_minutes != null
    ? `${Math.floor(route.total_duration_minutes / 60)}t ${route.total_duration_minutes % 60}m`
    : "—";

  return (
    <div className={`min-h-screen bg-muted/40 print:bg-white print-root ${compact ? "is-compact" : ""}`}>
      {/* Action bar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-3xl px-3 sm:px-4 py-2.5 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="rounded-lg h-9 w-9 shrink-0">
            <Link to={`/medarbejder/rute/${routeId}`} aria-label="Tilbage">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm tracking-tight truncate">Print ruteliste</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              A4 · {sorted.length} stop · {compact ? "kompakt" : "standard"}
            </p>
          </div>
          <Button
            onClick={() => setCompact((v) => !v)}
            size="sm"
            variant="outline"
            className="h-9 rounded-lg gap-1.5 px-2.5 sm:px-3"
            title="Skift tæthed"
          >
            {compact ? <Rows3 className="h-4 w-4" /> : <Rows2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{compact ? "Standard" : "Kompakt"}</span>
          </Button>
          <Button
            onClick={() => window.print()}
            size="sm"
            className="h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 gap-1.5 shadow-sm px-3"
          >
            <Printer className="h-4 w-4" /> Udskriv
          </Button>
        </div>
      </div>

      {/* The "paper" — emulates an A4 sheet on screen */}
      <div className="px-3 sm:px-6 py-4 sm:py-8 print:p-0">
        <article
          className="print-sheet mx-auto bg-card text-foreground border border-border shadow-sm
                     max-w-[210mm] w-full
                     px-5 sm:px-10 py-6 sm:py-10
                     print:bg-white print:text-black print:border-0 print:shadow-none
                     print:max-w-none print:w-auto print:px-0 print:py-0 print:mx-0"
        >
          {/* ───────── Document header ───────── */}
          <header className="print-header pb-4 border-b-2 border-foreground print:border-black">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-muted-foreground print:text-black/60 font-medium">
                  Ruteliste
                </p>
                <h1 className="mt-1 text-[22px] sm:text-[26px] leading-tight font-semibold tracking-tight text-foreground print:text-black">
                  {route.name || "Rute"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground print:text-black/70 capitalize">
                  {format(parseISO(route.route_date), "EEEE d. MMMM yyyy", { locale: da })}
                </p>
              </div>
              {businessName && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-muted-foreground print:text-black/60 font-medium">
                    Udført af
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground print:text-black">
                    {businessName}
                  </p>
                  {employee && (
                    <p className="text-xs text-muted-foreground print:text-black/70 mt-0.5">
                      {employee.name}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Inline meta strip — flat, dense, document-like */}
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
              <MetaItem label="Start" value={startTime} />
              <MetaItem label="Stop" value={String(sorted.length)} />
              <MetaItem label="Distance" value={distance} />
              <MetaItem label="Tid i alt" value={totalTime} />
            </dl>

            {route.start_address && (
              <p className="mt-3 text-xs text-muted-foreground print:text-black/70">
                <span className="font-medium text-foreground print:text-black">Startadresse:</span>{" "}
                {route.start_address}
              </p>
            )}
          </header>

          {/* ───────── Stops list ───────── */}
          {sorted.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Ingen stop på ruten.</p>
          ) : (
            <ol className="print-stops mt-2">
              {sorted.map((s, i) => {
                const cleanedSummary = s.service_summary ? stripPrices(s.service_summary) : "";
                const arrival = s.planned_arrival
                  ? new Date(s.planned_arrival).toLocaleTimeString("da-DK", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : null;
                return (
                  <li
                    key={s.id}
                    className="print-stop py-4 border-b border-border last:border-b-0 print:border-black/30"
                  >
                    <div className="flex gap-4">
                      {/* Number + checkbox column */}
                      <div className="shrink-0 flex flex-col items-center gap-2 pt-0.5">
                        <div className="w-8 h-8 rounded-full bg-foreground text-background print:bg-white print:text-black print:border-[1.5px] print:border-black flex items-center justify-center text-[13px] font-semibold tabular-nums">
                          {i + 1}
                        </div>
                        <div
                          className="w-6 h-6 border-[1.5px] border-foreground rounded-[4px] print:border-black"
                          aria-label="Afkrydsningsfelt"
                        />
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                          <h3 className="font-semibold text-[15px] leading-tight text-foreground print:text-black">
                            {s.customer_name || "Stop"}
                          </h3>
                          {arrival && (
                            <span className="text-xs font-medium text-muted-foreground print:text-black tabular-nums">
                              kl. {arrival}
                              {s.duration_minutes > 0 && (
                                <span className="text-muted-foreground/70 print:text-black/60">
                                  {" "}· {s.duration_minutes} min
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Address & phone — single line, dense */}
                        <div className="mt-1 text-sm text-muted-foreground print:text-black/80 space-y-0.5">
                          {s.address && <p>{s.address}</p>}
                          {s.customer_phone && (
                            <p className="tabular-nums">Tlf. {s.customer_phone}</p>
                          )}
                        </div>

                        {cleanedSummary && (
                          <p className="mt-2 text-sm text-foreground print:text-black">
                            <span className="font-medium">Opgave:</span> {cleanedSummary}
                          </p>
                        )}

                        {s.notes && (
                          <p className="mt-1.5 text-sm text-foreground print:text-black">
                            <span className="font-medium">Note:</span>{" "}
                            <span className="italic">{s.notes}</span>
                          </p>
                        )}

                        {/* Signature lines */}
                        <div className="print-signature mt-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-black/60 font-medium">
                            Noter / underskrift
                          </p>
                          <div className="mt-1.5 border-b border-foreground/30 print:border-black h-5" />
                          <div className="mt-1 border-b border-foreground/30 print:border-black h-5" />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Footer */}
          <footer className="print-footer mt-6 pt-3 border-t border-border print:border-black flex items-center justify-between flex-wrap gap-2 text-[11px] text-muted-foreground print:text-black/70">
            <p>Udskrevet {new Date().toLocaleString("da-DK")}</p>
            <p className="font-medium text-foreground print:text-black">Serviceydere</p>
          </footer>
        </article>
      </div>

      {/* Dedikeret print-stylesheet — kalibreret til A4 */}
      <style>{`
        /* Skærm-tæthed når "Kompakt" er aktiv — preview af print-density */
        .print-root.is-compact .print-stop { padding-top: 0.625rem; padding-bottom: 0.625rem; }
        .print-root.is-compact .print-signature { margin-top: 0.5rem; }
        .print-root.is-compact .print-signature > div { height: 0.875rem !important; }

        @media print {
          @page { size: A4 portrait; margin: 14mm 14mm 16mm 14mm; }

          html, body {
            background: #fff !important;
            color: #000 !important;
            font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-root { background: #fff !important; }
          .print-sheet { border: 0 !important; box-shadow: none !important; padding: 0 !important; }

          /* Typografi i pt for forudsigelig A4-rendering */
          .print-root h1 { font-size: 16pt; line-height: 1.15; }
          .print-root h3 { font-size: 10.5pt; line-height: 1.25; }
          .print-root .text-\\[10px\\] { font-size: 7.5pt !important; }
          .print-root .text-\\[11px\\] { font-size: 8pt !important; letter-spacing: 0.04em; }
          .print-root .text-\\[13px\\] { font-size: 9.5pt !important; }
          .print-root .text-\\[15px\\] { font-size: 10.5pt !important; }
          .print-root .text-\\[22px\\] { font-size: 16pt !important; }
          .print-root .text-\\[26px\\] { font-size: 18pt !important; }
          .print-root .text-xs { font-size: 8pt !important; }
          .print-root .text-sm { font-size: 9.5pt !important; }

          /* Stop-tæthed */
          .print-stop { padding: 4mm 0 !important; }
          .print-signature { margin-top: 3mm !important; }
          .print-signature > div { height: 5mm !important; }
          .print-signature > div + div { margin-top: 1mm !important; }

          .print-header { padding-bottom: 4mm !important; }
          .print-footer { margin-top: 6mm !important; padding-top: 2mm !important; }

          /* Ingen skygger / fade-baggrunde */
          .print-root .shadow-sm { box-shadow: none !important; }
          .print-root .bg-card { background: #fff !important; }

          /* Side-bryd kontrol */
          .print-stop, .print-header, .print-footer {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-header { break-after: avoid; page-break-after: avoid; }
          .print-stop h3 { break-after: avoid; page-break-after: avoid; }

          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
          .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
          .print\\:mx-0 { margin-left: 0 !important; margin-right: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:w-auto { width: auto !important; }
          .print\\:text-black { color: #000 !important; }
          .print\\:text-black\\/60 { color: rgba(0,0,0,0.6) !important; }
          .print\\:text-black\\/70 { color: rgba(0,0,0,0.7) !important; }
          .print\\:text-black\\/80 { color: rgba(0,0,0,0.8) !important; }
          .print\\:border-black { border-color: #000 !important; }
          .print\\:border-black\\/30 { border-color: rgba(0,0,0,0.3) !important; }
          .print\\:border-0 { border-width: 0 !important; }
          .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          .print\\:bg-white { background: #fff !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

/* Flad metadata-celle — ren tekst, ingen ikoner, ingen baggrund */
const MetaItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground print:text-black/60 font-medium">
      {label}
    </dt>
    <dd className="mt-0.5 text-[15px] font-semibold text-foreground print:text-black tabular-nums leading-tight">
      {value}
    </dd>
  </div>
);

export default EmployeeRoutePrint;
