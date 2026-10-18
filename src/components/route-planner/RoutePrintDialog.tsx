import { useEffect, useMemo, useState } from "react";
import { eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { da } from "date-fns/locale";
import type { DateRange, DayContentProps } from "react-day-picker";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Printer,
  Route as RouteIcon,
  Settings2,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatKr } from "@/lib/commission";
import { formatClockTime, formatRunDuration } from "@/components/employee-route/route-run-clock";

export type PrintRoute = {
  id: string;
  date: string;
  name: string;
  color?: string | null;
  employeeNames?: string[];
  startAddress?: string | null;
  distanceKm?: number | null;
  plannedStartTime?: string | null;
  receipt?: { start: number | null; end: number | null; customerSeconds: number; driveEstimateSeconds: number | null; earnings: number | null; loading?: boolean; error?: boolean };
  stops: {
    id?: string;
    customerName: string;
    address?: string | null;
    phone?: string | null;
    notes?: string | null;
    serviceSummary?: string | null;
    plannedArrival?: string | null;
    plannedDeparture?: string | null;
    durationMinutes?: number | null;
    arrivedAt?: number | null;
    completedAt?: string | null;
    earnings?: number | null;
  }[];
};

type PrintOptions = {
  employee: boolean;
  phone: boolean;
  address: boolean;
  service: boolean;
  notes: boolean;
  startAddress: boolean;
  distance: boolean;
  routeColor: boolean;
  compact: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: string;
  routes: PrintRoute[];
  businessName?: string;
  title?: string;
};

const STORAGE_KEY = "route-print-options-v2";
const DEFAULT_OPTIONS: PrintOptions = {
  employee: true,
  phone: true,
  address: true,
  service: true,
  notes: true,
  startAddress: true,
  distance: true,
  routeColor: true,
  compact: false,
};

const optionRows: { key: keyof PrintOptions; label: string }[] = [
  { key: "employee", label: "Medarbejdere" },
  { key: "address", label: "Adresser" },
  { key: "phone", label: "Telefonnumre" },
  { key: "service", label: "Service og aftale" },
  { key: "notes", label: "Noter" },
  { key: "startAddress", label: "Startadresse" },
  { key: "distance", label: "Rutens distance" },
  { key: "routeColor", label: "Rutefarve" },
  { key: "compact", label: "Kompakt visning" },
];

const dateLabel = (date: string) => format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da });
const shortDateLabel = (date: string) => format(parseISO(date), "d. MMM", { locale: da });

export default function RoutePrintDialog({ open, onOpenChange, initialDate, routes, businessName, title = "Print ruter" }: Props) {
  const initial = parseISO(initialDate);
  const [mobileView, setMobileView] = useState<"preview" | "options">("preview");
  const [mode, setMode] = useState<"day" | "range">("day");
  const [range, setRange] = useState<DateRange>({ from: initial, to: initial });
  const [options, setOptions] = useState<PrintOptions>(() => {
    if (typeof window === "undefined") return DEFAULT_OPTIONS;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_OPTIONS, ...JSON.parse(stored) } : DEFAULT_OPTIONS;
    } catch {
      return DEFAULT_OPTIONS;
    }
  });

  useEffect(() => {
    if (!open) return;
    const selected = parseISO(initialDate);
    setMobileView("preview");
    setMode("day");
    setRange({ from: selected, to: selected });
  }, [initialDate, open]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch {
      // Printvalg er en bekvemmelighed; et blokeret lokallager må ikke stoppe print.
    }
  }, [options]);

  useEffect(() => {
    if (!open) return;
    const style = document.createElement("style");
    style.setAttribute("data-print-routes", "1");
    style.textContent = `
      @media print {
        @page { size: A4; margin: 12mm; }
        body * { visibility: hidden !important; }
        [data-print-routes-root], [data-print-routes-root] * { visibility: visible !important; }
        [data-print-routes-root] { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; overflow: visible !important; }
        [data-print-day] { break-before: page; }
        [data-print-day]:first-child { break-before: auto; }
        [data-print-route] { break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, [open]);

  const selectedDates = useMemo(() => {
    const from = range.from ?? initial;
    const to = mode === "range" ? range.to ?? from : from;
    return eachDayOfInterval({ start: from, end: to }).map((day) => format(day, "yyyy-MM-dd"));
  }, [initial, mode, range.from, range.to]);

  const selectedRoutes = useMemo(() => {
    const dates = new Set(selectedDates);
    return routes
      .filter((route) => dates.has(route.date))
      .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "da"));
  }, [routes, selectedDates]);

  const routesByDate = useMemo(() => {
    const grouped = new Map<string, PrintRoute[]>();
    selectedDates.forEach((date) => grouped.set(date, []));
    selectedRoutes.forEach((route) => grouped.get(route.date)?.push(route));
    return grouped;
  }, [selectedDates, selectedRoutes]);

  const routeCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    routes.forEach((route) => counts.set(route.date, (counts.get(route.date) ?? 0) + 1));
    return counts;
  }, [routes]);

  const PrintDayContent = ({ date }: DayContentProps) => {
    const count = routeCountByDate.get(format(date, "yyyy-MM-dd")) ?? 0;
    return (
      <span className="relative flex h-9 w-9 items-center justify-center">
        <span>{date.getDate()}</span>
        {count > 0 && (
          <span
            className="absolute bottom-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 text-[8px] font-bold leading-none text-accent-foreground ring-1 ring-background"
            aria-label={`${count} ${count === 1 ? "rute" : "ruter"}`}
          >
            {count}
          </span>
        )}
      </span>
    );
  };

  const calendarComponents = {
    DayContent: PrintDayContent,
    IconLeft: () => <ChevronLeft className="h-4 w-4" />,
    IconRight: () => <ChevronRight className="h-4 w-4" />,
  };

  const totalStops = selectedRoutes.reduce((sum, route) => sum + route.stops.length, 0);
  const printDisabled = selectedRoutes.length === 0 || selectedRoutes.some(route => route.receipt?.loading || route.receipt?.error);
  const periodLabel = selectedDates.length === 1
    ? dateLabel(selectedDates[0])
    : `${shortDateLabel(selectedDates[0])} – ${shortDateLabel(selectedDates[selectedDates.length - 1])}`;

  const chooseToday = () => {
    const today = new Date();
    setMode("day");
    setRange({ from: today, to: today });
  };

  const chooseWeek = () => {
    const anchor = range.from ?? initial;
    setMode("range");
    setRange({
      from: startOfWeek(anchor, { weekStartsOn: 1 }),
      to: endOfWeek(anchor, { weekStartsOn: 1 }),
    });
  };

  const toggleOption = (key: keyof PrintOptions) => {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-large planner-overlay flex h-[min(94dvh,880px)] w-[calc(100vw-1rem)] max-w-6xl flex-col overflow-hidden rounded-md p-0">
        <div className="planner-overlay-header flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 pr-14 sm:px-5">
          <div className="min-w-0">
            <DialogTitle className="truncate text-sm font-semibold text-foreground">{title}</DialogTitle>
            <DialogDescription className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Vælg periode og indhold, før du printer eller gemmer som PDF.</DialogDescription>
          </div>
          <Button size="sm" onClick={() => window.print()} disabled={printDisabled} className="hidden shrink-0 gap-2 lg:inline-flex">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print / Gem som PDF</span>
            <span className="sm:hidden">Print</span>
          </Button>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-1 border-b border-border p-2 lg:hidden" role="group" aria-label="Printvisning">
          <Button variant={mobileView === "preview" ? "secondary" : "ghost"} className="h-11 gap-2" aria-pressed={mobileView === "preview"} onClick={() => setMobileView("preview")}><FileText className="h-4 w-4" />Forhåndsvisning</Button>
          <Button variant={mobileView === "options" ? "secondary" : "ghost"} className="h-11 gap-2" aria-pressed={mobileView === "options"} onClick={() => setMobileView("options")}><Settings2 className="h-4 w-4" />Printvalg</Button>
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={cn("min-h-0 overflow-y-auto overscroll-contain border-border bg-secondary/20 p-3 lg:block lg:border-r lg:p-4", mobileView !== "options" && "hidden")}>
            <section>
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground">Vælg datoer</h3>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-background p-1">
                <Button type="button" size="sm" variant={mode === "day" ? "default" : "ghost"} className="h-8 text-xs" onClick={() => {
                  const selected = range.from ?? initial;
                  setMode("day");
                  setRange({ from: selected, to: selected });
                }}>
                  Én dag
                </Button>
                <Button type="button" size="sm" variant={mode === "range" ? "default" : "ghost"} className="h-8 text-xs" onClick={() => setMode("range")}>
                  Flere dage
                </Button>
              </div>
              <div className="mt-3 overflow-hidden rounded-md border border-border bg-background">
                {mode === "range" ? (
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={(selection) => selection && setRange(selection)}
                    defaultMonth={range.from}
                    locale={da}
                    className="pointer-events-auto mx-auto p-2"
                    components={calendarComponents}
                    initialFocus
                  />
                ) : (
                  <Calendar
                    mode="single"
                    selected={range.from}
                    onSelect={(selection) => selection && setRange({ from: selection, to: selection })}
                    defaultMonth={range.from}
                    locale={da}
                    className="pointer-events-auto mx-auto p-2"
                    components={calendarComponents}
                    initialFocus
                  />
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Tallet viser antal ruter på dagen</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={chooseToday}>I dag</Button>
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={chooseWeek}>Hele ugen</Button>
              </div>
            </section>

            <section className="mt-5 border-t border-border pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-foreground">Indhold i print</h3>
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-1">
                {optionRows.map((item) => (
                  <Label key={item.key} htmlFor={`print-option-${item.key}`} className="flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-xs font-normal text-foreground transition-colors hover:bg-secondary">
                    {item.label}
                    <Checkbox id={`print-option-${item.key}`} checked={options[item.key]} onCheckedChange={() => toggleOption(item.key)} />
                  </Label>
                ))}
              </div>
            </section>
          </aside>

          <main className={cn("min-h-0 overflow-y-auto overscroll-contain bg-secondary/30 p-3 sm:p-5 lg:block print:block print:overflow-visible", mobileView !== "preview" && "hidden")}>
            <div className="mx-auto mb-3 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
              <span className="font-medium capitalize text-foreground">{periodLabel}</span>
              <span className="tabular-nums text-muted-foreground">
                {selectedDates.length} {selectedDates.length === 1 ? "dag" : "dage"} · {selectedRoutes.length} {selectedRoutes.length === 1 ? "rute" : "ruter"} · {totalStops} stop
              </span>
            </div>

            <div data-print-routes-root className="mx-auto max-w-[210mm] space-y-4 print:max-w-none print:space-y-0">
              {[...routesByDate.entries()].map(([date, dayRoutes]) => (
                <section key={date} data-print-day className={cn("overflow-hidden rounded-md border border-border bg-background shadow-sm print:rounded-none print:border-0 print:shadow-none", dayRoutes.length === 0 && "print:hidden")}>
                  <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 print:px-0 print:pt-0">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{dayRoutes.some(route => route.receipt) ? "Arbejdskvittering" : "Ruteplan"}</p>
                      <h1 className="mt-1 text-lg font-semibold capitalize text-foreground">{dateLabel(date)}</h1>
                      {businessName && <p className="mt-0.5 text-xs text-muted-foreground">{businessName}</p>}
                    </div>
                    <div className="text-right text-xs tabular-nums text-muted-foreground">
                      <p className="font-semibold text-foreground">{dayRoutes.length} {dayRoutes.length === 1 ? "rute" : "ruter"}</p>
                      <p>{dayRoutes.reduce((sum, route) => sum + route.stops.length, 0)} stop</p>
                    </div>
                  </header>

                  {dayRoutes.length === 0 ? (
                    <div className="px-4 py-12 text-center sm:px-6">
                      <CalendarDays className="mx-auto h-5 w-5 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium text-foreground">Ingen ruter denne dag</p>
                      <p className="mt-1 text-xs text-muted-foreground">Datoen kommer ikke med som en tom side ved print.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {dayRoutes.map((route) => (
                        <article key={`${date}-${route.id}`} data-print-route className={cn("px-4 sm:px-6 print:px-0", options.compact ? "py-3" : "py-5")}>
                          <div className="flex min-w-0 items-start gap-3">
                            {options.routeColor && (
                              <span className="mt-1 h-3 w-3 shrink-0 rounded-sm border border-border" style={{ backgroundColor: route.color ?? "hsl(var(--muted))" }} />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                                <div className="min-w-0">
                                  <h2 className="break-words text-sm font-semibold text-foreground">{route.name}</h2>
                                  {options.employee && route.employeeNames && route.employeeNames.length > 0 && (
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3 w-3 shrink-0" />{route.employeeNames.join(", ")}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                  {options.distance && route.distanceKm != null && <span className="flex items-center gap-1"><RouteIcon className="h-3 w-3" />{route.distanceKm.toFixed(1)} km</span>}
                                </div>
                              </div>
                              {options.startAddress && route.startAddress && (
                                <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span><span className="font-medium text-foreground">Start:</span> {route.startAddress}</span></p>
                              )}

                              {route.receipt && <section className="mt-3 border-y border-border py-3" aria-label="Arbejdskvittering">
                                <h3 className="text-sm font-semibold">Arbejdskvittering</h3>
                                <p className="mt-1 text-xs text-muted-foreground">{route.stops.filter(s => s.completedAt).length} af {route.stops.length} stop udført · {route.receipt.end ? "Afsluttet" : "Ikke afsluttet"}</p>
                                {route.receipt.error ? <p role="alert" className="mt-2 text-sm text-destructive">Tider eller beløb kunne ikke hentes. Luk og prøv igen.</p> : route.receipt.loading ? <p role="status" className="mt-2 text-sm">Henter tider og beløb…</p> : <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                                  <div><dt className="text-muted-foreground">Start</dt><dd className="mt-1 font-semibold">{route.receipt.start ? formatClockTime(route.receipt.start) : "Ikke registreret"}</dd></div>
                                  <div><dt className="text-muted-foreground">Slut</dt><dd className="mt-1 font-semibold">{route.receipt.end ? formatClockTime(route.receipt.end) : "Ikke afsluttet"}</dd></div>
                                  <div><dt className="text-muted-foreground">Køretid · ca.</dt><dd className="mt-1 font-semibold">{route.receipt.driveEstimateSeconds == null ? "Ikke registreret" : formatRunDuration(route.receipt.driveEstimateSeconds)}</dd></div>
                                  <div><dt className="text-muted-foreground">Tid hos kunder</dt><dd className="mt-1 font-semibold">{formatRunDuration(route.receipt.customerSeconds)}</dd></div>
                                  <div><dt className="text-muted-foreground">Min indtjening</dt><dd className="mt-1 font-semibold">{route.receipt.earnings == null ? "Ikke tilgængelig" : formatKr(route.receipt.earnings)}</dd></div>
                                </dl>}
                                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Køretid er beregnet tid uden kundearbejde og kan indeholde pauser. Beløbet er din andel, ikke en betalingskvittering til kunden.</p>
                              </section>}

                              <ol className={cn("mt-3 divide-y divide-border border-t border-border", options.compact && "mt-2")}>
                                {route.stops.map((stop, index) => {
                                  return (
                                    <li key={stop.id ?? `${route.id}-${index}`} className={cn("grid grid-cols-[24px_minmax(0,1fr)] gap-2.5", options.compact ? "py-2" : "py-3")}>
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold tabular-nums text-background">{index + 1}</span>
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                          <p className="break-words text-xs font-semibold text-foreground">{stop.customerName}</p>
                                        </div>
                                        <div className="mt-1 grid gap-1 text-[11px] text-muted-foreground">
                                          {route.receipt && <p className="flex flex-wrap gap-x-3 gap-y-1"><span>Ankommet: {stop.arrivedAt ? formatClockTime(stop.arrivedAt) : "Ikke registreret"}</span><span>Udført: {stop.completedAt ? formatClockTime(new Date(stop.completedAt).getTime()) : "Nej"}</span>{stop.earnings != null && <span>Min andel: {formatKr(stop.earnings)}</span>}</p>}
                                          {options.address && stop.address && <p className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span className="break-words">{stop.address}</span></p>}
                                          {options.phone && stop.phone && <p className="tabular-nums">Tlf. {stop.phone}</p>}
                                        </div>
                                        {options.service && stop.serviceSummary && (
                                          <div className="mt-2 border-l-2 border-accent bg-secondary/30 px-2 py-1.5 text-[11px]">
                                            <p className="font-medium text-foreground">{stop.serviceSummary}</p>
                                          </div>
                                        )}
                                        {options.notes && stop.notes && (
                                          <p className="mt-2 flex items-start gap-1.5 text-[11px] italic text-muted-foreground"><FileText className="mt-0.5 h-3 w-3 shrink-0" />{stop.notes}</p>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ol>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  {dayRoutes.length > 0 && (
                    <footer className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground sm:px-6 print:px-0">
                      <span>Udskrevet {format(new Date(), "d. MMMM yyyy", { locale: da })}</span>
                      <span className="font-semibold text-foreground">Serviceydere</span>
                    </footer>
                  )}
                </section>
              ))}
            </div>
          </main>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
          <span className="min-w-0 text-xs text-muted-foreground">{selectedRoutes.length} {selectedRoutes.length === 1 ? "rute" : "ruter"} · {totalStops} stop</span>
          <Button className="h-11 shrink-0 gap-2" onClick={() => window.print()} disabled={printDisabled}><Printer className="h-4 w-4" />Print / PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}