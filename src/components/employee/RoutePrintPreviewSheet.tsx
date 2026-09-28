import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlignJustify, Contact, FileText, Loader2, Printer, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { RouteReceiptDocument } from "@/components/employee/RouteReceiptDocument";
import { SheetFooterBar } from "@/components/route-planner/SheetSection";
import { useMyRouteData } from "@/hooks/useRoutes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string | null;
};

export const RoutePrintPreviewSheet = ({ open, onOpenChange, routeId }: Props) => {
  const { data, isLoading } = useMyRouteData(routeId || undefined);
  const [showNotes, setShowNotes] = useState(false);
  const [showContact, setShowContact] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [compact, setCompact] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sy.employee.receipt-options") || "null");
      if (!saved) return;
      setShowNotes(saved.notes === true);
      setShowContact(saved.contact !== false);
      setShowTasks(saved.tasks !== false);
      setCompact(saved.compact !== false);
    } catch {
      // Ugyldige ældre indstillinger ignoreres.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sy.employee.receipt-options", JSON.stringify({ notes: showNotes, contact: showContact, tasks: showTasks, compact }));
  }, [showNotes, showContact, showTasks, compact]);

  const printPath = useMemo(() => {
    const params = new URLSearchParams({
      notes: showNotes ? "1" : "0",
      contact: showContact ? "1" : "0",
      tasks: showTasks ? "1" : "0",
      density: compact ? "compact" : "standard",
      from: "today",
    });
    return routeId ? `/medarbejder/rute/${routeId}/print?${params.toString()}` : "#";
  }, [routeId, showNotes, showContact, showTasks, compact]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="planner-overlay flex h-dvh w-full flex-col p-0 sm:max-w-2xl"
      >
        <SheetHeader className="planner-overlay-header shrink-0 border-b border-border bg-card px-4 py-3 pr-12 text-left sm:px-5">
          <SheetTitle className="text-base font-semibold">Kvittering</SheetTitle>
          <SheetDescription className="text-xs">Vælg oplysninger, kontrollér listen og fortsæt til print.</SheetDescription>
        </SheetHeader>

        <div className="planner-overlay-body flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary/25">
          <section className="shrink-0 border-b border-border bg-card px-3 py-2.5 sm:px-5" aria-label="Vælg indhold i kvitteringen">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <PreviewOption icon={<StickyNote />} label="Noter" checked={showNotes} onChange={setShowNotes} />
              <PreviewOption icon={<Contact />} label="Kontakt" checked={showContact} onChange={setShowContact} />
              <PreviewOption icon={<FileText />} label="Aftaler" checked={showTasks} onChange={setShowTasks} />
              <PreviewOption icon={<AlignJustify />} label="Kompakt" checked={compact} onChange={setCompact} />
            </div>
          </section>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-5">
            {isLoading || !data ? (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Henter ruten…
              </div>
            ) : (
              <RouteReceiptDocument
                data={data}
                showNotes={showNotes}
                showContact={showContact}
                showTasks={showTasks}
                compact={compact}
                preview
              />
            )}
          </div>
        </div>

        <SheetFooterBar className="shrink-0 justify-stretch px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:justify-end sm:px-5">
          <Button asChild disabled={!routeId || isLoading} className="h-11 w-full gap-2 rounded-[4px] font-semibold sm:h-9 sm:w-auto">
            <Link to={printPath} onClick={() => onOpenChange(false)}>
              <Printer className="h-4 w-4" /> Fortsæt til print
            </Link>
          </Button>
        </SheetFooterBar>
      </SheetContent>
    </Sheet>
  );
};

const PreviewOption = ({ icon, label, checked, onChange }: {
  icon: React.ReactElement;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-[4px] border border-border bg-background px-2 py-2 transition-colors hover:bg-secondary/60">
    <span className="shrink-0 text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
    <span className="min-w-0 flex-1 truncate text-xs font-medium">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} aria-label={`Vis ${label.toLowerCase()}`} className="shrink-0 scale-90" />
  </label>
);

export default RoutePrintPreviewSheet;