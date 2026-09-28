import { useEffect } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AlignJustify, ArrowLeft, Contact, FileText, Loader2, Printer, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteReceiptDocument } from "@/components/employee/RouteReceiptDocument";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData } from "@/hooks/useRoutes";

const EmployeeRoutePrint = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading } = useMyRouteData(routeId);
  const compact = searchParams.get("density") !== "standard";
  const showNotes = searchParams.get("notes") === "1";
  const showContact = searchParams.get("contact") !== "0";
  const showTasks = searchParams.get("tasks") !== "0";

  const updateOption = (key: "notes" | "contact" | "tasks" | "density", value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    next.set("from", "today");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    document.title = "Ruteliste — print";
  }, []);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Indlæser…</div>;
  }
  if (!user) return <Navigate to="/log-ind" replace />;
  if (!data) return <div className="p-8 text-center text-sm">Rute ikke fundet.</div>;

  const stopCount = data.stops.length;

  return (
    <div className="receipt-print-root min-h-screen bg-secondary/30 print:bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:px-5">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-[4px]">
            <Link to="/medarbejder" aria-label="Tilbage til Min dag"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">Print kvittering</h1>
            <p className="truncate text-[11px] text-muted-foreground">{stopCount} stop · A4</p>
          </div>
          <Button onClick={() => window.print()} className="h-9 gap-2 rounded-[4px] px-3 text-xs font-semibold sm:text-sm">
            <Printer className="h-4 w-4" /><span>Print</span>
          </Button>
        </div>
      </header>

      <section className="border-b border-border bg-card print:hidden" aria-label="Vælg indhold i kvitteringen">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-1.5 px-3 py-2.5 sm:grid-cols-4 sm:px-5">
          <PrintOption icon={<StickyNote />} label="Noter" active={showNotes} onClick={() => updateOption("notes", showNotes ? "0" : "1")} />
          <PrintOption icon={<Contact />} label="Kontakt" active={showContact} onClick={() => updateOption("contact", showContact ? "0" : "1")} />
          <PrintOption icon={<FileText />} label="Aftaler" active={showTasks} onClick={() => updateOption("tasks", showTasks ? "0" : "1")} />
          <PrintOption icon={<AlignJustify />} label="Kompakt" active={compact} onClick={() => updateOption("density", compact ? "standard" : "compact")} />
        </div>
      </section>

      <main className="mx-auto max-w-5xl p-2.5 sm:p-6 print:max-w-none print:p-0">
        <RouteReceiptDocument data={data} showNotes={showNotes} showContact={showContact} showTasks={showTasks} compact={compact} />
      </main>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 13mm 14mm 15mm; }
          html, body { background: #fff !important; color: #000 !important; font-family: Inter, system-ui, sans-serif; font-size: 10pt; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .receipt-print-root { min-height: 0 !important; background: #fff !important; }
          .receipt-document, .receipt-document * { color: #000 !important; box-shadow: none !important; }
          .receipt-document { background: #fff !important; }
          .receipt-document-inner { padding: 0 !important; }
          .receipt-document .bg-secondary\\/30 { background: transparent !important; }
          .receipt-header, .receipt-stop, .receipt-footer { break-inside: avoid; page-break-inside: avoid; }
          .receipt-stop { padding-top: ${compact ? "2.5mm" : "4mm"} !important; padding-bottom: ${compact ? "2.5mm" : "4mm"} !important; }
          .receipt-document h1 { font-size: 17pt !important; }
          .receipt-document h2 { font-size: 10.5pt !important; }
        }
      `}</style>
    </div>
  );
};

const PrintOption = ({ icon, label, active, onClick }: { icon: React.ReactElement; label: string; active: boolean; onClick: () => void }) => (
  <Button type="button" variant="outline" size="sm" aria-pressed={active} onClick={onClick} className="h-9 justify-start gap-2 rounded-[4px] px-2.5 text-xs">
    <span className="text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
    <span className="truncate">{label}</span>
    <span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${active ? "bg-accent" : "bg-muted-foreground/25"}`} />
  </Button>
);

export default EmployeeRoutePrint;