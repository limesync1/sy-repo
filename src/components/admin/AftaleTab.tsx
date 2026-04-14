import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrders, useServices, useBusinessSubscriptions } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShoppingCart, Pencil, Minus, Plus, Check, X, MessageSquare,
  ChevronDown, ChevronUp, Clock, User, Mail, Phone, ArrowRight,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw, CalendarClock,
} from "lucide-react";
import { INTERVAL_LABELS } from "@/types/service";
import {
  buildPricingSnapshot,
  getSmartStep,
  roundPrice,
  type PricingSnapshot,
  type ServiceStepDetail,
} from "@/lib/service-pricing";
import type { Service, CalculatorStep } from "@/hooks/useDatabase";

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

/* ─── Status config ─── */
const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string; dot: string }> = {
  pending: { label: "Afventer svar", icon: Clock, color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-400" },
  confirmed: { label: "Godkendt", icon: CheckCircle2, color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-400" },
  in_progress: { label: "I gang", icon: RefreshCw, color: "text-purple-700", bg: "bg-purple-50", dot: "bg-purple-400" },
  completed: { label: "Afsluttet", icon: CheckCircle2, color: "text-green-700", bg: "bg-green-50", dot: "bg-green-400" },
  cancelled: { label: "Annulleret", icon: XCircle, color: "text-red-700", bg: "bg-red-50", dot: "bg-red-400" },
};

const RESPONSE_CONFIG: Record<string, { label: string; color: string }> = {
  accepted: { label: "Godkendt", color: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Afvist", color: "bg-red-50 text-red-700 border-red-200" },
  adjusted: { label: "Tilpasset", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

const PRICING_LABELS: Record<string, string> = {
  fast_pris: "Fast pris",
  timepris: "Timepris",
  prisberegner: "Prisberegner",
};

const getNextStatuses = (current: string): string[] => {
  const map: Record<string, string[]> = {
    confirmed: ["confirmed", "in_progress", "completed", "cancelled"],
    in_progress: ["in_progress", "completed", "cancelled"],
    completed: ["completed"],
    cancelled: ["cancelled"],
  };
  return map[current] || [];
};

/* ─── Stepper Input (matches DynamicServiceCard) ─── */
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

/* ─── Order Detail: What the customer ordered ─── */
const CustomerOrderSummary = ({ order }: { order: any }) => {
  const items = (order.order_items || []) as any[];
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kundens bestilling</span>
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

/* ─── Adjustment Editor (mirrors DynamicServiceCard exactly) ─── */
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
          {/* Header */}
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

          {/* Fixed price editor */}
          {item.pricing_type === "fast_pris" && (
            <div className="px-4 py-3">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Pris (kr)</label>
              <Input type="number" value={item.total_price} className="h-9 text-sm w-40"
                onChange={(e) => onUpdateFixedPrice(orderId, itemIdx, parseFloat(e.target.value) || 0)} />
            </div>
          )}

          {/* Step-based editor (timepris + prisberegner) */}
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
              {/* Total row */}
              <div className="flex items-center justify-between bg-secondary/40 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">I alt</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-foreground">{roundPrice(item.total_price)}</span>
                  <span className="text-sm text-muted-foreground">kr</span>
                </div>
              </div>
            </div>
          )}

          {/* Interval selector */}
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

/* ─── Previously sent adjustment display ─── */
const AdjustmentDisplay = ({ order }: { order: any }) => {
  if (order.business_response !== "adjusted" || !order.adjusted_details) return null;
  const items = (order.adjusted_details as any)?.items || [];

  return (
    <div className="rounded-xl border border-amber-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-xs font-semibold text-amber-800">Dit seneste tilpasningsforslag</span>
      </div>
      {items.map((item: any, idx: number) => (
        <div key={idx} className="border-b border-amber-100 last:border-b-0 px-4 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-sm font-medium text-foreground">{item.service_name}</span>
              {item.details?.interval && item.details.interval !== "engangskøb" && (
                <span className="ml-2 text-[11px] text-amber-700">{INTERVAL_LABELS[item.details.interval] || item.details.interval}</span>
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
      <div className="px-4 py-2 flex justify-between bg-amber-50 border-t border-amber-200">
        <span className="text-sm font-bold text-foreground">Tilpasset pris</span>
        <span className="text-sm font-bold text-foreground">{order.adjusted_amount} kr</span>
      </div>
    </div>
  );
};

/* ─── Main AftaleTab ─── */
const AftaleTab = ({ businessId }: { businessId: string }) => {
  const { data: orders, isLoading } = useOrders(businessId);
  const { data: services } = useServices(businessId);
  const { data: subscriptions } = useBusinessSubscriptions(businessId);
  const qc = useQueryClient();
  const [activeView, setActiveView] = useState<"orders" | "subscriptions">("orders");
  const [filter, setFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<"accepted" | "rejected" | "adjusted">("accepted");
  const [responseMessage, setResponseMessage] = useState("");
  const [adjustedItems, setAdjustedItems] = useState<Record<string, AdjustmentItem[]>>({});

  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser aftaler...</p>;

  const servicesById = (services || []).reduce<Record<string, BusinessService>>((acc, s) => {
    acc[s.id] = s as BusinessService;
    return acc;
  }, {});

  const filteredOrders = filter === "all" ? orders : orders?.filter((o) => o.status === filter);
  const counts: Record<string, number> = { all: orders?.length || 0 };
  orders?.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

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

  const handleStatusChange = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status opdateret til "${STATUS_CONFIG[status]?.label}"`);
    qc.invalidateQueries({ queryKey: ["orders"] });
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
        status: responseType === "accepted" ? "confirmed" as const
          : responseType === "rejected" ? "cancelled" as const
          : "pending" as const,
      }).eq("id", orderId);
      if (error) throw error;

      toast.success(
        responseType === "accepted" ? "Aftale godkendt!"
        : responseType === "rejected" ? "Aftale afvist"
        : "Tilpasningsforslag sendt"
      );
      setRespondingTo(null);
      setResponseMessage("");
      setAdjustedItems((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const pendingCount = counts["pending"] || 0;

  // Active subscriptions with upcoming dates
  const activeSubscriptions = (subscriptions || []).filter(s => s.status === "active");
  const upcomingSubs = activeSubscriptions
    .filter(s => s.next_service_date)
    .sort((a, b) => new Date(a.next_service_date!).getTime() - new Date(b.next_service_date!).getTime());

  return (
    <div className="space-y-5">
      {/* Header with view toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Aftaler & Abonnementer</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {orders?.length || 0} bestillinger · {activeSubscriptions.length} aktive abonnementer
          </p>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setActiveView("orders")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${activeView === "orders" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground"}`}>
            Bestillinger
          </button>
          <button onClick={() => setActiveView("subscriptions")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${activeView === "subscriptions" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground"}`}>
            Abonnementer {activeSubscriptions.length > 0 && `(${activeSubscriptions.length})`}
          </button>
        </div>
      </div>

      {/* Upcoming services alert */}
      {activeView === "orders" && upcomingSubs.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Kommende services</span>
          </div>
          <div className="space-y-1.5">
            {upcomingSubs.slice(0, 3).map(sub => {
              const nextDate = new Date(sub.next_service_date!);
              const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const profile = (sub as any).profiles;
              return (
                <div key={sub.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      daysUntil <= 2 ? "bg-destructive/10 text-destructive" : daysUntil <= 7 ? "bg-amber-500/10 text-amber-700" : "bg-accent/10 text-accent"
                    }`}>{daysUntil}d</span>
                    <span className="font-medium text-foreground">{sub.service_name}</span>
                    <span className="text-muted-foreground">— {profile?.display_name || "Kunde"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {nextDate.toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
                  </span>
                </div>
              );
            })}
            {upcomingSubs.length > 3 && (
              <button onClick={() => setActiveView("subscriptions")} className="text-xs text-accent hover:underline mt-1">
                Se alle {upcomingSubs.length} abonnementer →
              </button>
            )}
          </div>
        </div>
      )}

      {activeView === "subscriptions" ? (
        /* Subscriptions view */
        <SubscriptionsView subscriptions={subscriptions || []} />
      ) : (
        /* Orders view */
        <>

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">{pendingCount} {pendingCount === 1 ? "aftale" : "aftaler"} afventer dit svar</p>
            <p className="text-xs text-amber-700">Godkend, tilpas eller afvis for at give kunden besked</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {[{ key: "all", label: "Alle" }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              filter === key
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground after:rounded-t"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {label}
            {(counts[key] || 0) > 0 && (
              <span className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                filter === key ? "bg-foreground/10" : "bg-muted"
              }`}>{counts[key] || 0}</span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filteredOrders && filteredOrders.length > 0 ? (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const isExpanded = expandedOrder === order.id;
            const isResponding = respondingTo === order.id;
            const resp = order.business_response;
            const respCfg = resp ? RESPONSE_CONFIG[resp] : null;
            const canRespond = order.status === "pending";
            const statusOptions = getNextStatuses(order.status);
            const originalTotal = order.total_amount;
            const currentTotal = order.adjusted_amount || originalTotal;
            const hasAdjustment = order.adjusted_amount && order.adjusted_amount !== originalTotal;
            const date = new Date(order.created_at);
            const itemCount = (order as any).order_items?.length || 0;

            return (
              <Card key={order.id} className={`rounded-xl shadow-sm overflow-hidden transition-all ${
                canRespond ? "border-amber-200 bg-amber-50/20" : "border-border"
              }`}>
                {/* Order header — clickable */}
                <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full text-left px-4 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground truncate">{order.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{date.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}</span>
                        {itemCount > 0 && <span>· {itemCount} {itemCount === 1 ? "service" : "services"}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {respCfg && !canRespond && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${respCfg.color}`}>
                          {respCfg.label}
                        </span>
                      )}
                      <div className="text-right ml-1">
                        <span className="text-sm font-bold text-foreground">{currentTotal} kr</span>
                        {hasAdjustment && (
                          <span className="block text-[11px] text-muted-foreground line-through">{originalTotal} kr</span>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/5 px-4 py-4 space-y-4">
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

                    {/* Order items summary */}
                    <CustomerOrderSummary order={order} />

                    {/* Customer note */}
                    {order.notes && (
                      <div className="flex gap-2 rounded-xl bg-card border border-border px-3.5 py-2.5">
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground">{order.notes}</p>
                      </div>
                    )}

                    {/* Business response (if already responded) */}
                    {order.business_message && !isResponding && (
                      <div className="rounded-xl bg-accent/5 border border-accent/20 px-4 py-3">
                        <p className="text-xs font-semibold text-accent mb-1">Din besked:</p>
                        <p className="text-sm text-foreground">{order.business_message}</p>
                      </div>
                    )}

                    {/* Previous adjustment display */}
                    {!isResponding && <AdjustmentDisplay order={order} />}

                    {/* Action buttons for pending orders */}
                    {canRespond && !isResponding && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); setRespondingTo(order.id); setResponseType("accepted"); }}
                          className="gap-1.5 rounded-xl text-xs bg-green-600 text-white hover:bg-green-700">
                          <Check className="h-3.5 w-3.5" /> Godkend aftale
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation(); initAdjustedItems(order);
                          setRespondingTo(order.id); setResponseType("adjusted");
                        }} className="gap-1.5 rounded-xl text-xs">
                          <Pencil className="h-3.5 w-3.5" /> Tilpas aftale
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setRespondingTo(order.id); setResponseType("rejected"); }}
                          className="gap-1.5 rounded-xl text-xs text-destructive hover:text-destructive hover:bg-destructive/5">
                          <X className="h-3.5 w-3.5" /> Afvis
                        </Button>
                      </div>
                    )}

                    {/* Response form */}
                    {isResponding && (
                      <div className="rounded-xl border-2 border-foreground/10 bg-card p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                        {/* Response type selector */}
                        <div className="flex gap-2">
                          {(["accepted", "adjusted", "rejected"] as const).map((type) => (
                            <button key={type} onClick={() => {
                              setResponseType(type);
                              if (type === "adjusted" && !adjustedItems[order.id]) initAdjustedItems(order);
                            }}
                              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                                responseType === type
                                  ? type === "accepted" ? "border-green-500 bg-green-600 text-white"
                                  : type === "rejected" ? "border-destructive bg-destructive text-destructive-foreground"
                                  : "border-foreground bg-foreground text-background"
                                  : "border-border bg-card text-muted-foreground hover:border-foreground/30"
                              }`}>
                              {type === "accepted" ? <><Check className="h-3.5 w-3.5" /> Godkend</>
                                : type === "adjusted" ? <><Pencil className="h-3.5 w-3.5" /> Tilpas</>
                                : <><X className="h-3.5 w-3.5" /> Afvis</>}
                            </button>
                          ))}
                        </div>

                        {/* Adjustment editor */}
                        {responseType === "adjusted" && adjustedItems[order.id] && (
                          <div className="space-y-3">
                            <AdjustmentEditor
                              orderId={order.id}
                              items={adjustedItems[order.id]}
                              onUpdateStep={updateAdjustedStep}
                              onUpdateInterval={updateAdjustedInterval}
                              onUpdateFixedPrice={updateAdjustedFixedPrice}
                            />

                            {/* Price comparison */}
                            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
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

                        {/* Message */}
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

                        {/* Submit buttons */}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleResponse(order.id)}
                            className={`rounded-xl text-xs ${
                              responseType === "accepted" ? "bg-green-600 hover:bg-green-700 text-white"
                              : responseType === "rejected" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              : "bg-foreground text-background hover:bg-foreground/90"
                            }`}>
                            {responseType === "accepted" ? "Bekræft godkendelse"
                              : responseType === "rejected" ? "Bekræft afvisning"
                              : `Send tilpasning – ${roundPrice(getAdjustedTotal(order.id))} kr`}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setRespondingTo(null); setResponseMessage(""); }}
                            className="rounded-xl text-xs">Annuller</Button>
                        </div>
                      </div>
                    )}

                    {/* Status changer for confirmed+ orders */}
                    {statusOptions.length > 1 && !isResponding && (
                      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Opdater status</label>
                        <Select value={order.status} onValueChange={(s) => handleStatusChange(order.id, s)}>
                          <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-xl border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-3 rounded-xl bg-muted p-2.5">
              <ShoppingCart className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {filter === "all" ? "Ingen aftaler endnu" : `Ingen aftaler med status "${STATUS_CONFIG[filter]?.label}"`}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">Aftaler vises her når kunder bestiller.</p>
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
};

/* ─── Subscriptions View ─── */
const SubscriptionsView = ({ subscriptions }: { subscriptions: any[] }) => {
  const active = subscriptions.filter(s => s.status === "active");
  const paused = subscriptions.filter(s => s.status === "paused");
  const cancelled = subscriptions.filter(s => s.status === "cancelled");
  const [viewFilter, setViewFilter] = useState<"active" | "paused" | "cancelled">("active");

  const filtered = viewFilter === "active" ? active : viewFilter === "paused" ? paused : cancelled;

  const INTERVAL_MAP: Record<string, string> = {
    ugentlig: "Ugentlig", hver_14_dag: "Hver 14. dag", månedlig: "Månedlig", kvartalsvis: "Kvartalsvis", engangskøb: "Engangskøb",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border">
        {([["active", "Aktive", active.length], ["paused", "Pauserede", paused.length], ["cancelled", "Annullerede", cancelled.length]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setViewFilter(key)}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${viewFilter === key
              ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground after:rounded-t"
              : "text-muted-foreground hover:text-foreground"}`}>
            {label}
            {count > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2.5">
          {filtered.map(sub => {
            const profile = (sub as any).profiles;
            const nextDate = sub.next_service_date ? new Date(sub.next_service_date) : null;
            const daysUntil = nextDate ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <Card key={sub.id} className="rounded-xl border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{sub.service_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {profile?.display_name || "Ukendt kunde"}
                        {profile?.phone && <span className="ml-2">· {profile.phone}</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-foreground">{sub.total_price} kr</span>
                      <span className="block text-[11px] text-muted-foreground">{INTERVAL_MAP[sub.interval] || sub.interval}</span>
                    </div>
                  </div>

                  {nextDate && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Næste service:</span>
                      <span className="text-xs font-semibold text-foreground">
                        {nextDate.toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}
                      </span>
                      {daysUntil !== null && (
                        <span className={`ml-auto text-[11px] font-bold ${
                          daysUntil <= 2 ? "text-destructive" : daysUntil <= 7 ? "text-amber-600" : "text-accent"
                        }`}>
                          {daysUntil <= 0 ? "I dag!" : `om ${daysUntil} dag${daysUntil !== 1 ? "e" : ""}`}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Oprettet {new Date(sub.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    {sub.paused_at && ` · Pauseret ${new Date(sub.paused_at).toLocaleDateString("da-DK")}`}
                    {sub.cancelled_at && ` · Annulleret ${new Date(sub.cancelled_at).toLocaleDateString("da-DK")}`}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-xl border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CalendarClock className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium text-foreground">Ingen {viewFilter === "active" ? "aktive" : viewFilter === "paused" ? "pauserede" : "annullerede"} abonnementer</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AftaleTab;
