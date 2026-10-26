import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Minus,Plus,Pencil} from 'lucide-react';
import {Button} from '/dev-server/src/components/ui/button';
import {Input} from '/dev-server/src/components/ui/input';
import {Dialog,DialogContent,DialogTitle} from '/dev-server/src/components/ui/dialog';
import {getSmartStep,roundPrice} from '/dev-server/src/lib/service-pricing';
import {formatPrice} from '/dev-server/src/lib/price-format';
import {formatInterval} from '/dev-server/src/lib/interval';
import '/dev-server/src/index.css';
const parseNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
};


const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const PRICING_LABELS: Record<string, string> = {
  fast_pris: "Specifik pris",
  timepris: "Timepris",
  prisberegner: "Prisberegner",
};
const StepperInput = ({
  value, onChange, min, max, unit, label,
}: {
  value: number; onChange: (v: number) => void; min: number; max: number; unit: string; label: string;
}) => {
  const step = getSmartStep(unit, min, max);
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-y-2">
      <Button variant="secondary" type="button" aria-label={`Mindsk ${label}`} onClick={dec} disabled={value <= min}
        className="flex h-11 w-11 shrink-0 p-0 items-center justify-center rounded-l-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30">
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input aria-label={label} type="number" value={value}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(clampValue(v, min, max)); }}
        min={min} max={max} step={step}
        className="flex h-11 min-w-0 w-24 rounded-none items-center border-y border-border bg-card px-2 text-center text-sm font-semibold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button variant="secondary" type="button" aria-label={`Øg ${label}`} onClick={inc} disabled={value >= max}
        className="flex h-11 w-11 shrink-0 p-0 items-center justify-center rounded-r-lg border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30">
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <span className="ml-2 text-xs text-muted-foreground">{unit}</span>
    </div>
  );
};


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
        <div key={itemIdx} className="rounded-md border border-border overflow-hidden bg-card">
          <div className="px-4 py-3 bg-muted/30 border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <h4 className="text-sm font-semibold text-foreground">{item.service_name}</h4>
                <span className="text-xs text-muted-foreground">{PRICING_LABELS[item.pricing_type]}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-foreground">{roundPrice(item.total_price)}</span>
                <span className="ml-1 text-xs text-muted-foreground">kr</span>
              </div>
            </div>
          </div>

          {item.pricing_type === "fast_pris" && (
            <div className="px-4 py-3">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Pris uden moms (kr)</label>
              <Input type="number" value={item.total_price} aria-label={`Pris uden moms for ${item.service_name}`} className="h-11 w-full text-sm"
                onChange={(e) => onUpdateFixedPrice(orderId, itemIdx, parseFloat(e.target.value) || 0)} />
            </div>
          )}

          {item.details?.stepDetails && item.details.stepDetails.length > 0 && (
            <div className="divide-y divide-border">
              {item.details.stepDetails.map((sd, stepIdx) => (
                <div key={stepIdx} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">{sd.label}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">({formatPrice(sd.price_per_unit)}/{sd.unit})</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">{formatPrice(roundPrice(sd.subtotal))}</span>
                  </div>
                  <StepperInput
                    label={`Antal ${sd.label}`}
                    value={sd.value}
                    onChange={(v) => onUpdateStep(orderId, itemIdx, stepIdx, "value", v)}
                    min={sd.min_value}
                    max={sd.max_value}
                    unit={sd.unit}
                  />
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(5rem,1fr)_auto] items-center gap-2">
                    <span className="text-xs text-muted-foreground">Pris uden moms pr. {sd.unit}:</span>
                    <Input aria-label={`Pris uden moms pr. ${sd.unit} for ${sd.label}`} type="number" value={sd.price_per_unit}
                      onChange={(e) => onUpdateStep(orderId, itemIdx, stepIdx, "price_per_unit", parseNumber(e.target.value, 0))}
                      className="h-11 min-w-0 w-full rounded-md border border-border bg-card px-2 text-sm font-medium text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-muted-foreground">kr</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground/60">{sd.min_value}–{sd.max_value} {sd.unit}</p>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/40 px-4 py-3">
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
                    <Button variant="outline" aria-pressed={item.details.interval === iv} key={iv} type="button" onClick={() => onUpdateInterval(orderId, itemIdx, iv)}
                      className={`h-auto min-h-11 whitespace-normal rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                        item.details.interval === iv
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-accent/40"
                      }`}>
                      {formatInterval(iv)}
                    </Button>
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


function App(){
 const [items,setItems]=useState([{service_name:'Ekstra lang vinduespoleringsaftale med omfattende beskrivelse',pricing_type:'prisberegner',total_price:250,details:{interval:'engangskøb',pricingSnapshot:{interval_options:['engangskøb','dagligt']},stepDetails:[{label:'Store panoramavinduer på første sal',unit:'stk',value:10,min_value:1,max_value:100,price_per_unit:25,subtotal:250}]}},{service_name:'Fast pris for rengøring',pricing_type:'fast_pris',total_price:600,details:{pricingSnapshot:{}}}]);
 return <Dialog open><DialogContent className="appointment-details-overlay max-h-[calc(100dvh-1rem)] overflow-y-auto"><DialogTitle>Tilpas aftale</DialogTitle><AdjustmentEditor orderId="test" items={items} onUpdateStep={(id,i,j,field,value)=>setItems(prev=>prev.map((item,k)=>k!==i?item:{...item,details:{...item.details,stepDetails:item.details.stepDetails.map((step,l)=>l===j?{...step,[field]:value}:step)}}))} onUpdateInterval={(id,i,interval)=>setItems(prev=>prev.map((item,k)=>k===i?{...item,details:{...item.details,interval}}:item))} onUpdateFixedPrice={(id,i,total_price)=>setItems(prev=>prev.map((item,k)=>k===i?{...item,total_price}:item))}/></DialogContent></Dialog>;
}createRoot(document.getElementById('root')).render(<App/>);
