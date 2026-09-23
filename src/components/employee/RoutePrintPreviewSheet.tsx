// RoutePrintPreviewSheet — lille forhåndsvisning af kvitteringen
// (rutelisten) før medarbejderen sender den til print. Viser samme
// indhold som /medarbejder/rute/:id/print men i en kompakt version
// inde i et højre-side Sheet, så medarbejderen kan tjekke at alt ser
// rigtigt ud uden at navigere væk fra "Min dag".
//
// Layoutet bevidst MATCHER virksomhedspanelets sheet-stil
// (StopDetailSheet) så medarbejder- og virksomhedspanelet føles ensartet.
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Printer, ExternalLink, Flag, Route as RouteIcon,
  MapPin, ClipboardList, ListChecks, StickyNote, Phone, Contact, FileText, AlignJustify,
} from "lucide-react";
import { useMyRouteData } from "@/hooks/useRoutes";
import { stripPrices } from "@/lib/employee-display";
import { SheetFooterBar } from "@/components/route-planner/SheetSection";
import { Switch } from "@/components/ui/switch";

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
  const printPath = useMemo(() => {
    const params = new URLSearchParams({
      notes: showNotes ? "1" : "0",
      contact: showContact ? "1" : "0",
      tasks: showTasks ? "1" : "0",
      density: compact ? "compact" : "standard",
    });
    return routeId ? `/medarbejder/rute/${routeId}/print?${params.toString()}` : "#";
  }, [routeId, showNotes, showContact, showTasks, compact]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="planner-overlay w-full p-0 flex flex-col sm:max-w-xl"
      >
        {/* Header */}
        <SheetHeader className="planner-overlay-header shrink-0 border-b border-border bg-card px-4 py-3 text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] bg-accent text-accent-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
            </span>
            <SheetTitle className="text-base font-semibold">Forhåndsvisning af kvittering</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Sådan ser udskriften ud — gennemgå indholdet før du printer.
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <div className="planner-overlay-body flex-1 overflow-y-auto bg-secondary/30 p-3 sm:p-4">
          {isLoading || !data ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Henter rutedata…
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-2 sm:grid-cols-4">
                <PreviewOption icon={<StickyNote className="h-3.5 w-3.5" />} label="Noter" checked={showNotes} onChange={setShowNotes} />
                <PreviewOption icon={<Contact className="h-3.5 w-3.5" />} label="Kontakt" checked={showContact} onChange={setShowContact} />
                <PreviewOption icon={<FileText className="h-3.5 w-3.5" />} label="Opgaver" checked={showTasks} onChange={setShowTasks} />
                <PreviewOption icon={<AlignJustify className="h-3.5 w-3.5" />} label="Kompakt" checked={compact} onChange={setCompact} />
              </div>
              <PreviewArticle data={data} showNotes={showNotes} showContact={showContact} showTasks={showTasks} compact={compact} />
            </div>
          )}
        </div>

        {/* Footer-handlinger */}
        <SheetFooterBar className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            asChild
            variant="outline"
            className="h-9 gap-1.5 rounded-[4px] border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Link to={printPath} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Åbn fuld visning
            </Link>
          </Button>
          <Button
            asChild
            className="h-9 gap-1.5 rounded-[4px] bg-accent text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:bg-accent/90"
          >
            <Link to={printPath}>
              <Printer className="h-4 w-4" /> Gå til print
            </Link>
          </Button>
        </SheetFooterBar>
      </SheetContent>
    </Sheet>
  );
};

/* ─── Preview-artikel (kompakt udgave af EmployeeRoutePrint-arket) ─── */
const PreviewArticle = ({ data, showNotes, showContact, showTasks, compact }: {
  data: NonNullable<ReturnType<typeof useMyRouteData>["data"]>;
  showNotes: boolean;
  showContact: boolean;
  showTasks: boolean;
  compact: boolean;
}) => {
  const { route, stops, employee } = data as any;
  const sorted = [...stops].sort((a: any, b: any) => a.sequence - b.sequence);
  const businessName = (route as any).businesses?.name || "";
  const distance = route.total_distance_km != null ? `${Number(route.total_distance_km).toFixed(1)} km` : "—";

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="h-1 w-full bg-foreground" />
      <div className="p-4 sm:p-5">
        {/* Header */}
        <header className="border-b border-border pb-4">
          <Badge variant="outline" className="gap-1 text-[10px] uppercase tracking-wider">
            <ClipboardList className="h-3 w-3" /> Ruteliste
          </Badge>
          <h2 className="mt-2 text-lg font-semibold leading-tight text-foreground">
            {route.name || "Rute"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground capitalize">
            {format(parseISO(route.route_date), "EEEE d. MMMM yyyy", { locale: da })}
          </p>
          {(businessName || employee?.name) && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {businessName}{employee?.name ? ` · ${employee.name}` : ""}
            </p>
          )}

          {/* Meta */}
          <dl className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-border bg-secondary/40 p-2.5">
            <Meta icon={<Flag className="h-3 w-3" />} label="Stop" value={String(sorted.length)} />
            <Meta icon={<RouteIcon className="h-3 w-3" />} label="Distance" value={distance} />
          </dl>

          {route.start_address && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span><span className="font-medium text-foreground">Start:</span> {route.start_address}</span>
            </p>
          )}
        </header>

        {/* Section label */}
        <div className="flex items-center gap-2 py-2.5">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stop på ruten
          </span>
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? "stop" : "stop"}
          </span>
        </div>

        {/* Stops */}
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Ingen stop på ruten.</p>
        ) : (
          <ol className="divide-y divide-border">
            {sorted.map((s: any, i: number) => {
              const cleaned = s.service_summary ? stripPrices(s.service_summary) : "";
              return (
                <li key={s.id} className={compact ? "py-2" : "py-3.5"}>
                  <div className="flex gap-3">
                    <div className="flex shrink-0 flex-col items-center gap-1.5 pt-0.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold tabular-nums text-background">
                        {i + 1}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-sm font-semibold leading-tight text-foreground">{s.customer_name || "Stop"}</h4>
                      </div>
                      <div className="mt-1 grid gap-0.5 text-[11px] text-muted-foreground">
                        {s.address && (
                          <p className="flex items-start gap-1">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{s.address}</span>
                          </p>
                        )}
                        {showContact && s.customer_phone && (
                          <p className="flex items-center gap-1 tabular-nums">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{s.customer_phone}</span>
                          </p>
                        )}
                      </div>
                      {showTasks && cleaned && (
                        <p className="mt-1.5 rounded border-l-2 border-foreground bg-secondary/40 px-2 py-1 text-[11px] text-foreground">
                          <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Opgave</span>
                          {cleaned}
                        </p>
                      )}
                      {showNotes && s.notes && (
                        <p className="mt-1.5 flex items-start gap-1 text-[11px] italic text-foreground">
                          <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          {s.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
          <p>Forhåndsvisning · {new Date().toLocaleDateString("da-DK")}</p>
          <p className="font-semibold tracking-tight text-foreground">Serviceydere</p>
        </footer>
      </div>
    </article>
  );
};

const PreviewOption = ({ icon, label, checked, onChange }: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md bg-secondary/35 px-2.5 py-2">
    <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
    <Switch checked={checked} onCheckedChange={onChange} aria-label={`Vis ${label.toLowerCase()}`} />
  </label>
);

const Meta = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div>
    <dt className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
      {icon}{label}
    </dt>
    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground leading-tight">{value}</dd>
  </div>
);

export default RoutePrintPreviewSheet;