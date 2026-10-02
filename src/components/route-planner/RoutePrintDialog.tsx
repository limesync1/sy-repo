import { useEffect, useMemo, useState } from "react";
import { eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { da } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  CalendarDays,
  Clock3,
  FileText,
  MapPin,
  Printer,
  Route as RouteIcon,
  Settings2,
  Users,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type PrintRoute = {
  id: string;
  date: string;
  name: string;
  color?: string | null;
  employeeNames?: string[];
  startAddress?: string | null;
  distanceKm?: number | null;
  plannedStartTime?: string | null;
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
  }[];
};

type PrintOptions = {
  employee: boolean;
  phone: boolean;
  address: boolean;
  service: boolean;
  notes: boolean;
  times: boolean;
  duration: boolean;
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
};

const STORAGE_KEY = "route-print-options-v2";
const DEFAULT_OPTIONS: PrintOptions = {
  employee: true,
  phone: true,
  address: true,
  service: true,
  notes: true,
  times: true,
  duration: true,
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
  { key: "times", label: "Planlagte tider" },
  { key: "duration", label: "Varighed" },
  { key: "startAddress", label: "Startadresse" },
  { key: "distance", label: "Rutens distance" },
  { key: "routeColor", label: "Rutefarve" },
  { key: "compact", label: "Kompakt visning" },
];

const dateLabel = (date: string) => format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da });
const shortDateLabel = (date: string) => format(parseISO(date), "d. MMM", { locale: da });
const timeLabel = (value?: string | null) => value?.slice(0, 5) ?? null;

export default function RoutePrintDialog({ open, onOpenChange, initialDate, routes, businessName }: Props) {
  const initial = parseISO(initialDate);
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

  const totalStops = selectedRoutes.reduce((sum, route) => sum + route.stops.length, 0);
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
      <DialogContent className="planner-overlay flex h-[min(92vh,880px)] w-[calc(100vw-1rem)] max-w-6xl flex-col overflow-hidden rounded-md p-0">
        <div className="planner-overlay-header flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 pr-14 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">Print ruter</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">Vælg periode og indhold, før du printer eller gemmer som PDF.</p>
          </div>
          <Button size="sm" onClick={() => window.print()} disabled={selectedRoutes.length === 0} className="shrink-0 gap-2">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print / Gem som PDF</span>
            <span className="sm:hidden">Print</span>
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="overflow-y-auto border-b border-border bg-secondary/20 p-4 lg:border-b-0 lg:border-r">
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
                    initialFocus
                  />
                )}
              </div>
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

          <main className="min-h-0 overflow-y-auto bg-secondary/30 p-3 sm:p-5">
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
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Ruteplan</p>
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
                                  {options.times && route.plannedStartTime && <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />Start {timeLabel(route.plannedStartTime)}</span>}
                                </div>
                              </div>
                              {options.startAddress && route.startAddress && (
                                <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span><span className="font-medium text-foreground">Start:</span> {route.startAddress}</span></p>
                              )}

                              <ol className={cn("mt-3 divide-y divide-border border-t border-border", options.compact && "mt-2")}>
                                {route.stops.map((stop, index) => {
                                  const arrival = timeLabel(stop.plannedArrival);
                                  const departure = timeLabel(stop.plannedDeparture);
                                  return (
                                    <li key={stop.id ?? `${route.id}-${index}`} className={cn("grid grid-cols-[24px_minmax(0,1fr)] gap-2.5", options.compact ? "py-2" : "py-3")}>
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold tabular-nums text-background">{index + 1}</span>
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                          <p className="break-words text-xs font-semibold text-foreground">{stop.customerName}</p>
                                          <div className="flex flex-wrap gap-x-2 text-[10px] tabular-nums text-muted-foreground">
                                            {options.times && arrival && <span>{arrival}{departure ? `–${departure}` : ""}</span>}
                                            {options.duration && stop.durationMinutes != null && <span>{stop.durationMinutes} min.</span>}
                                          </div>
                                        </div>
                                        <div className="mt-1 grid gap-1 text-[11px] text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  );
}