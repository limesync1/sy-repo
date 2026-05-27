// Avancerede filtre til "Aftaler uden rute": urgency, postnumre, services.
// Holdt i en lille popover så filterrækken ikke vokser ud over kortets bredde.
// State styres af forælderen — popover'en er ren UI + valg-events.
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X, MapPin, Clock, Wrench, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type UrgencyKey = "overdue" | "today" | "tomorrow" | "thisweek" | "later";

export const URGENCY_OPTIONS: { key: UrgencyKey; label: string; dot: string }[] = [
  { key: "overdue",  label: "Forsinket",   dot: "bg-destructive" },
  { key: "today",    label: "I dag",        dot: "bg-orange-500" },
  { key: "tomorrow", label: "I morgen",     dot: "bg-amber-500" },
  { key: "thisweek", label: "Denne uge",    dot: "bg-primary" },
  { key: "later",    label: "Senere / ukendt", dot: "bg-muted-foreground/40" },
];

type Facet = { value: string; label: string; count: number };

type Props = {
  urgencyValues: Set<UrgencyKey>;
  onUrgencyChange: (next: Set<UrgencyKey>) => void;
  postcodeValues: Set<string>;
  onPostcodeChange: (next: Set<string>) => void;
  serviceValues: Set<string>;
  onServiceChange: (next: Set<string>) => void;
  postcodeFacets: Facet[];
  serviceFacets: Facet[];
  /** Antal aktive filtre — vises som badge på trigger-knappen. */
  activeCount: number;
  onClearAll: () => void;
};

const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {icon}
      {title}
    </p>
    <div className="flex flex-wrap gap-1">{children}</div>
  </div>
);

const Chip = ({
  active, onClick, children, dot,
}: { active: boolean; onClick: () => void; children: React.ReactNode; dot?: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
      active
        ? "border-accent bg-accent text-accent-foreground"
        : "border-border bg-background text-foreground hover:bg-secondary",
    )}
  >
    {dot && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dot, active && "ring-1 ring-accent-foreground/60")} />}
    {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
    <span className="whitespace-nowrap">{children}</span>
  </button>
);

export default function UnassignedFiltersPopover({
  urgencyValues, onUrgencyChange,
  postcodeValues, onPostcodeChange,
  serviceValues, onServiceChange,
  postcodeFacets, serviceFacets,
  activeCount, onClearAll,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative h-7 w-7 inline-flex items-center justify-center rounded-md border bg-background transition-colors shrink-0",
            activeCount > 0
              ? "border-accent/60 text-accent"
              : "border-border text-muted-foreground hover:bg-secondary",
          )}
          aria-label={activeCount > 0 ? `Flere filtre (${activeCount} aktive)` : "Flere filtre"}
          title={activeCount > 0 ? `${activeCount} filter${activeCount === 1 ? "" : "e"} aktive` : "Filtrer på urgency, postnumre eller services"}
        >
          <Filter className="h-3.5 w-3.5" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Flere filtre</p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Ryd alle
            </button>
          )}
        </div>

        <Section icon={<Clock className="h-3 w-3" />} title="Urgency">
          {URGENCY_OPTIONS.map((u) => (
            <Chip
              key={u.key}
              active={urgencyValues.has(u.key)}
              onClick={() => onUrgencyChange(toggle(urgencyValues, u.key))}
              dot={u.dot}
            >
              {u.label}
            </Chip>
          ))}
        </Section>

        <Section icon={<MapPin className="h-3 w-3" />} title={`Postnumre (${postcodeFacets.length})`}>
          {postcodeFacets.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">Ingen aftaler med postnummer.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto w-full flex flex-wrap gap-1 pr-1">
              {postcodeFacets.map((f) => (
                <Chip
                  key={f.value}
                  active={postcodeValues.has(f.value)}
                  onClick={() => onPostcodeChange(toggle(postcodeValues, f.value))}
                >
                  {f.label} <span className="opacity-60">· {f.count}</span>
                </Chip>
              ))}
            </div>
          )}
        </Section>

        <Section icon={<Wrench className="h-3 w-3" />} title={`Services (${serviceFacets.length})`}>
          {serviceFacets.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">Ingen services i listen.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto w-full flex flex-wrap gap-1 pr-1">
              {serviceFacets.map((f) => (
                <Chip
                  key={f.value}
                  active={serviceValues.has(f.value)}
                  onClick={() => onServiceChange(toggle(serviceValues, f.value))}
                >
                  {f.label} <span className="opacity-60">· {f.count}</span>
                </Chip>
              ))}
            </div>
          )}
        </Section>
      </PopoverContent>
    </Popover>
  );
}