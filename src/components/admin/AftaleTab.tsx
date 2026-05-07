import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrders, useServices, useBusinessSubscriptions } from "@/hooks/useDatabase";
import CreateManualOrderDialog from "@/components/route-planner/CreateManualOrderDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingCart, Pencil, Minus, Plus, Check, X, MessageSquare,
  ChevronDown, ChevronUp, Clock, Mail, Phone, ArrowRight,
  CheckCircle2, XCircle, RefreshCw, CalendarClock,
  Play, Pause, Search, Route as RouteIcon, MapPin, Plus as PlusIcon,
  GripVertical, Loader2, Tag, Palette, Trash2, ArrowUpDown, AlertCircle,
  Filter as FilterIcon, Inbox, Hourglass, ListChecks,
} from "lucide-react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  pointerWithin, useDraggable, useDroppable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { INTERVAL_LABELS } from "@/types/service";
import { EmptyState, PageHeader, PrimaryButton } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { useRoutesForRange, useStopsForRoutes, useAddStop, useCreateRoute, useDeleteRoute } from "@/hooks/useRoutes";
import { ROUTE_COLORS, ROUTE_COLOR_PALETTE, pickAvailableColor } from "@/components/route-planner/RouteEditSheet";
import { DatePickerField } from "@/components/route-planner/DatePickerField";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "@/components/route-planner/SheetSection";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  buildPricingSnapshot,
  getSmartStep,
  roundPrice,
  type PricingSnapshot,
  type ServiceStepDetail,
} from "@/lib/service-pricing";
import { relativeFromNow } from "@/lib/relative-time";
import type { Service, CalculatorStep } from "@/hooks/useDatabase";
import InvoiceActionsMenu from "@/components/admin/InvoiceActionsMenu";
import OrderTimeline from "@/components/admin/OrderTimeline";
import NextStepCard from "@/components/admin/NextStepCard";

/* ─── Types ─── */
type BusinessService = Service & { calculator_steps?: CalculatorStep[] };

type AdjustmentStep = Required<Pick<ServiceStepDetail, "label" | "value" | "unit" | "subtotal">> & {
  id: string;
  price_per_unit: number;
  min_value: number;
  max_value: number;
  default_value: number;
  sort_order: number;
};

type AdjustmentItem = {
  service_id?: string | null;
  service_name: string;
  pricing_type: PricingSnapshot["pricing_type"];
  unit_price: number;
  quantity: number;
  total_price: number;
  details: {
    description?: string;
    interval?: string;
    pricingSnapshot: PricingSnapshot;
    stepDetails?: AdjustmentStep[];
  };
};

/* ─── Helpers ─── */
const parseNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizePricingSnapshot = (rawSnapshot: any, service?: BusinessService, item?: any): PricingSnapshot => {
  const liveSnapshot = service ? buildPricingSnapshot(service) : undefined;
  const rawSteps = Array.isArray(rawSnapshot?.calculator_steps) && rawSnapshot.calculator_steps.length > 0
    ? rawSnapshot.calculator_steps
    : liveSnapshot?.calculator_steps || [];

  return {
    pricing_type: (rawSnapshot?.pricing_type || liveSnapshot?.pricing_type || (item?.details?.stepDetails?.length ? "prisberegner" : "fast_pris")) as PricingSnapshot["pricing_type"],
    base_price: parseNumber(rawSnapshot?.base_price, liveSnapshot?.base_price ?? item?.unit_price ?? item?.total_price ?? 0),
    unit: rawSnapshot?.unit ?? liveSnapshot?.unit ?? service?.unit ?? null,
    interval_options: Array.from(new Set([
      ...(Array.isArray(rawSnapshot?.interval_options) ? rawSnapshot.interval_options : liveSnapshot?.interval_options || ["engangskøb"]),
      item?.details?.interval || "engangskøb",
    ].filter(Boolean))),
    calculator_steps: rawSteps
      .map((step: any, index: number) => ({
        id: String(step.id ?? `step-${index}`),
        label: step.label ?? `Trin ${index + 1}`,
        unit: step.unit ?? service?.unit ?? "stk",
        price_per_unit: parseNumber(step.price_per_unit, 0),
        min_value: parseNumber(step.min_value, 0),
        max_value: parseNumber(step.max_value, Math.max(parseNumber(step.default_value, 0), 100)),
        default_value: parseNumber(step.default_value, parseNumber(step.min_value, 0)),
        sort_order: parseNumber(step.sort_order, index),
      }))
      .sort((a: any, b: any) => a.sort_order - b.sort_order),
  };
};

const buildAdjustmentItem = (item: any, service?: BusinessService): AdjustmentItem => {
  const snapshot = normalizePricingSnapshot(item.details?.pricingSnapshot, service, item);
  const storedSteps = Array.isArray(item.details?.stepDetails) ? item.details.stepDetails : [];
  let stepDetails: AdjustmentStep[] = [];

  if (snapshot.pricing_type === "timepris") {
    const firstStep = storedSteps[0];
    const pricePerUnit = parseNumber(firstStep?.price_per_unit, snapshot.base_price || 0);
    const derivedValue = parseNumber(
      firstStep?.value,
      pricePerUnit > 0 ? roundPrice(parseNumber(item.total_price, 0) / pricePerUnit) : 1,
    ) || 1;

    stepDetails = [{
      id: String(firstStep?.id ?? "hours"),
      label: firstStep?.label ?? "Timer",
      unit: firstStep?.unit ?? snapshot.unit ?? "timer",
      value: derivedValue,
      price_per_unit: pricePerUnit,
      subtotal: roundPrice(firstStep?.subtotal ?? derivedValue * pricePerUnit),
      min_value: parseNumber(firstStep?.min_value, 0.5),
      max_value: parseNumber(firstStep?.max_value, 24),
      default_value: parseNumber(firstStep?.default_value, derivedValue),
      sort_order: 0,
    }];
  }

  if (snapshot.pricing_type === "prisberegner") {
    const sourceSteps = snapshot.calculator_steps.length > 0
      ? snapshot.calculator_steps
      : storedSteps.map((step: any, index: number) => ({
          id: String(step.id ?? `step-${index}`),
          label: step.label ?? `Trin ${index + 1}`,
          unit: step.unit ?? "stk",
          price_per_unit: parseNumber(step.price_per_unit, 0),
          min_value: parseNumber(step.min_value, 0),
          max_value: parseNumber(step.max_value, Math.max(parseNumber(step.value, 0), 100)),
          default_value: parseNumber(step.default_value, parseNumber(step.value, 0)),
          sort_order: parseNumber(step.sort_order, index),
        }));

    stepDetails = sourceSteps.map((config: any, index: number) => {
      const stored = storedSteps.find((s: any) => s.id === config.id) ?? storedSteps.find((s: any) => s.label === config.label);
      const value = parseNumber(stored?.value, config.default_value);
      const pricePerUnit = parseNumber(stored?.price_per_unit, config.price_per_unit);
      return {
        id: String(config.id ?? `step-${index}`),
        label: config.label,
        unit: stored?.unit ?? config.unit,
        value,
        price_per_unit: pricePerUnit,
        subtotal: roundPrice(stored?.subtotal ?? value * pricePerUnit),
        min_value: parseNumber(stored?.min_value, config.min_value),
        max_value: parseNumber(stored?.max_value, config.max_value),
        default_value: parseNumber(stored?.default_value, config.default_value),
        sort_order: parseNumber(stored?.sort_order, config.sort_order),
      };
    }).sort((a: AdjustmentStep, b: AdjustmentStep) => a.sort_order - b.sort_order);
  }

  const totalPrice = stepDetails.length > 0
    ? roundPrice(stepDetails.reduce((sum, step) => sum + step.subtotal, 0))
    : roundPrice(parseNumber(item.total_price, snapshot.base_price));

  return {
    service_id: item.service_id,
    service_name: item.service_name,
    pricing_type: snapshot.pricing_type,
    unit_price: roundPrice(parseNumber(item.unit_price, totalPrice)),
    quantity: parseNumber(item.quantity, 1),
    total_price: totalPrice,
    details: {
      description: item.details?.description,
      interval: item.details?.interval ?? "engangskøb",
      pricingSnapshot: snapshot,
      stepDetails,
    },
  };
};

/* ─── Status config ─── 
   The lifecycle:
   pending    → Ny bestilling, virksomheden skal svare (godkend/tilpas/afvis)
   confirmed  → Aftalt (enten direkte godkendt eller efter kundens accept af forslag)
   in_progress → Arbejdet er i gang
   completed  → Udført / afsluttet
   cancelled  → Annulleret
*/
const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; cls: string; dot: string }> = {
  pending:     { label: "Ny bestilling", icon: AlertCircle,   cls: "border-amber-300/60 bg-amber-50 text-amber-800",      dot: "bg-amber-500" },
  confirmed:   { label: "Aftalt",        icon: CheckCircle2,  cls: "border-blue-300/60 bg-blue-50 text-blue-800",         dot: "bg-blue-500" },
  in_progress: { label: "I gang",        icon: RefreshCw,     cls: "border-violet-300/60 bg-violet-50 text-violet-800",   dot: "bg-violet-500" },
  completed:   { label: "Udført",        icon: CheckCircle2,  cls: "border-success/30 bg-success/10 text-success",        dot: "bg-success" },
  cancelled:   { label: "Annulleret",    icon: XCircle,       cls: "border-border bg-secondary text-muted-foreground",    dot: "bg-muted-foreground" },
};

const PRICING_LABELS: Record<string, string> = {
  fast_pris: "Fast pris",
  timepris: "Timepris",
  prisberegner: "Prisberegner",
};

/* ─── Service category icons (samme system som Services-fanen) ─── */
const CATEGORY_ICONS: Record<string, string> = {
  "Rengøring": "🧹",
  "Håndværker": "🔨",
  "Flyttehjælp": "🚚",
  "Haveservice": "🌿",
  "Maler": "🎨",
  "VVS": "💧",
  "Elektriker": "⚡",
  "Sikkerhed": "🛡️",
};
const DEFAULT_CATEGORY_ICON = "🧰";

/* ─── Danske labels for rute- og stop-status ─── */
const STOP_STATUS_LABELS: Record<string, string> = {
  pending: "Afventer",
  planned: "Planlagt",
  in_progress: "I gang",
  arrived: "Ankommet",
  completed: "Udført",
  skipped: "Sprunget over",
  cancelled: "Annulleret",
};
const ROUTE_STATUS_LABELS: Record<string, string> = {
  draft: "Kladde",
  planned: "Planlagt",
  in_progress: "I gang",
  completed: "Afsluttet",
  cancelled: "Annulleret",
};
const formatStopStatus = (s?: string | null) => (s ? STOP_STATUS_LABELS[s] || s : "");
const formatRouteStatus = (s?: string | null) => (s ? ROUTE_STATUS_LABELS[s] || s : "");

/* ─── Drag & drop helpers (samme @dnd-kit setup som Ruteplanlæggeren) ─── */
const OrderDragHandle = ({ orderId, order }: { orderId: string; order: any }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `order-${orderId}`,
    data: { type: "order", orderId, order },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(e) => e.stopPropagation()}
      aria-label="Træk aftalen til en rute"
      title="Træk aftalen over til en rute"
      className={`flex h-9 w-5 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
};

const PoolRouteDropZone = ({
  routeId, children,
}: { routeId: string; children: (state: { isOver: boolean; isActive: boolean }) => React.ReactNode }) => {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `pool-route-${routeId}`,
    data: { type: "pool-route", routeId },
  });
  const isActive = !!active && active.data.current?.type === "order";
  return <div ref={setNodeRef}>{children({ isOver, isActive })}</div>;
};

/* ─── What can the business DO at each stage? ─── */
const getActions = (order: any): { canRespond: boolean; canProgress: boolean; nextStatus: string | null; nextLabel: string | null } => {
  const status = order.status;
  const bizResp = order.business_response;
  const custResp = order.customer_response;

  if (status === "pending" && !bizResp) {
    return { canRespond: true, canProgress: false, nextStatus: null, nextLabel: null };
  }
  if (status === "pending" && bizResp === "adjusted" && !custResp) {
    return { canRespond: false, canProgress: false, nextStatus: null, nextLabel: null };
  }
  if (status === "pending" && custResp === "rejected") {
    return { canRespond: true, canProgress: false, nextStatus: null, nextLabel: null };
  }
  if (status === "confirmed") {
    return { canRespond: false, canProgress: true, nextStatus: "in_progress", nextLabel: "Marker som i gang" };
  }
  if (status === "in_progress") {
    // For recurring: the button says "Udført & plan næste"
    const isRecurring = (order.order_items || []).some((item: any) => item.details?.interval && item.details.interval !== "engangskøb");
    return { canRespond: false, canProgress: true, nextStatus: "completed", nextLabel: isRecurring ? "Udført — plan næste" : "Marker som udført" };
  }
  return { canRespond: false, canProgress: false, nextStatus: null, nextLabel: null };
};

/* ─── Stepper Input ─── */
const StepperInput = ({
  value, onChange, min, max, unit,
}: {
  value: number; onChange: (v: number) => void; min: number; max: number; unit: string;
}) => {
  const step = getSmartStep(unit, min, max);
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));

  return (
    <div className="flex items-center gap-0">
      <button type="button" onClick={dec} disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input type="number" value={value}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(clampValue(v, min, max)); }}
        min={min} max={max} step={step}
        className="flex h-9 w-[5rem] items-center border-y border-border bg-card px-2 text-center text-sm font-semibold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" onClick={inc} disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30">
        <Plus className="h-3.5 w-3.5" />
      </button>
      <span className="ml-2 text-xs text-muted-foreground">{unit}</span>
    </div>
  );
};

/* ─── Customer Order Summary ─── */
const CustomerOrderSummary = ({ order }: { order: any }) => {
  const items = (order.order_items || []) as any[];
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Bestilte services</span>
      </div>
      {items.map((item: any) => (
        <div key={item.id} className="border-b border-border last:border-b-0 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-semibold text-foreground">{item.service_name}</span>
              {item.quantity > 1 && <span className="ml-1 text-xs text-muted-foreground">× {item.quantity}</span>}
              {item.details?.interval && item.details.interval !== "engangskøb" && (
                <span className="ml-2 inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                  {INTERVAL_LABELS[item.details.interval] || item.details.interval}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-foreground shrink-0">{item.total_price} kr</span>
          </div>
          {item.details?.stepDetails && (
            <div className="mt-2 space-y-1 pl-0.5">
              {(item.details.stepDetails as any[]).map((sd: any, i: number) => (
                <div key={i} className="flex justify-between text-xs text-muted-foreground">
                  <span>{sd.label}: <span className="font-medium text-foreground/80">{sd.value} {sd.unit}</span>
                    {sd.price_per_unit ? <span className="text-muted-foreground/60"> × {sd.price_per_unit} kr/{sd.unit}</span> : ""}
                  </span>
                  <span className="font-medium text-foreground/70">{sd.subtotal} kr</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="px-4 py-2.5 flex justify-between bg-muted/30 border-t border-border">
        <span className="text-sm font-bold text-foreground">I alt</span>
        <span className="text-sm font-bold text-foreground">{order.total_amount} kr</span>
      </div>
    </div>
  );
};

/* ─── Adjustment Editor ─── */
const AdjustmentEditor = ({
  orderId, items, onUpdateStep, onUpdateInterval, onUpdateFixedPrice,
}: {
  orderId: string;
  items: AdjustmentItem[];
  onUpdateStep: (orderId: string, itemIdx: number, stepIdx: number, field: string, value: number) => void;
  onUpdateInterval: (orderId: string, itemIdx: number, interval: string) => void;
  onUpdateFixedPrice: (orderId: string, itemIdx: number, price: number) => void;
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Pencil className="h-3.5 w-3.5" />
        <span>Rediger felterne præcis som kunden ser dem ved bestilling</span>
      </div>

      {items.map((item, itemIdx) => (
        <div key={itemIdx} className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="px-4 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{item.service_name}</h4>
                <span className="text-[11px] text-muted-foreground">{PRICING_LABELS[item.pricing_type]}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-foreground">{roundPrice(item.total_price)}</span>
                <span className="ml-1 text-xs text-muted-foreground">kr</span>
              </div>
            </div>
          </div>

          {item.pricing_type === "fast_pris" && (
            <div className="px-4 py-3">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Pris (kr)</label>
              <Input type="number" value={item.total_price} className="h-9 text-sm w-40"
                onChange={(e) => onUpdateFixedPrice(orderId, itemIdx, parseFloat(e.target.value) || 0)} />
            </div>
          )}

          {item.details?.stepDetails && item.details.stepDetails.length > 0 && (
            <div className="divide-y divide-border">
              {item.details.stepDetails.map((sd, stepIdx) => (
                <div key={stepIdx} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">{sd.label}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">({sd.price_per_unit} kr/{sd.unit})</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">{roundPrice(sd.subtotal)} kr</span>
                  </div>
                  <StepperInput
                    value={sd.value}
                    onChange={(v) => onUpdateStep(orderId, itemIdx, stepIdx, "value", v)}
                    min={sd.min_value}
                    max={sd.max_value}
                    unit={sd.unit}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Pris pr. {sd.unit}:</span>
                    <input type="number" value={sd.price_per_unit}
                      onChange={(e) => onUpdateStep(orderId, itemIdx, stepIdx, "price_per_unit", parseNumber(e.target.value, 0))}
                      className="h-7 w-20 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-muted-foreground">kr</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground/60">{sd.min_value}–{sd.max_value} {sd.unit}</p>
                </div>
              ))}
              <div className="flex items-center justify-between bg-secondary/40 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">I alt</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-foreground">{roundPrice(item.total_price)}</span>
                  <span className="text-sm text-muted-foreground">kr</span>
                </div>
              </div>
            </div>
          )}

          {(() => {
            const snapshot = item.details.pricingSnapshot;
            const options = snapshot.interval_options && snapshot.interval_options.length > 0
              ? Array.from(new Set([...(item.details.interval ? [item.details.interval] : []), ...snapshot.interval_options]))
              : ["engangskøb"];
            const show = options.length > 1 || (options.length === 1 && options[0] !== "engangskøb");
            if (!show) return null;
            return (
              <div className="border-t border-border px-4 py-3">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Interval</label>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((iv) => (
                    <button key={iv} type="button" onClick={() => onUpdateInterval(orderId, itemIdx, iv)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        item.details.interval === iv
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-accent/40"
                      }`}>
                      {INTERVAL_LABELS[iv] || iv}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
};

/* ─── Proposal status display ─── */
const ProposalStatusBanner = ({ order }: { order: any }) => {
  const bizResp = order.business_response;
  const custResp = order.customer_response;
  const status = order.status;

  // Don't show proposal banners for orders that have already progressed past pending
  if (status === "in_progress" || status === "completed" || status === "cancelled") return null;

  if (bizResp === "adjusted" && !custResp && status === "pending") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Clock className="h-4 w-4 text-amber-600 shrink-0 animate-pulse" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Afventer kundens svar på dit forslag</p>
          <p className="text-xs text-amber-700">Kunden kan godkende eller afvise dit tilpassede forslag.</p>
        </div>
      </div>
    );
  }

  if (bizResp === "adjusted" && custResp === "accepted") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-900">Kunden godkendte dit forslag</p>
          <p className="text-xs text-green-700">Aftalen er bekræftet til {order.adjusted_amount} kr. Du kan nu starte arbejdet.</p>
        </div>
      </div>
    );
  }

  if (bizResp === "adjusted" && custResp === "rejected") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
        <div>
          <p className="text-sm font-semibold text-destructive">Kunden afviste dit forslag</p>
          <p className="text-xs text-muted-foreground">Du kan sende et nyt forslag eller annullere aftalen.</p>
        </div>
      </div>
    );
  }

  return null;
};

/* ─── Adjustment details display ─── */
const AdjustmentDisplay = ({ order }: { order: any }) => {
  if (order.business_response !== "adjusted" || !order.adjusted_details) return null;
  const items = (order.adjusted_details as any)?.items || [];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dit tilpasningsforslag</span>
      </div>
      {items.map((item: any, idx: number) => (
        <div key={idx} className="border-b border-border/50 last:border-b-0 px-4 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-sm font-medium text-foreground">{item.service_name}</span>
              {item.details?.interval && item.details.interval !== "engangskøb" && (
                <span className="ml-2 text-[11px] text-accent">{INTERVAL_LABELS[item.details.interval] || item.details.interval}</span>
              )}
            </div>
            <span className="text-sm font-semibold text-foreground">{item.total_price} kr</span>
          </div>
          {item.details?.stepDetails?.map((sd: any, i: number) => (
            <div key={i} className="flex justify-between text-xs text-muted-foreground mt-0.5 pl-0.5">
              <span>{sd.label}: {sd.value} {sd.unit} × {sd.price_per_unit} kr/{sd.unit}</span>
              <span>{sd.subtotal} kr</span>
            </div>
          ))}
        </div>
      ))}
      <div className="px-4 py-2 flex justify-between bg-muted/30 border-t border-border">
        <span className="text-sm font-bold text-foreground">Tilpasset pris</span>
        <div className="text-right">
          <span className="text-sm font-bold text-foreground">{order.adjusted_amount} kr</span>
          {order.adjusted_amount !== order.total_amount && (
            <span className="ml-2 text-xs text-muted-foreground line-through">{order.total_amount} kr</span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Linked subscription info ─── */
const LinkedSubscriptionInfo = ({ orderId, subscriptions }: { orderId: string; subscriptions: any[] }) => {
  const linked = subscriptions.filter(s => s.order_id === orderId && s.status !== "cancelled");
  if (linked.length === 0) return null;

  return (
    <div className="space-y-2">
      {linked.map(sub => {
        const nextDate = sub.next_service_date ? new Date(sub.next_service_date) : null;
        const minsUntil = nextDate ? Math.round((nextDate.getTime() - Date.now()) / 60000) : null;
        const urgencyTone =
          minsUntil != null && minsUntil <= 60 * 24 * 2
            ? "text-destructive"
            : minsUntil != null && minsUntil <= 60 * 24 * 7
            ? "text-amber-600"
            : "text-accent";
        const profile = (sub as any).profiles;

        return (
          <div key={sub.id} className="rounded-xl border border-accent/20 bg-accent/5 overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-accent" />
                <div>
                  <span className="text-sm font-semibold text-foreground">{sub.service_name}</span>
                  <span className="ml-2 text-xs text-accent">{INTERVAL_LABELS[sub.interval] || sub.interval}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {sub.status === "paused" && (
                  <Badge variant="secondary" className="text-[11px]">
                    <Pause className="h-3 w-3 mr-1" /> På pause
                  </Badge>
                )}
                <span className="text-sm font-bold text-foreground">{sub.total_price} kr</span>
              </div>
            </div>
            {nextDate && sub.status === "active" && (
              <div className="border-t border-accent/10 px-4 py-2 flex items-center justify-between bg-accent/[0.03]">
                <span className="text-xs text-muted-foreground">Næste service:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {nextDate.toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  {minsUntil !== null && (
                    <span className={`text-[11px] font-bold ${urgencyTone}`}>
                      {relativeFromNow(nextDate)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════ */
/*  Main AftaleTab — unified view                     */
/* ═══════════════════════════════════════════════════ */
const AftaleTab = ({
  businessId,
  businessName,
  routePlanningEnabled = false,
}: {
  businessId: string;
  businessName: string;
  /** Når falsk skjules ALT rute-relateret UI: rute-pool sidebar, drag handles,
   *  filter-chips ("Ikke planlagt"/"På rute"), badges på aftaler og
   *  rute-info-blokken i den udfoldede aftale. */
  routePlanningEnabled?: boolean;
}) => {
  const { data: orders, isLoading } = useOrders(businessId);
  const { data: services } = useServices(businessId);
  const { data: subscriptions } = useBusinessSubscriptions(businessId);
  const qc = useQueryClient();
  // Default-filter: "active" — viser åbne aftaler (ikke udført/annulleret) så
  // listen ikke bliver overvældet af afsluttede sager.
  const [filter, setFilter] = useState<string>("active");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc" | "next_service" | "needs_action">("needs_action");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<"accepted" | "rejected" | "adjusted">("accepted");
  const [responseMessage, setResponseMessage] = useState("");
  const [adjustedItems, setAdjustedItems] = useState<Record<string, AdjustmentItem[]>>({});
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  // Opret-rute dialog (samme design som ruteplanlægger).
  const [createRouteOpen, setCreateRouteOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteDate, setNewRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [newRouteColor, setNewRouteColor] = useState<string>(ROUTE_COLOR_PALETTE[0]);

  // ─── Drag & drop til rute-pool ───
  // Vi tracker hvilken aftale der pt. trækkes (for visuel feedback) og hvilken
  // rute der "hovers" over, så vi kan highlighte dropzonen.
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  // Aktiv drag-data — bruges af DragOverlay til at vise et "flydende" kort
  // mens aftalen trækkes hen over rute-poolen (samme UX som Ruteplanlæggeren).
  const [activeDragOrder, setActiveDragOrder] = useState<any | null>(null);
  // Bekræftelses-dialog inden en rute slettes permanent.
  const [routeToDelete, setRouteToDelete] = useState<{ id: string; name: string } | null>(null);

  // Ruter for de næste 14 dage (incl. i dag) — det vindue virksomhedsejeren
  // typisk planlægger inden for. Sidebar-poolen viser disse ruter.
  const today = new Date();
  const fromIso = today.toISOString().slice(0, 10);
  const toDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const toIso = toDate.toISOString().slice(0, 10);
  // Når ruteplanlægning er deaktiveret skal vi hverken hente ruter eller stops —
  // sidebar'en skjules helt og badges/blokke renderes ikke. Vi sender et tomt id
  // ind så `useRoutesForRange` blot returnerer en tom liste.
  const { data: poolRoutes } = useRoutesForRange(
    routePlanningEnabled ? businessId : "",
    fromIso,
    toIso,
  );
  const poolRouteIds = (poolRoutes || []).map((r) => r.id);
  const { data: poolStops } = useStopsForRoutes(routePlanningEnabled ? poolRouteIds : []);
  const addStop = useAddStop();
  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();

  // Hent route-stops for alle ordrer i denne forretning, så vi kan vise hvilken
  // rute hver aftale er placeret på (dato, rute-navn, sekvens og status).
  const { data: routeStops } = useQuery({
    queryKey: ["aftaler-route-stops", businessId, routePlanningEnabled],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_stops")
        .select("id, order_id, sequence, status, planned_arrival, planned_departure, route:routes!inner(id, name, route_date, color, status, business_id)")
        .eq("route.business_id", businessId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId && routePlanningEnabled,
  });

  // Map: order_id → første tilknyttede stop (en aftale ligger typisk på én rute).
  const stopByOrder = (routeStops || []).reduce<Record<string, any>>((acc, s: any) => {
    if (s.order_id && !acc[s.order_id]) acc[s.order_id] = s;
    return acc;
  }, {});

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (isLoading) return <ListCardSkeleton rows={6} />;

  const servicesById = (services || []).reduce<Record<string, BusinessService>>((acc, s) => {
    acc[s.id] = s as BusinessService;
    return acc;
  }, {});

  const allSubs = subscriptions || [];

  // Determine if an order has recurring services
  const orderHasRecurring = (order: any) => {
    const items = order.order_items || [];
    return items.some((item: any) => item.details?.interval && item.details.interval !== "engangskøb");
  };

  // Count by status
  const counts: Record<string, number> = { all: orders?.length || 0 };
  orders?.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  // Smart filtering: "action_needed" = pending orders the business needs to act on
  const actionNeeded = orders?.filter(o => {
    if (o.status !== "pending") return false;
    // Not yet responded
    if (!o.business_response) return true;
    // Customer rejected our proposal → we need to re-respond
    if (o.business_response === "adjusted" && o.customer_response === "rejected") return true;
    return false;
  }) || [];

  const waitingForCustomer = orders?.filter(o =>
    o.status === "pending" && o.business_response === "adjusted" && !o.customer_response
  ) || [];

  // En aftale er "aktiv" når den hverken er udført eller annulleret. Det er det
  // primære arbejdsområde for virksomhedsejeren.
  const activeOrders = (orders || []).filter(o => !["completed", "cancelled"].includes(o.status));
  const notPlannedOrders = activeOrders.filter(o => !stopByOrder[o.id]);
  const inRouteOrders = activeOrders.filter(o => stopByOrder[o.id]);

  const baseFilteredOrders =
    filter === "all" ? orders
    : filter === "active" ? activeOrders
    : filter === "action_needed" ? actionNeeded
    : filter === "waiting" ? waitingForCustomer
    : filter === "not_planned" ? notPlannedOrders
    : filter === "in_route" ? inRouteOrders
    : orders?.filter(o => o.status === filter);

  // Søgning på kundenavn, e-mail, telefon, adresse og service-navne
  const q = search.trim().toLowerCase();
  const searchedOrders = !q ? baseFilteredOrders : baseFilteredOrders?.filter((o: any) => {
    if ((o.customer_name || "").toLowerCase().includes(q)) return true;
    if ((o.customer_email || "").toLowerCase().includes(q)) return true;
    if ((o.customer_phone || "").toLowerCase().includes(q)) return true;
    if ((o.address || "").toLowerCase().includes(q)) return true;
    if ((o.city || "").toLowerCase().includes(q)) return true;
    if ((o.company_name || "").toLowerCase().includes(q)) return true;
    const items = (o.order_items || []) as any[];
    return items.some((it: any) => (it.service_name || "").toLowerCase().includes(q));
  });

  // Sortering
  const needsActionScore = (o: any) => {
    // Højere score = vigtigere/mere presserende
    if (o.status === "pending" && (!o.business_response || (o.business_response === "adjusted" && o.customer_response === "rejected"))) return 1000;
    if ((o.payment_status === "overdue") || ((o.reminder_count ?? 0) > 0 && o.payment_status !== "paid")) return 900;
    if (o.status === "pending" && o.business_response === "adjusted") return 700;
    if (o.status === "in_progress") return 500;
    if (o.status === "confirmed") return 300;
    return 0;
  };
  const filteredOrders = (searchedOrders || []).slice().sort((a: any, b: any) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "amount_desc":
        return (b.adjusted_amount ?? b.total_amount ?? 0) - (a.adjusted_amount ?? a.total_amount ?? 0);
      case "amount_asc":
        return (a.adjusted_amount ?? a.total_amount ?? 0) - (b.adjusted_amount ?? b.total_amount ?? 0);
      case "next_service": {
        const ad = a.next_service_date ? new Date(a.next_service_date).getTime() : Infinity;
        const bd = b.next_service_date ? new Date(b.next_service_date).getTime() : Infinity;
        return ad - bd;
      }
      case "needs_action": {
        const diff = needsActionScore(b) - needsActionScore(a);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const initAdjustedItems = (order: any) => {
    const items = (order.order_items || []).map((item: any) =>
      buildAdjustmentItem(item, item.service_id ? servicesById[item.service_id] : undefined)
    );
    setAdjustedItems((prev) => ({ ...prev, [order.id]: items }));
  };

  const updateAdjustedStep = (orderId: string, itemIdx: number, stepIdx: number, field: string, value: number) => {
    setAdjustedItems((prev) => {
      const items = [...(prev[orderId] || [])];
      const item = { ...items[itemIdx] };
      const details = { ...item.details };
      const steps = [...(details.stepDetails || [])] as AdjustmentStep[];
      const step = { ...steps[stepIdx] };
      if (field === "value") {
        step.value = clampValue(value, step.min_value, step.max_value);
        step.subtotal = roundPrice(step.value * step.price_per_unit);
      } else if (field === "price_per_unit") {
        step.price_per_unit = Math.max(0, value);
        step.subtotal = roundPrice(step.value * step.price_per_unit);
      }
      steps[stepIdx] = step;
      details.stepDetails = steps;
      item.details = details;
      item.total_price = roundPrice(steps.reduce((sum, s) => sum + (s.subtotal || 0), 0));
      item.unit_price = item.total_price;
      items[itemIdx] = item;
      return { ...prev, [orderId]: items };
    });
  };

  const updateAdjustedInterval = (orderId: string, itemIdx: number, interval: string) => {
    setAdjustedItems((prev) => {
      const items = [...(prev[orderId] || [])];
      items[itemIdx] = { ...items[itemIdx], details: { ...items[itemIdx].details, interval } };
      return { ...prev, [orderId]: items };
    });
  };

  const updateAdjustedFixedPrice = (orderId: string, itemIdx: number, newPrice: number) => {
    setAdjustedItems((prev) => {
      const items = [...(prev[orderId] || [])];
      const item = { ...items[itemIdx] };
      item.total_price = roundPrice(Math.max(0, newPrice));
      item.unit_price = item.total_price;
      items[itemIdx] = item;
      return { ...prev, [orderId]: items };
    });
  };

  const getAdjustedTotal = (orderId: string) =>
    (adjustedItems[orderId] || []).reduce((sum, item) => sum + item.total_price, 0);

  // Calculate next service date based on interval
  const calcNextServiceDate = (interval: string, fromDate = new Date()): string => {
    const d = new Date(fromDate);
    switch (interval) {
      case "daglig": d.setDate(d.getDate() + 1); break;
      case "ugentlig": d.setDate(d.getDate() + 7); break;
      case "hver_14_dag": d.setDate(d.getDate() + 14); break;
      case "månedlig": d.setMonth(d.getMonth() + 1); break;
      case "kvartalsvis": d.setMonth(d.getMonth() + 3); break;
      default: return "";
    }
    return d.toISOString();
  };

  const getOrderInterval = (order: any): string => {
    // Check adjusted details first, then original items
    const adjItems = (order.adjusted_details as any)?.items;
    const items = adjItems || order.order_items || [];
    for (const item of items) {
      const iv = item.details?.interval;
      if (iv && iv !== "engangskøb") return iv;
    }
    return "engangskøb";
  };

  const handleProgressStatus = async (orderId: string, newStatus: string) => {
    const order = orders?.find(o => o.id === orderId);
    const isRecurring = order ? orderHasRecurring(order) : false;
    const interval = order ? getOrderInterval(order) : "engangskøb";

    // For recurring orders: completing = auto-cycle to confirmed
    if (newStatus === "completed" && isRecurring && interval !== "engangskøb") {
      const nextDate = calcNextServiceDate(interval);
      const currentCycles = (order as any)?.completed_cycles || 0;
      const { error } = await supabase.from("orders").update({
        status: "confirmed" as any,
        completed_cycles: currentCycles + 1,
        ...(nextDate ? { next_service_date: nextDate } : {}),
      }).eq("id", orderId);
      if (error) { toast.error(error.message); return; }
      toast.success(`Service #${currentCycles + 1} udført — næste planlagt ${nextDate ? new Date(nextDate).toLocaleDateString("da-DK", { day: "numeric", month: "long" }) : ""}`);
    } else {
      const { error } = await supabase.from("orders").update({
        status: newStatus as any,
      }).eq("id", orderId);
      if (error) { toast.error(error.message); return; }
      toast.success(`Status ændret til "${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label}"`);
    }
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["my-orders"] });
  };

  const handleResponse = async (orderId: string) => {
    try {
      const adjustedData = responseType === "adjusted" ? adjustedItems[orderId] : null;
      const adjustedTotal = adjustedData ? adjustedData.reduce((sum, i) => sum + i.total_price, 0) : null;

      const { error } = await supabase.from("orders").update({
        business_response: responseType,
        business_message: responseMessage || null,
        adjusted_amount: adjustedTotal,
        adjusted_details: adjustedData ? { items: adjustedData } as any : null,
        // Direct accept → confirmed. Reject → cancelled. Adjust → stays pending (awaits customer)
        status: responseType === "accepted" ? "confirmed" as const
          : responseType === "rejected" ? "cancelled" as const
          : "pending" as const,
        // Reset customer_response when sending a new proposal
        customer_response: responseType === "adjusted" ? null : undefined as any,
      }).eq("id", orderId);
      if (error) throw error;

      // Aktivér eller annullér tilknyttede abonnementer baseret på svaret.
      // Ved "adjusted" venter vi på kundens svar, så abonnementer forbliver pending.
      if (responseType === "accepted") {
        await supabase.from("subscriptions")
          .update({ status: "active" })
          .eq("order_id", orderId)
          .eq("status", "pending");
      } else if (responseType === "rejected") {
        await supabase.from("subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .in("status", ["pending", "active"]);
      }

      toast.success(
        responseType === "accepted" ? "Aftale godkendt!"
        : responseType === "rejected" ? "Aftale afvist"
        : "Tilpasningsforslag sendt til kunden"
      );
      setRespondingTo(null);
      setResponseMessage("");
      setAdjustedItems((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Upcoming service dates from subscriptions
  const upcomingSubs = allSubs
    .filter(s => s.status === "active" && s.next_service_date)
    .sort((a, b) => new Date(a.next_service_date!).getTime() - new Date(b.next_service_date!).getTime());

  // ─── Tilføj aftale til en eksisterende rute (drag-drop fra aftalekort) ───
  // Finder næste sekvensnummer på den valgte rute, geocoder evt. hvis ordren
  // mangler koordinater og kalder useAddStop. Synkroniserer både rute-stops
  // og aftaler-listen, så brugeren ser ændringen straks.
  const handleDropOrderOnRoute = async (orderId: string, routeId: string) => {
    const order = (orders || []).find((o: any) => o.id === orderId);
    if (!order) { toast.error("Aftalen kunne ikke findes"); return; }
    if (stopByOrder[orderId]) {
      toast.info("Denne aftale ligger allerede på en rute");
      return;
    }

    // Find næste ledige stop-position på ruten:
    //   1) Hvis nogle stops allerede er udført/i gang, indsæt LIGE EFTER det
    //      sidste af dem — så den nye aftale bliver "det næste at køre til".
    //   2) Ellers placér aftalen sidst i ruten.
    // Bagefter forskydes alle efterfølgende pending-stops én sekvens ned, så
    // ingen kolliderer.
    const stopsForThisRoute = (poolStops || [])
      .filter((s: any) => s.route_id === routeId)
      .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0));

    const doneStatuses = new Set(["completed", "in_progress", "arrived", "skipped"]);
    const lastDoneIdx = (() => {
      let idx = -1;
      stopsForThisRoute.forEach((s: any, i: number) => {
        if (doneStatuses.has(s.status)) idx = i;
      });
      return idx;
    })();

    const insertAfterSeq = lastDoneIdx >= 0
      ? (stopsForThisRoute[lastDoneIdx].sequence ?? lastDoneIdx)
      : (stopsForThisRoute.length > 0
          ? Math.max(...stopsForThisRoute.map((s: any) => s.sequence ?? 0))
          : -1);
    const nextSeq = insertAfterSeq + 1;

    // Skub efterfølgende stops én ned, så det nye stop får en unik plads.
    const toShift = stopsForThisRoute.filter((s: any) => (s.sequence ?? 0) >= nextSeq);
    if (toShift.length > 0) {
      // Opdater sekvens i omvendt rækkefølge for at undgå mellemkollisioner.
      for (const s of [...toShift].reverse()) {
        const { error } = await supabase
          .from("route_stops")
          .update({ sequence: (s.sequence ?? 0) + 1 })
          .eq("id", s.id);
        if (error) {
          toast.error("Kunne ikke gøre plads til aftalen i ruten");
          return;
        }
      }
    }

    const items = ((order as any).order_items || []) as any[];
    const summary = items.map((it) => `${it.service_name}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`).join(", ");
    const fullAddress = [order.address, [order.zip_code, order.city].filter(Boolean).join(" ")]
      .filter(Boolean).join(", ");

    try {
      await addStop.mutateAsync({
        route_id: routeId,
        order_id: orderId,
        sequence: nextSeq,
        customer_name: order.customer_name || null,
        customer_phone: order.customer_phone || null,
        address: fullAddress || null,
        latitude: (order as any).latitude ?? null,
        longitude: (order as any).longitude ?? null,
        service_summary: summary || null,
        duration_minutes: (order as any).estimated_duration_minutes || 30,
      });
      const route = (poolRoutes || []).find((r) => r.id === routeId);
      const dateLabel = route ? new Date(route.route_date).toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" }) : "";
      toast.success(`Lagt som stop #${nextSeq + 1} på ${route?.name || "rute"} · ${dateLabel}`);
      qc.invalidateQueries({ queryKey: ["aftaler-route-stops", businessId] });
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke lægge aftalen på ruten");
    }
  };

  // Opret en ny rute via dialog — samme flow som "Opret rute" på ruteplanlæggeren.
  // Brugeren vælger navn (valgfrit), dato og farve.
  const handleConfirmCreateRoute = async () => {
    if (!businessId) return;
    try {
      await createRoute.mutateAsync({
        business_id: businessId,
        route_date: newRouteDate,
        name: newRouteName.trim() || null,
        color: newRouteColor,
      });
      toast.success("Rute oprettet");
      setNewRouteName("");
      setCreateRouteOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke oprette ruten");
    }
  };

  // Når dialogen åbnes, foreslå en ledig farve for den valgte dato — så to
  // ruter på samme dag ikke får samme farve.
  const openCreateRouteDialog = () => {
    const usedColorsThisDay = (poolRoutes || [])
      .filter((r: any) => r.route_date === newRouteDate)
      .map((r: any) => r.color);
    setNewRouteColor(pickAvailableColor(usedColorsThisDay));
    setCreateRouteOpen(true);
  };

  return (
    <DndContext
      sensors={dndSensors}
      collisionDetection={pointerWithin}
      onDragEnd={(e: DragEndEvent) => {
        const { active, over } = e;
        setDraggingOrderId(null);
        setActiveDragOrder(null);
        const a: any = active.data.current;
        // Kun aftale-drag er understøttet i denne fane.
        if (a?.type !== "order") return;

        // 1) Sluppet udenfor enhver droppable-zone
        if (!over) {
          toast.error("Slip aftalen direkte oven på en rute til højre", {
            description: "Træk hen over et rute-kort indtil det lyser op, før du slipper.",
          });
          return;
        }

        const o: any = over.data.current;
        // 2) Sluppet et ugyldigt sted (ikke en pool-rute)
        if (o?.type !== "pool-route") {
          toast.error("Aftaler kan kun slippes på et rute-kort", {
            description: "Find ruten i panelet til højre og slip aftalen direkte oven på den.",
          });
          return;
        }

        // 3) Aftalen er allerede tildelt en rute (ekstra sikkerhed — også checket inde i handler)
        if (stopByOrder[a.orderId]) {
          toast.info("Denne aftale ligger allerede på en rute");
          return;
        }

        handleDropOrderOnRoute(a.orderId, o.routeId);
      }}
      onDragStart={(e: DragStartEvent) => {
        const a: any = e.active.data.current;
        if (a?.type === "order") {
          setDraggingOrderId(a.orderId);
          setActiveDragOrder(a.order || null);
        }
      }}
      onDragCancel={() => { setDraggingOrderId(null); setActiveDragOrder(null); }}
    >
      <div className="space-y-5">
      <PageHeader
        title="Aftaler"
        description={`${orders?.length || 0} aftaler i alt${upcomingSubs.length > 0 ? ` · ${upcomingSubs.length} kommende ${upcomingSubs.length === 1 ? "aftale" : "aftaler"}` : ""}`}
        action={
          <PrimaryButton onClick={() => setCreateOrderOpen(true)} icon={<ShoppingCart />}>
            Opret bestilling
          </PrimaryButton>
        }
      />

      {/* Stats — én række, fuld bredde, ligesom Services */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aftaler i alt</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{orders?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kræver handling</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{actionNeeded.length}</p>
          </CardContent>
        </Card>
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kommende aftaler</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{upcomingSubs.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Søgefelt + sortering */}
      <div className={`grid gap-5 ${routePlanningEnabled ? "lg:grid-cols-[7fr_3fr]" : ""}`}>
        <div className="space-y-5 min-w-0">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg kunde, e-mail, service, adresse…"
              className="h-10 pl-9 rounded-lg"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger
              aria-label="Sortér aftaler"
              className="h-10 w-auto min-w-[200px] gap-2 rounded-lg border-border bg-card text-sm font-medium hover:bg-secondary"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="needs_action">✨ Smart: Vigtigst først</SelectItem>
              <SelectItem value="newest">Nyeste først</SelectItem>
              <SelectItem value="oldest">Ældste først</SelectItem>
              <SelectItem value="next_service">Næste udførelse</SelectItem>
              <SelectItem value="amount_desc">Højeste beløb</SelectItem>
              <SelectItem value="amount_asc">Laveste beløb</SelectItem>
            </SelectContent>
          </Select>
        </div>

      {/* Filtre — opdelt i tre logiske grupper:
          1) Status-overblik (Aktive/Alle), 2) Hvad kræver din opmærksomhed,
          3) Planlægning og lifecycle. Tomme tællinger skjules ikke for fast layout. */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {(() => {
          type Chip = { key: string; label: string; count: number; tone?: "danger" | "warning" };
          const groups: Chip[][] = [
            [
              { key: "active", label: "Aktive", count: activeOrders.length },
              { key: "all", label: "Alle", count: counts.all || 0 },
            ],
            ([
              { key: "action_needed", label: "Kræver handling", count: actionNeeded.length, tone: "danger" as const },
              { key: "waiting", label: "Afventer kunde", count: waitingForCustomer.length, tone: "warning" as const },
            ] as Chip[]).filter(b => b.count > 0),
            // Rute-relaterede filtre vises kun når ruteplanlægning er slået til.
            [
              ...(routePlanningEnabled
                ? [
                    { key: "not_planned", label: "Ikke planlagt", count: notPlannedOrders.length },
                    { key: "in_route", label: "På rute", count: inRouteOrders.length },
                  ]
                : []),
              { key: "in_progress", label: "I gang", count: counts.in_progress || 0 },
              { key: "completed", label: "Udførte", count: counts.completed || 0 },
              { key: "cancelled", label: "Annullerede", count: counts.cancelled || 0 },
            ],
          ].filter(g => g.length > 0);

          return groups.map((group, gi) => (
            <div key={gi} className="flex flex-wrap items-center gap-1.5">
              {gi > 0 && <span aria-hidden className="mx-1 h-5 w-px bg-border/80" />}
              {group.map(({ key, label, count, tone }) => {
                const isActive = filter === key;
                const toneDot =
                  tone === "danger" && count > 0 ? "bg-destructive" :
                  tone === "warning" && count > 0 ? "bg-amber-500" :
                  "";
                const activeCls =
                  tone === "danger" && count > 0
                    ? "border-destructive bg-destructive text-destructive-foreground shadow-sm"
                    : tone === "warning" && count > 0
                    ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                    : "border-foreground bg-foreground text-background shadow-sm";
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? activeCls
                        : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {toneDot && !isActive && <span className={`h-1.5 w-1.5 rounded-full ${toneDot}`} aria-hidden />}
                    <span>{label}</span>
                    <span className={`tabular-nums rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive ? "bg-white/20 text-current" : "bg-secondary text-foreground/70"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          ));
        })()}
      </div>

      {/* Kommende aftaler — viser de næste planlagte udførelser med kundenavn,
          status og rute/stop-info så man straks kan se hvor det står. */}
      {upcomingSubs.length > 0 && (
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Kommende aftaler</span>
            </div>
            {upcomingSubs.length > 4 && (
              <span className="text-xs text-muted-foreground">{upcomingSubs.length} i alt</span>
            )}
          </div>
          <div className="space-y-2">
            {upcomingSubs.slice(0, 4).map(sub => {
              const nextDate = new Date(sub.next_service_date!);
              const mins = Math.round((nextDate.getTime() - Date.now()) / 60000);
              const isUrgent = mins <= 60 * 24; // ≤ 24 timer
              const badgeLabel = mins <= 0 ? "Nu" : relativeFromNow(nextDate, { short: true });
              const linkedOrder = (orders || []).find((o: any) => o.id === (sub as any).order_id);
              const customerName = linkedOrder?.customer_name
                || linkedOrder?.company_name
                || (sub as any).profiles?.display_name
                || "Ukendt kunde";
              const orderStatus = linkedOrder?.status as string | undefined;
              const statusCfg = orderStatus ? (STATUS_CONFIG[orderStatus] || STATUS_CONFIG.pending) : null;
              const stop = linkedOrder ? stopByOrder[linkedOrder.id] : null;
              const routeName = stop?.route?.name as string | undefined;
              const routeColor = (stop?.route?.color as string | undefined) || "#64748b";
              const stopSeq = stop?.sequence;
              const stopStatus = formatStopStatus(stop?.status);
              const isClickable = !!linkedOrder;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    if (!linkedOrder) return;
                    setFilter("active");
                    setExpandedOrder(linkedOrder.id);
                    requestAnimationFrame(() => {
                      const el = document.getElementById(`order-${linkedOrder.id}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    });
                  }}
                  disabled={!isClickable}
                  className={`w-full rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors ${
                    isClickable ? "hover:bg-secondary/60 cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <span className={`mt-0.5 inline-flex h-5 min-w-[36px] items-center justify-center rounded-full px-2 text-[10px] font-bold tabular-nums ${
                        isUrgent ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"
                      }`}>{badgeLabel}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-foreground truncate">{customerName}</span>
                          {statusCfg && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                              {statusCfg.label}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {sub.service_name}
                        </div>
                        {routeName && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <RouteIcon className="h-3 w-3" />
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: routeColor }}
                              aria-hidden
                            />
                            <span className="truncate">
                              {routeName}
                              {typeof stopSeq === "number" ? ` · stop #${stopSeq + 1}` : ""}
                              {stopStatus ? ` · ${stopStatus}` : ""}
                            </span>
                          </div>
                        )}
                        {!routeName && routePlanningEnabled && linkedOrder && (
                          <div className="mt-1 text-[11px] text-amber-600">
                            Ikke tildelt en rute endnu
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-medium text-foreground">
                        {nextDate.toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {nextDate.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          </CardContent>
        </Card>
      )}

      {/* Action needed alert */}
      {actionNeeded.length > 0 && (
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Clock className="h-4 w-4 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{actionNeeded.length} {actionNeeded.length === 1 ? "aftale kræver" : "aftaler kræver"} din handling</p>
              <p className="text-xs text-muted-foreground">Godkend, tilpas eller afvis for at give kunden besked.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setFilter("action_needed")}
              className="shrink-0 rounded-lg border-border text-xs text-foreground hover:bg-secondary hover:text-foreground">
              Vis dem
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Aftale-liste — individuelle kort pr. aftale (samme stil som Services-fanen).
          Hvert kort viser kunde, services, status og beløb i headeren. Klik for at folde ud. */}
      {filteredOrders && filteredOrders.length > 0 ? (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const isExpanded = expandedOrder === order.id;
            const isResponding = respondingTo === order.id;
            const actions = getActions(order);
            const originalTotal = order.total_amount;
            const currentTotal = order.adjusted_amount && order.customer_response === "accepted" ? order.adjusted_amount : originalTotal;
            const hasRecurring = orderHasRecurring(order);
            const date = new Date(order.created_at);
            const items = ((order as any).order_items || []) as any[];
            const itemCount = items.length;
            // Sammenfattet liste over services i denne aftale (vises i header-rækken,
            // så brugeren straks kan se hvad aftalen indeholder uden at folde ud).
            const serviceList = items.map((it: any) => {
              const qty = it.quantity > 1 ? ` ×${it.quantity}` : "";
              return `${it.service_name}${qty}`;
            });
            const serviceSummary = serviceList.length > 0
              ? serviceList.slice(0, 2).join(", ") + (serviceList.length > 2 ? ` +${serviceList.length - 2}` : "")
              : "Ingen services";
            const cycles = (order as any).completed_cycles || 0;
            const nextDate = (order as any).next_service_date ? new Date((order as any).next_service_date) : null;
            const interval = getOrderInterval(order);
            // Dage til næste udførelse — beregnes fra midnat-til-midnat så
            // "i dag" og "i morgen" er korrekte uanset klokkeslæt.
            const daysUntilNext = (() => {
              if (!nextDate) return null;
              const a = new Date(); a.setHours(0,0,0,0);
              const b = new Date(nextDate); b.setHours(0,0,0,0);
              return Math.round((b.getTime() - a.getTime()) / 86400000);
            })();
            const minutesUntilNext = nextDate ? Math.round((nextDate.getTime() - Date.now()) / 60000) : null;
            const routeStop = stopByOrder[order.id];
            const routeInfo = routeStop?.route;
            const routeDate = routeInfo?.route_date ? new Date(routeInfo.route_date) : null;
            const routeIsToday = routeDate ? routeDate.toDateString() === new Date().toDateString() : false;
            // Find primær service-kategori for at vælge ikon — bruger første order_item
            // der har et matchende service med kategori. Falder tilbage til standard-ikon.
            const primaryCategory = (() => {
              for (const it of items) {
                const svc = it.service_id ? servicesById[it.service_id] : undefined;
                if (svc?.service_category) return svc.service_category;
              }
              return null;
            })();
            const categoryIcon = (primaryCategory && CATEGORY_ICONS[primaryCategory]) || DEFAULT_CATEGORY_ICON;
            // Aftalen kan kun trækkes til en rute hvis ruteplanlægning er slået
            // til, den ikke allerede ligger på en rute, og ikke er afsluttet/annulleret.
            const canDragToRoute = routePlanningEnabled && !routeStop && !["completed", "cancelled"].includes(order.status);

            return (
              <Card
                key={order.id}
                id={`order-${order.id}`}
                className={`surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden ${
                  draggingOrderId === order.id ? "opacity-60" : ""
                }`}
              >
                {/* Header — samme struktur som ServiceRow på Services-fanen:
                    ikon + navn + meta i én kolonne; status, beløb og chevron i højre side. */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedOrder(isExpanded ? null : order.id);
                    }
                  }}
                  className="block w-full cursor-pointer text-left transition-colors hover:bg-secondary/40"
                >
                  <div className="grid gap-2.5 p-3.5 sm:p-4">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-2.5">
                        {/* Drag-håndtag (samme @dnd-kit-mønster som Ruteplanlæggeren). */}
                        {canDragToRoute && <OrderDragHandle orderId={order.id} order={order} />}
                        {/* Ikon-badge — viser service-kategori-ikon (samme som Services-fanen) */}
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground"
                          title={primaryCategory || "Aftale"}
                        >
                          <span className="text-sm leading-none">{categoryIcon}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-foreground">{order.customer_name}</h3>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                            {(() => {
                              const ps = (order as any).payment_status as string | null | undefined;
                              if (!ps) return null;
                              const PAY: Record<string, { label: string; cls: string; dot: string }> = {
                                paid:           { label: "Betalt",           cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
                                partially_paid: { label: "Delvist betalt",   cls: "bg-amber-50 text-amber-800 border-amber-200",       dot: "bg-amber-500" },
                                overdue:        { label: "Forfalden",        cls: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
                                credited:       { label: "Krediteret",       cls: "bg-secondary text-muted-foreground border-border",  dot: "bg-muted-foreground" },
                                unpaid:         { label: "Ubetalt",          cls: "bg-secondary text-foreground border-border",        dot: "bg-muted-foreground" },
                              };
                              const p = PAY[ps];
                              if (!p) return null;
                              const syncedAt = (order as any).payment_status_synced_at
                                ? new Date((order as any).payment_status_synced_at)
                                : null;
                              const syncedLabel = syncedAt
                                ? syncedAt.toLocaleString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                                : "endnu ikke";
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${p.cls}`}
                                  title={`Betalingsstatus hentes automatisk fra dit regnskabsprogram hvert 5. minut.\nSidst opdateret: ${syncedLabel}.`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                                  {p.label}
                                </span>
                              );
                            })()}
                            {(() => {
                              const rc = Number((order as any).reminder_count ?? 0);
                              if (rc <= 0) return null;
                              const last = (order as any).last_reminder_at
                                ? new Date((order as any).last_reminder_at)
                                : null;
                              return (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                                  title={last ? `Sidste rykker sendt ${last.toLocaleString("da-DK")}` : "Rykker sendt"}
                                >
                                  Rykker {rc}
                                </span>
                              );
                            })()}
                            {hasRecurring && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                <RefreshCw className="h-2.5 w-2.5" /> {INTERVAL_LABELS[interval] || interval}
                                {cycles > 0 && <span className="ml-0.5">· #{cycles}</span>}
                              </span>
                            )}
                            {routePlanningEnabled && routeInfo && (
                              <span
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  borderColor: `${routeInfo.color}40`,
                                  backgroundColor: `${routeInfo.color}14`,
                                  color: routeInfo.color,
                                }}
                                title={`Rute ${routeInfo.name || ""} · ${routeDate?.toLocaleDateString("da-DK")}`}
                              >
                                <RouteIcon className="h-2.5 w-2.5" />
                                {routeInfo.name || "Rute"}
                                {routeDate && (
                                  <span className="opacity-80">
                                    · {routeIsToday ? "i dag" : routeDate.toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
                                  </span>
                                )}
                                {typeof routeStop.sequence === "number" && (
                                  <span className="opacity-80">· Stop #{routeStop.sequence + 1}</span>
                                )}
                              </span>
                            )}
                          </div>

                          {/* Service-sammendrag — vises direkte i headeren, så det er
                              tydeligt hvad aftalen omfatter. */}
                          <p className="mt-1 truncate text-xs text-foreground/80">
                            <span className="text-muted-foreground">Services: </span>
                            {serviceSummary}
                          </p>

                          {/* Service-adresse — den fysiske adresse hvor opgaven skal
                              udføres. Vises sammen med by/postnr så virksomhedsejeren
                              hurtigt kan vurdere geografi inden ruteplanlægning. */}
                          {(order.address || order.city || order.zip_code) && (
                            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="truncate text-foreground/75">
                                {[order.address, [order.zip_code, order.city].filter(Boolean).join(" ")]
                                  .filter(Boolean).join(", ")}
                              </span>
                            </p>
                          )}

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>{date.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>

                          {/* Næste udførelse — fremhævet blok så det er nemt at se hvornår
                              kunden skal serviceres næste gang. */}
                          {nextDate && daysUntilNext !== null && (
                            <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
                              daysUntilNext <= 0
                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                : daysUntilNext <= 3
                                ? "border-amber-300/50 bg-amber-50 text-amber-700"
                                : "border-border bg-secondary/60 text-foreground"
                            }`}
                            title="Når dagen er nået oprettes ordren automatisk kl. 06:00 og sendes til dit regnskabsprogram."
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                              <span className="opacity-80">Næste udførelse:</span>
                              <span className="font-semibold">
                                {nextDate.toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" })}
                              </span>
                              <span className="opacity-80">
                                · {relativeFromNow(nextDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Højre side: beløb + chevron */}
                      <div className="flex items-center justify-end gap-3 sm:flex-col sm:items-end sm:gap-1">
                        <span className="text-base font-semibold tabular-nums text-foreground">{currentTotal} kr</span>
                        {/* Faktura-handlinger: rykker, kreditér, annullér, markér betalt.
                            Kun synligt når ordren har en aktiv regnskabsintegration —
                            menuen viser selv hvilke handlinger der giver mening. */}
                        {((order as any).invoice_external_id || (order as any).accounting_synced_at) && (
                          <InvoiceActionsMenu order={order as any} />
                        )}
                        <span className="text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border bg-background px-4 py-4 space-y-4">
                    {/* Contact info */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {order.customer_email}
                      </span>
                      {order.customer_phone && (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
                        </span>
                      )}
                    </div>

                    {/* Næste skridt — smart kontekstuel guide */}
                    <NextStepCard order={order as any} />

                    {/* Rute-info — vis på hvilken rute denne aftale er placeret.
                        Hele blokken skjules når ruteplanlægning er deaktiveret. */}
                    {routePlanningEnabled && routeInfo ? (
                      <div
                        className="rounded-xl border px-4 py-3 space-y-1.5"
                        style={{ borderColor: `${routeInfo.color}40`, backgroundColor: `${routeInfo.color}0d` }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <RouteIcon className="h-4 w-4 shrink-0" style={{ color: routeInfo.color }} />
                            <span className="text-sm font-semibold text-foreground truncate">
                              {routeInfo.name || "Rute"}
                            </span>
                            {routeDate && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                · {routeDate.toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            Stop #{(routeStop.sequence ?? 0) + 1}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {routeStop.planned_arrival && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Ankomst {new Date(routeStop.planned_arrival).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                              {routeStop.planned_departure && (
                                <> – {new Date(routeStop.planned_departure).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}</>
                              )}
                            </span>
                          )}
                          {routeStop.status && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: routeInfo.color }} />
                              Status på dette stop: <span className="text-foreground font-medium">{formatStopStatus(routeStop.status)}</span>
                            </span>
                          )}
                          {routeInfo.status && (
                            <span>Status på rute: <span className="text-foreground font-medium">{formatRouteStatus(routeInfo.status)}</span></span>
                          )}
                        </div>
                      </div>
                    ) : routePlanningEnabled && !["completed", "cancelled"].includes(order.status) && (
                      <div className="rounded-xl border border-dashed border-border px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        Denne aftale er endnu ikke planlagt på en rute.
                      </div>
                    )}

                    {/* Order items summary */}
                    <CustomerOrderSummary order={order} />

                    {/* Linked subscriptions (recurring service schedule) */}
                    <LinkedSubscriptionInfo orderId={order.id} subscriptions={allSubs} />

                    {/* Tidslinje — viser bestilling, faktura, rykkere, betalinger og status-skift */}
                    <OrderTimeline order={order as any} />

                    {/* Customer note */}
                    {order.notes && (
                      <div className="flex gap-2 rounded-xl bg-card border border-border px-3.5 py-2.5">
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{order.notes}</p>
                      </div>
                    )}

                    {/* Proposal status banner */}
                    {!isResponding && <ProposalStatusBanner order={order} />}

                    {/* Business message (if already sent) */}
                    {order.business_message && !isResponding && (
                      <div className="rounded-xl border border-border bg-card px-4 py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Din besked til kunden:</p>
                        <p className="text-sm text-foreground">{order.business_message}</p>
                      </div>
                    )}

                    {/* Previous adjustment display */}
                    {!isResponding && <AdjustmentDisplay order={order} />}

                    {/* Action buttons */}
                    {!isResponding && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {/* Respond buttons for pending orders needing action */}
                        {actions.canRespond && (
                          <>
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); setRespondingTo(order.id); setResponseType("accepted"); }}
                              className="gap-1.5 rounded-lg text-xs bg-foreground text-background hover:bg-foreground/90">
                              <Check className="h-3.5 w-3.5" /> Godkend aftale
                            </Button>
                            <Button variant="outline" size="sm" onClick={(e) => {
                              e.stopPropagation(); initAdjustedItems(order);
                              setRespondingTo(order.id); setResponseType("adjusted");
                            }} className="gap-1.5 rounded-lg border-border text-xs text-foreground hover:bg-secondary hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" /> Tilpas aftale
                            </Button>
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setRespondingTo(order.id); setResponseType("rejected"); }}
                              className="gap-1.5 rounded-lg border-border text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
                              <X className="h-3.5 w-3.5" /> Afvis
                            </Button>
                          </>
                        )}

                        {/* Progress button for confirmed/in_progress */}
                        {actions.canProgress && actions.nextStatus && (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleProgressStatus(order.id, actions.nextStatus!); }}
                            className={`gap-1.5 rounded-lg text-xs ${
                              actions.nextStatus === "completed" && hasRecurring
                                ? "bg-foreground text-background hover:bg-foreground/90"
                                : actions.nextStatus === "completed"
                                ? "bg-foreground text-background hover:bg-foreground/90"
                                : "bg-foreground text-background hover:bg-foreground/90"
                            }`}>
                            {actions.nextStatus === "in_progress" && <><Play className="h-3.5 w-3.5" /> {actions.nextLabel}</>}
                            {actions.nextStatus === "completed" && hasRecurring && <><RefreshCw className="h-3.5 w-3.5" /> {actions.nextLabel}</>}
                            {actions.nextStatus === "completed" && !hasRecurring && <><CheckCircle2 className="h-3.5 w-3.5" /> {actions.nextLabel}</>}
                          </Button>
                        )}

                        {/* Cancel is always available for non-terminal states */}
                        {(order.status === "confirmed" || order.status === "in_progress") && (
                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleProgressStatus(order.id, "cancelled"); }}
                            className="ml-auto gap-1.5 rounded-lg border-border text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> Annuller
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Response form */}
                    {isResponding && (
                      <div className="rounded-xl border border-border bg-card p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {(["accepted", "adjusted", "rejected"] as const).map((type) => (
                            <button key={type} onClick={() => {
                              setResponseType(type);
                              if (type === "adjusted" && !adjustedItems[order.id]) initAdjustedItems(order);
                            }}
                              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                                responseType === type
                                  ? "border-border bg-secondary text-foreground"
                                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}>
                              {type === "accepted" ? <><Check className="h-3.5 w-3.5" /> Godkend</>
                                : type === "adjusted" ? <><Pencil className="h-3.5 w-3.5" /> Tilpas</>
                                : <><X className="h-3.5 w-3.5" /> Afvis</>}
                            </button>
                          ))}
                        </div>

                        {responseType === "adjusted" && adjustedItems[order.id] && (
                          <div className="space-y-3">
                            <AdjustmentEditor
                              orderId={order.id}
                              items={adjustedItems[order.id]}
                              onUpdateStep={updateAdjustedStep}
                              onUpdateInterval={updateAdjustedInterval}
                              onUpdateFixedPrice={updateAdjustedFixedPrice}
                            />
                            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3">
                              <div>
                                <span className="text-xs text-muted-foreground">Kundens pris</span>
                                <span className="ml-2 text-sm line-through text-muted-foreground">{order.total_amount} kr</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <span className="text-xs text-muted-foreground">Din pris</span>
                                  <span className="ml-2 text-base font-bold text-foreground">{roundPrice(getAdjustedTotal(order.id))} kr</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Besked til kunden {responseType === "accepted" ? "(valgfrit)" : ""}
                          </label>
                          <Textarea value={responseMessage} onChange={(e) => setResponseMessage(e.target.value)}
                            placeholder={
                              responseType === "accepted" ? "Tak for din aftale! Vi glæder os til at hjælpe dig."
                              : responseType === "adjusted" ? "Vi vil gerne foreslå en tilpasning af aftalen..."
                              : "Vi kan desværre ikke udføre denne opgave fordi..."
                            }
                            rows={3} className="text-sm" />
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleResponse(order.id)}
                            className={`rounded-lg text-xs ${
                              responseType === "rejected" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              : "bg-foreground text-background hover:bg-foreground/90"
                            }`}>
                            {responseType === "accepted" ? "Bekræft godkendelse"
                              : responseType === "rejected" ? "Bekræft afvisning"
                              : `Send forslag – ${roundPrice(getAdjustedTotal(order.id))} kr`}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setRespondingTo(null); setResponseMessage(""); }}
                            className="rounded-lg text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">Annuller</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<ShoppingCart />}
          title={
            filter === "all" || filter === "active"
              ? "Ingen aftaler endnu"
              : "Ingen aftaler i dette filter"
          }
          description={
            filter === "active"
              ? "Du har ingen åbne aftaler lige nu. Skift til Alle for at se afsluttede sager."
              : "Aftaler vises her når kunder bestiller."
          }
        />
      )}
        </div>

        {/* ─── Sidebar: Ruter ───
            Viser ruter for de næste 14 dage. Aftaler kan trækkes direkte
            fra venstre kolonne over på en rute her — så er den planlagt.
            Skjules helt når ruteplanlægning er deaktiveret. */}
        {routePlanningEnabled && (
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/40 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <RouteIcon className="h-4 w-4 text-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Ruter</p>
                  <p className="text-[11px] text-muted-foreground">Træk en aftale herover for at planlægge den</p>
                </div>
              </div>
              <button
                type="button"
                onClick={openCreateRouteDialog}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary"
                title="Opret en ny rute"
              >
                <PlusIcon className="h-3 w-3" /> Ny rute
              </button>
            </div>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-3 space-y-2">
              {(poolRoutes || []).length === 0 && (
                <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  Ingen ruter de næste 14 dage. Opret en rute for at komme i gang.
                </div>
              )}
              {(poolRoutes || []).map((route) => {
                const stopsForRoute = (poolStops || []).filter((s: any) => s.route_id === route.id);
                const rDate = new Date(route.route_date);
                const isToday = rDate.toDateString() === new Date().toDateString();
                return (
                  <PoolRouteDropZone key={route.id} routeId={route.id}>
                    {({ isOver, isActive }) => (
                      <div
                        className={`rounded-lg border bg-card p-2.5 transition-colors ${
                          isOver
                            ? "border-foreground/40 bg-secondary ring-2 ring-foreground/10"
                            : isActive
                            ? "border-dashed border-foreground/30"
                            : "border-border"
                        }`}
                        style={!isOver ? { borderLeft: `3px solid ${route.color}` } : undefined}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {route.name || "Rute"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {isToday ? "I dag · " : ""}
                              {rDate.toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" })}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {stopsForRoute.length} stop
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRouteToDelete({ id: route.id, name: route.name || "Rute" });
                              }}
                              aria-label="Slet rute"
                              title="Slet rute"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {isOver && (
                          <p className="mt-2 rounded-md bg-foreground/5 px-2 py-1 text-center text-[11px] font-medium text-foreground">
                            Slip her for at lægge aftalen på ruten
                          </p>
                        )}
                      </div>
                    )}
                  </PoolRouteDropZone>
                );
              })}
            </div>
          </Card>
        </aside>
        )}
      </div>

      <CreateManualOrderDialog
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        businessId={businessId}
        businessName={businessName}
      />

      {/* Opret-rute dialog — samme design og felter som ruteplanlæggerens "Opret rute". */}
      <Dialog open={createRouteOpen} onOpenChange={setCreateRouteOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-4 border-b shrink-0 space-y-0">
            <SheetHeaderBlock
              icon={<RouteIcon className="h-4 w-4" />}
              accent={newRouteColor}
              title={<DialogTitle className="text-base">Opret ny rute</DialogTitle>}
              description={
                <DialogDescription className="text-xs leading-snug">
                  Ruten starter fra virksomhedens adresse. Du kan tilkoble medarbejdere og aftaler bagefter.
                </DialogDescription>
              }
            />
          </DialogHeader>

          <div className="px-5 py-3 space-y-2.5 bg-secondary/20">
            <Section icon={<Tag className="h-3.5 w-3.5" />} title="Detaljer">
              <div className="space-y-2.5">
                <Field label="Navn (valgfrit)">
                  <Input
                    placeholder="fx Nord, Aarhus C, Mandag-team..."
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleConfirmCreateRoute(); }}
                    className="h-8"
                    autoFocus
                  />
                </Field>
                <Field label="Dato" required>
                  <DatePickerField value={newRouteDate} onChange={setNewRouteDate} />
                </Field>
              </div>
            </Section>

            <Section
              icon={<Palette className="h-3.5 w-3.5" />}
              title="Farve"
              hint={ROUTE_COLORS.find((c) => c.value === newRouteColor)?.name || "Brugerdefineret"}
            >
              <div className="grid grid-cols-12 gap-1.5">
                {ROUTE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewRouteColor(c.value)}
                    title={c.name}
                    className={`relative aspect-square rounded transition-all hover:scale-110 ring-offset-1 ring-offset-background ${newRouteColor === c.value ? "ring-2 ring-foreground shadow-sm" : "hover:ring-1 hover:ring-foreground/30"}`}
                    style={{ background: c.value }}
                    aria-label={`Vælg farve ${c.name}`}
                  />
                ))}
              </div>
            </Section>
          </div>

          <SheetFooterBar>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateRouteOpen(false)} disabled={createRoute.isPending}>
                Annullér
              </Button>
              <Button onClick={handleConfirmCreateRoute} disabled={createRoute.isPending}>
                {createRoute.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Opret rute
              </Button>
            </div>
          </SheetFooterBar>
        </DialogContent>
      </Dialog>
      </div>

      {/* Slet rute bekræftelse — samme UX som i Ruteplanlæggeren. */}
      <AlertDialog open={!!routeToDelete} onOpenChange={(o) => !o && setRouteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet rute?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{routeToDelete?.name}</strong> og alle dens stops slettes permanent.
              Tilkoblede medarbejdere fjernes fra ruten, og aftalerne ryger tilbage i aftalepoolen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (routeToDelete) {
                  deleteRoute.mutate(routeToDelete.id, {
                    onSuccess: () => toast.success(`${routeToDelete.name} slettet`),
                  });
                  setRouteToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slet rute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DragOverlay — viser et flydende kort med kundenavn og pris mens
          aftalen trækkes (samme visuelle feedback som Ruteplanlæggeren). */}
      <DragOverlay>
        {draggingOrderId && activeDragOrder && (
          <div
            className="rounded-md border border-accent bg-card px-2.5 py-2 shadow-xl w-[200px] cursor-grabbing"
            style={{ transform: "rotate(-2deg)" }}
          >
            <div className="flex items-center justify-between gap-1.5">
              <p className="text-xs font-semibold truncate text-foreground">
                {activeDragOrder.customer_name || "Aftale"}
              </p>
              <span className="text-[10px] font-bold text-accent shrink-0 tabular-nums">
                {Math.round(Number(activeDragOrder.total_amount || 0))} kr
              </span>
            </div>
            {activeDragOrder.address && (
              <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                {activeDragOrder.address}
              </p>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default AftaleTab;
