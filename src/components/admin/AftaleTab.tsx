import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrders, useServices, useBusinessSubscriptions } from "@/hooks/useDatabase";
import CreateManualOrderDialog from "@/components/route-planner/CreateManualOrderDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingCart, Pencil, Minus, Plus, Check, X, MessageSquare,
  ChevronDown, ChevronUp, Clock, User, Mail, Phone, ArrowRight,
  CheckCircle2, XCircle, RefreshCw, CalendarClock,
  Play, Pause,
} from "lucide-react";
import { INTERVAL_LABELS } from "@/types/service";
import { EmptyState, PageHeader, PrimaryButton } from "@/components/admin/shared/AdminUI";
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

/* ─── Status config ─── 
   The lifecycle:
   pending    → Ny bestilling, virksomheden skal svare (godkend/tilpas/afvis)
   confirmed  → Aftalt (enten direkte godkendt eller efter kundens accept af forslag)
   in_progress → Arbejdet er i gang
   completed  → Udført / afsluttet
   cancelled  → Annulleret
*/
const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string; dot: string }> = {
  pending: { label: "Ny bestilling", icon: Clock, color: "text-foreground", bg: "bg-secondary", dot: "bg-amber-500" },
  confirmed: { label: "Aftalt", icon: CheckCircle2, color: "text-foreground", bg: "bg-secondary", dot: "bg-blue-500" },
  in_progress: { label: "I gang", icon: RefreshCw, color: "text-foreground", bg: "bg-secondary", dot: "bg-violet-500" },
  completed: { label: "Udført", icon: CheckCircle2, color: "text-foreground", bg: "bg-secondary", dot: "bg-emerald-500" },
  cancelled: { label: "Annulleret", icon: XCircle, color: "text-foreground", bg: "bg-secondary", dot: "bg-destructive" },
};

const PRICING_LABELS: Record<string, string> = {
  fast_pris: "Fast pris",
  timepris: "Timepris",
  prisberegner: "Prisberegner",
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
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bestilte services</span>
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
        const daysUntil = nextDate ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
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
                  {daysUntil !== null && (
                    <span className={`text-[11px] font-bold ${
                      daysUntil <= 2 ? "text-destructive" : daysUntil <= 7 ? "text-amber-600" : "text-accent"
                    }`}>
                      {daysUntil <= 0 ? "I dag!" : `om ${daysUntil} dag${daysUntil !== 1 ? "e" : ""}`}
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
const AftaleTab = ({ businessId, businessName }: { businessId: string; businessName: string }) => {
  const { data: orders, isLoading } = useOrders(businessId);
  const { data: services } = useServices(businessId);
  const { data: subscriptions } = useBusinessSubscriptions(businessId);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<"accepted" | "rejected" | "adjusted">("accepted");
  const [responseMessage, setResponseMessage] = useState("");
  const [adjustedItems, setAdjustedItems] = useState<Record<string, AdjustmentItem[]>>({});
  const [createOrderOpen, setCreateOrderOpen] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Indlæser aftaler...</p>;

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

  const filteredOrders = filter === "all" ? orders
    : filter === "action_needed" ? actionNeeded
    : filter === "waiting" ? waitingForCustomer
    : orders?.filter(o => o.status === filter);

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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aftaler"
        description={`${orders?.length || 0} aftaler i alt${upcomingSubs.length > 0 ? ` · ${upcomingSubs.length} kommende services` : ""}`}
        action={
          <PrimaryButton onClick={() => setCreateOrderOpen(true)} icon={<ShoppingCart />}>
            Opret bestilling
          </PrimaryButton>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kommende services</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{upcomingSubs.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {[
            { key: "all", label: "Alle", count: counts.all || 0 },
            ...(actionNeeded.length > 0 ? [{ key: "action_needed", label: "Kræver handling", count: actionNeeded.length }] : []),
            ...(waitingForCustomer.length > 0 ? [{ key: "waiting", label: "Afventer kunde", count: waitingForCustomer.length }] : []),
            { key: "confirmed", label: "Aftalte", count: counts.confirmed || 0 },
            { key: "in_progress", label: "I gang", count: counts.in_progress || 0 },
            { key: "completed", label: "Udførte", count: counts.completed || 0 },
            { key: "cancelled", label: "Annullerede", count: counts.cancelled || 0 },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                filter === key
                  ? "border-border bg-secondary text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 tabular-nums">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming services alert */}
      {upcomingSubs.length > 0 && (
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Kommende services</span>
          </div>
          <div className="space-y-2">
            {upcomingSubs.slice(0, 4).map(sub => {
              const nextDate = new Date(sub.next_service_date!);
              const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const profile = (sub as any).profiles;
              return (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      daysUntil <= 2 ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"
                    }`}>{daysUntil <= 0 ? "!" : `${daysUntil}d`}</span>
                    <span className="font-medium text-foreground">{sub.service_name}</span>
                    <span className="text-muted-foreground">— {profile?.display_name || "Kunde"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {nextDate.toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
                  </span>
                </div>
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

      {/* Orders list */}
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
            const itemCount = (order as any).order_items?.length || 0;
            const cycles = (order as any).completed_cycles || 0;
            const nextDate = (order as any).next_service_date ? new Date((order as any).next_service_date) : null;
            const interval = getOrderInterval(order);
            const daysUntilNext = nextDate ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <Card key={order.id} className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden transition-all">
                {/* Order header */}
                <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full text-left px-4 py-3.5 transition-colors hover:bg-secondary/60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground truncate">{order.customer_name}</span>
                        {hasRecurring && (
                          <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                            <RefreshCw className="h-2.5 w-2.5" /> {INTERVAL_LABELS[interval] || interval}
                            {cycles > 0 && <span className="ml-0.5">· #{cycles}</span>}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{date.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}</span>
                        {itemCount > 0 && <span>· {itemCount} {itemCount === 1 ? "service" : "services"}</span>}
                        {nextDate && daysUntilNext !== null && (
                          <span className={`inline-flex items-center gap-1 font-medium ${
                            daysUntilNext <= 0 ? "text-destructive" : daysUntilNext <= 3 ? "text-amber-600" : "text-accent"
                          }`}>
                            <CalendarClock className="h-3 w-3" />
                            {daysUntilNext <= 0 ? "I dag!" : daysUntilNext === 1 ? "I morgen" : `om ${daysUntilNext} dage`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      <div className="text-right ml-1">
                        <span className="text-sm font-bold text-foreground">{currentTotal} kr</span>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

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

                    {/* Order items summary */}
                    <CustomerOrderSummary order={order} />

                    {/* Linked subscriptions (recurring service schedule) */}
                    <LinkedSubscriptionInfo orderId={order.id} subscriptions={allSubs} />

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
          title={filter === "all" ? "Ingen aftaler endnu" : "Ingen aftaler med dette filter"}
          description="Aftaler vises her når kunder bestiller."
        />
      )}

      <CreateManualOrderDialog
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        businessId={businessId}
        businessName={businessName}
      />
    </div>
  );
};

export default AftaleTab;
