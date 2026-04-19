import { useMemo, useState, useEffect } from "react";
import { useOrderForStop, useUpdateStop, useDeleteStop, useUpdateStopStatus, type RouteStop } from "@/hooks/useRoutes";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin, Phone, Mail, Clock, Navigation, Trash2, Save, CheckCircle2,
  AlertCircle, Calendar as CalendarIcon, Banknote, FileText, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";

type Props = {
  stop: RouteStop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeColor?: string;
  sequenceLabel?: number;
};

export const StopDetailSheet = ({ stop, open, onOpenChange, routeColor, sequenceLabel }: Props) => {
  const { data: order, isLoading } = useOrderForStop(stop?.order_id);
  const updateStop = useUpdateStop();
  const updateStatus = useUpdateStopStatus();
  const deleteStop = useDeleteStop();

  const [duration, setDuration] = useState<number>(30);
  const [winStart, setWinStart] = useState<string>("");
  const [winEnd, setWinEnd] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!stop) return;
    setDuration(stop.duration_minutes || 30);
    setWinStart(stop.time_window_start?.slice(0, 5) || "");
    setWinEnd(stop.time_window_end?.slice(0, 5) || "");
    setNotes(stop.notes || "");
  }, [stop?.id]);

  const items = useMemo(() => (order as any)?.order_items || [], [order]);
  const totalAmount = Number((order as any)?.total_amount || 0);

  if (!stop) return null;

  const handleNavigate = () => {
    const q = stop.address || (stop.latitude && stop.longitude ? `${stop.latitude},${stop.longitude}` : stop.customer_name || "");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`, "_blank");
  };

  const handleSave = async () => {
    await updateStop.mutateAsync({
      id: stop.id,
      duration_minutes: duration,
      time_window_start: winStart || null,
      time_window_end: winEnd || null,
      notes: notes || null,
    } as any);
    toast.success("Ændringer gemt");
  };

  const handleStatus = (status: string) => {
    updateStatus.mutate({ id: stop.id, status });
  };

  const handleDelete = () => {
    if (!confirm("Fjern dette stop fra ruten?")) return;
    deleteStop.mutate(stop.id);
    onOpenChange(false);
  };

  const statusBadge = () => {
    switch (stop.status) {
      case "completed": return <Badge className="bg-green-600">Færdig</Badge>;
      case "in_progress": return <Badge className="bg-blue-600">I gang</Badge>;
      case "skipped": return <Badge variant="outline" className="text-orange-600 border-orange-300">Sprunget over</Badge>;
      default: return <Badge variant="secondary">Afventer</Badge>;
    }
  };

  const customerEmail = (order as any)?.customer_email;
  const preferredDate = (order as any)?.preferred_date;
  const preferredStart = (order as any)?.preferred_time_start?.slice(0, 5);
  const preferredEnd = (order as any)?.preferred_time_end?.slice(0, 5);
  const hasCoords = stop.latitude != null && stop.longitude != null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-start gap-3">
            {sequenceLabel && (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold shrink-0"
                style={{ background: routeColor || "hsl(var(--primary))" }}
              >
                {sequenceLabel}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left text-base">{stop.customer_name || "Stop"}</SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {statusBadge()}
                {!hasCoords && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1 text-[10px]">
                    <AlertCircle className="h-2.5 w-2.5" />Mangler GPS
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">
            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleNavigate} variant="outline" className="gap-1.5 h-9">
                <Navigation className="h-4 w-4" />Naviger
              </Button>
              {stop.customer_phone && (
                <Button asChild variant="outline" className="gap-1.5 h-9">
                  <a href={`tel:${stop.customer_phone}`}><Phone className="h-4 w-4" />Ring</a>
                </Button>
              )}
            </div>

            {/* Customer */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Kunde</h3>
              <div className="space-y-1.5 text-sm">
                {stop.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span>{stop.address}</span>
                  </div>
                )}
                {stop.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${stop.customer_phone}`} className="hover:underline">{stop.customer_phone}</a>
                  </div>
                )}
                {customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${customerEmail}`} className="hover:underline truncate">{customerEmail}</a>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Customer's preferred time */}
            {(preferredDate || preferredStart) && (
              <>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Kundens ønske</h3>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 text-amber-900">
                      <CalendarIcon className="h-4 w-4 shrink-0" />
                      {preferredDate && (
                        <span className="font-medium">
                          {format(parseISO(preferredDate), "EEE d. MMM", { locale: da })}
                        </span>
                      )}
                      {preferredStart && (
                        <span className="text-amber-700">
                          {preferredStart}{preferredEnd ? ` – ${preferredEnd}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* Order items */}
            {items.length > 0 && (
              <>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bestilte ydelser</h3>
                  <div className="rounded-lg border divide-y">
                    {items.map((item: any, i: number) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.service_name}</p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">{item.quantity} × {Math.round(Number(item.unit_price))} kr</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold shrink-0">{Math.round(Number(item.total_price))} kr</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Banknote className="h-3.5 w-3.5" />Total
                    </span>
                    <span className="text-base font-bold">{Math.round(totalAmount)} kr</span>
                  </div>
                </section>
                <Separator />
              </>
            )}

            {/* Customer's notes from order */}
            {(order as any)?.notes && (
              <>
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" />Note fra kunden
                  </h3>
                  <p className="text-sm bg-secondary/50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                    {(order as any).notes}
                  </p>
                </section>
                <Separator />
              </>
            )}

            {/* Planning */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Planlægning</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Estimeret varighed (min)</label>
                  <Input
                    type="number"
                    min={5}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tidsvindue (kunden skal være hjemme)</label>
                  <div className="flex items-center gap-2">
                    <Input type="time" value={winStart} onChange={(e) => setWinStart(e.target.value)} className="h-9" />
                    <span className="text-muted-foreground">–</span>
                    <Input type="time" value={winEnd} onChange={(e) => setWinEnd(e.target.value)} className="h-9" />
                  </div>
                </div>
                {stop.planned_arrival && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
                    <Clock className="h-3 w-3" />
                    Planlagt ankomst: <strong className="text-foreground">{format(parseISO(stop.planned_arrival), "HH:mm")}</strong>
                    {stop.distance_to_next_km != null && stop.distance_to_next_km > 0 && (
                      <span className="ml-auto">→ næste: {stop.distance_to_next_km.toFixed(1)} km</span>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Intern note (synlig for medarbejderen)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Fx 'Brug bagindgangen', 'Hund i haven'..."
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Status changes */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant={stop.status === "pending" ? "default" : "outline"} onClick={() => handleStatus("pending")}>Afventer</Button>
                <Button size="sm" variant={stop.status === "in_progress" ? "default" : "outline"} onClick={() => handleStatus("in_progress")}>I gang</Button>
                <Button size="sm" variant={stop.status === "completed" ? "default" : "outline"} className={stop.status === "completed" ? "bg-green-600 hover:bg-green-700" : ""} onClick={() => handleStatus("completed")}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Færdig
                </Button>
              </div>
            </section>

            {isLoading && <p className="text-xs text-muted-foreground italic">Indlæser ordredetaljer...</p>}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="border-t px-5 py-3 flex items-center gap-2 shrink-0 bg-background">
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4 mr-1" />Fjern
          </Button>
          <Button onClick={handleSave} className="ml-auto gap-1.5" disabled={updateStop.isPending}>
            <Save className="h-4 w-4" />Gem
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
