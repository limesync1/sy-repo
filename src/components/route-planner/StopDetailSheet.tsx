import { useMemo, useState, useEffect } from "react";
import { useOrderForStop, useUpdateStop, useDeleteStop, useUpdateStopStatus, type RouteStop } from "@/hooks/useRoutes";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MapPin, Phone, Mail, Clock, Navigation, Trash2, Save, CheckCircle2,
  AlertCircle, Calendar as CalendarIcon, Banknote, FileText, Repeat, PauseCircle, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { INTERVAL_LABELS } from "@/types/service";

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
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!stop) return;
    setDuration(stop.duration_minutes || 30);
    setWinStart(stop.time_window_start?.slice(0, 5) || "");
    setWinEnd(stop.time_window_end?.slice(0, 5) || "");
    setNotes(stop.notes || "");
  }, [stop?.id]);

  const items = useMemo(() => (order as any)?.order_items || [], [order]);
  const totalAmount = Number((order as any)?.total_amount || 0);
  const subscriptions: any[] = (order as any)?.subscriptions || [];
  const business = (order as any)?.businesses;

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

  const handleDeleteConfirmed = () => {
    deleteStop.mutate(stop.id, {
      onSuccess: () => toast.success("Stop fjernet fra ruten"),
    });
    setConfirmDelete(false);
    onOpenChange(false);
  };

  const statusBadge = () => {
    switch (stop.status) {
      case "completed": return <span><Badge className="bg-green-600">Færdig</Badge></span>;
      case "in_progress": return <span><Badge className="bg-blue-600">I gang</Badge></span>;
      case "skipped": return <span><Badge variant="outline" className="text-orange-600 border-orange-300">Sprunget over</Badge></span>;
      default: return <span><Badge variant="secondary">Afventer</Badge></span>;
    }
  };

  const customerEmail = (order as any)?.customer_email;
  const orderStatus = (order as any)?.status;
  const orderNotes = (order as any)?.notes as string | null;
  const orderCreatedAt = (order as any)?.created_at;
  const preferredDate = (order as any)?.preferred_date;
  const preferredStart = (order as any)?.preferred_time_start?.slice(0, 5);
  const preferredEnd = (order as any)?.preferred_time_end?.slice(0, 5);
  const hasCoords = stop.latitude != null && stop.longitude != null;

  // Detect any active subscription (recurring) and any paused state
  const activeSub = subscriptions.find((s) => s.status === "active");
  const pausedSub = subscriptions.find((s) => s.status === "paused");
  const recurringInterval = activeSub?.interval || pausedSub?.interval || (
    items.find((i: any) => i.details?.interval && i.details.interval !== "engangskøb")?.details?.interval
  );

  return (
    <>
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
                <SheetDescription className="text-left text-xs">
                  {business?.name ? <>Bestilling hos <strong>{business.name}</strong></> : "Detaljer for dette stop"}
                </SheetDescription>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {statusBadge()}
                  {pausedSub && (
                    <span>
                      <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1 text-[10px]">
                        <PauseCircle className="h-2.5 w-2.5" />Abonnement på pause
                      </Badge>
                    </span>
                  )}
                  {recurringInterval && recurringInterval !== "engangskøb" && (
                    <span>
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Repeat className="h-2.5 w-2.5" />
                        {INTERVAL_LABELS[recurringInterval] || recurringInterval}
                      </Badge>
                    </span>
                  )}
                  {orderStatus && (
                    <span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        Ordre: {orderStatus}
                      </Badge>
                    </span>
                  )}
                  {!hasCoords && (
                    <span>
                      <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1 text-[10px]">
                        <AlertCircle className="h-2.5 w-2.5" />Mangler GPS
                      </Badge>
                    </span>
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
                {stop.customer_phone ? (
                  <Button asChild variant="outline" className="gap-1.5 h-9">
                    <a href={`tel:${stop.customer_phone}`}><Phone className="h-4 w-4" />Ring</a>
                  </Button>
                ) : (
                  <Button variant="outline" className="gap-1.5 h-9" disabled>
                    <Phone className="h-4 w-4" />Intet tlf.
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
                      {items.map((item: any, i: number) => {
                        const d = item.details || {};
                        const stepDetails: any[] = Array.isArray(d.stepDetails) ? d.stepDetails : [];
                        const itemInterval = d.interval && d.interval !== "engangskøb" ? d.interval : null;
                        const itemDescription = typeof d.description === "string" ? d.description : null;
                        const svc = item.services || {};
                        const serviceDescription = svc.description || null;
                        const category = [svc.service_category, svc.subcategory].filter(Boolean).join(" · ");
                        const pricingLabel =
                          svc.pricing_type === "timepris" ? "Timepris" :
                          svc.pricing_type === "prisberegner" ? "Prisberegner" :
                          svc.pricing_type === "fast_pris" ? "Fast pris" : null;
                        return (
                          <div key={i} className="px-3 py-2.5">
                            <div className="flex items-start gap-3">
                              {svc.image_url && (
                                <img
                                  src={svc.image_url}
                                  alt={item.service_name}
                                  className="h-12 w-12 rounded-md object-cover border shrink-0"
                                  loading="lazy"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{item.service_name}</p>
                                    {category && (
                                      <p className="text-[11px] text-muted-foreground mt-0.5">{category}</p>
                                    )}
                                  </div>
                                  <span className="text-sm font-semibold shrink-0">{Math.round(Number(item.total_price))} kr</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {pricingLabel && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{pricingLabel}</Badge>
                                  )}
                                  {item.quantity > 1 && (
                                    <span className="text-[11px] text-muted-foreground">{item.quantity} × {Math.round(Number(item.unit_price))} kr</span>
                                  )}
                                  {itemInterval && (
                                    <Badge variant="secondary" className="text-[10px] gap-0.5 h-4 px-1.5">
                                      <Repeat className="h-2.5 w-2.5" />
                                      {INTERVAL_LABELS[itemInterval] || itemInterval}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Service description from catalog */}
                            {serviceDescription && (
                              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{serviceDescription}</p>
                            )}

                            {/* Calculator step breakdown */}
                            {stepDetails.length > 0 && (
                              <div className="mt-2 rounded-md bg-secondary/40 divide-y divide-border/50">
                                {stepDetails.map((sd: any, si: number) => (
                                  <div key={si} className="flex justify-between px-2.5 py-1 text-[11px]">
                                    <span className="text-muted-foreground">
                                      {sd.label}: <span className="text-foreground/80">{sd.value}{sd.unit ? ` ${sd.unit}` : ""}</span>
                                    </span>
                                    {typeof sd.subtotal === "number" && (
                                      <span className="font-medium text-foreground">{sd.subtotal} kr</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Free-text description from cart line */}
                            {itemDescription && stepDetails.length === 0 && (
                              <p className="text-[11px] text-muted-foreground mt-1.5 italic">{itemDescription}</p>
                            )}
                          </div>
                        );
                      })}
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

              {/* Subscription details (if recurring) */}
              {(activeSub || pausedSub) && (
                <>
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                      <Repeat className="h-3 w-3" />Abonnement
                    </h3>
                    <div className={`rounded-lg border px-3 py-2 text-sm space-y-1 ${pausedSub ? "bg-orange-50 border-orange-200" : "bg-secondary/40"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium">{pausedSub ? "På pause" : "Aktiv"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Interval</span>
                        <span className="font-medium">
                          {INTERVAL_LABELS[(activeSub || pausedSub)!.interval] || (activeSub || pausedSub)!.interval}
                        </span>
                      </div>
                      {(activeSub || pausedSub)!.next_service_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Næste besøg</span>
                          <span className="font-medium">
                            {format(parseISO((activeSub || pausedSub)!.next_service_date), "d. MMM yyyy", { locale: da })}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                  <Separator />
                </>
              )}

              {/* Customer's notes from order */}
              {orderNotes && (
                <>
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" />Note fra kunden
                    </h3>
                    <p className="text-sm bg-secondary/50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                      {orderNotes}
                    </p>
                  </section>
                  <Separator />
                </>
              )}

              {orderCreatedAt && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />Bestilt {format(parseISO(orderCreatedAt), "d. MMM yyyy 'kl.' HH:mm", { locale: da })}
                </p>
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

              {isLoading && <p className="text-xs text-muted-foreground italic">Indlæser ordredetaljer...</p>}
            </div>
          </ScrollArea>

          {/* Footer actions */}
          <div className="border-t px-5 py-3 flex items-center gap-2 shrink-0 bg-background">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />Fjern
            </Button>
            <Button onClick={handleSave} className="ml-auto gap-1.5" disabled={updateStop.isPending}>
              <Save className="h-4 w-4" />Gem
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern stop fra ruten?</AlertDialogTitle>
            <AlertDialogDescription>
              Stoppet for <strong>{stop.customer_name}</strong> bliver fjernet fra denne rute og ryger
              tilbage i opgavepoolen, så du kan planlægge det igen senere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Fjern stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
