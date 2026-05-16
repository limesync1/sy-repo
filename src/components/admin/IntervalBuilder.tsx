import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Check, Sparkles, AlertCircle } from "lucide-react";
import {
  buildInterval,
  formatInterval,
  INTERVAL_UNITS,
  normalizeInterval,
  parseInterval,
  validateIntervalKey,
  validateServiceIntervals,
  type IntervalUnit,
} from "@/lib/interval";
import { toLegacyEnum } from "@/lib/interval";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Brugerflade til at definere hvilke intervaller en service skal kunne
 * bookes på. Understøtter:
 *  - Engangskøb-toggle
 *  - Drag-and-drop til at ændre rækkefølge (dnd-kit)
 *  - Hurtig-vælg-chips for de mest brugte intervaller
 *  - Smart normalisering: 30 dage → 1 måned, 7 dage → 1 uge, 12 mdr → 1 år, osv.
 */
export type IntervalBuilderProps = {
  value: string[];
  onChange: (next: string[]) => void;
};

const UNIT_LABEL_PLURAL: Record<IntervalUnit, string> = {
  day: "dage",
  week: "uger",
  month: "måneder",
  year: "år",
};

// Hurtig-chips: hyppigt brugte intervaller.
const QUICK_PICKS: { n: number; unit: IntervalUnit }[] = [
  { n: 1, unit: "week" },
  { n: 2, unit: "week" },
  { n: 3, unit: "week" },
  { n: 4, unit: "week" },
  { n: 1, unit: "month" },
  { n: 2, unit: "month" },
  { n: 3, unit: "month" },
  { n: 6, unit: "month" },
  { n: 1, unit: "year" },
];

const SortableRow = ({
  id,
  label,
  error,
  onRemove,
}: {
  id: string;
  label: string;
  error?: string | null;
  onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border bg-card px-2 py-2 shadow-sm ${
        error ? "border-destructive/60 bg-destructive/5" : "border-border"
      }`}
    >
      <button
        type="button"
        className="flex h-8 w-7 cursor-grab items-center justify-center text-muted-foreground/70 hover:text-foreground active:cursor-grabbing touch-none"
        aria-label="Træk for at flytte"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium text-foreground">
        {label}
        {error && (
          <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-normal text-destructive">
            <AlertCircle className="h-3 w-3" /> {error}
          </span>
        )}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={onRemove}
        aria-label="Fjern"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
};

export const IntervalBuilder = ({ value, onChange }: IntervalBuilderProps) => {
  const [draftN, setDraftN] = useState<string>("1");
  const [draftUnit, setDraftUnit] = useState<IntervalUnit>("week");

  const includeOnce = value.includes("engangskøb");
  const items = value.filter((v) => v !== "engangskøb");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commit = (nextItems: string[], includeOnceNext = includeOnce) => {
    const out: string[] = [];
    if (includeOnceNext) out.push("engangskøb");
    out.push(...nextItems);
    onChange(out.length > 0 ? out : ["engangskøb"]);
  };

  const buildKey = (n: number, unit: IntervalUnit): string => {
    const norm = normalizeInterval(n, unit);
    const newKey = buildInterval(norm.n, norm.unit);
    return toLegacyEnum(newKey) ?? newKey;
  };

  // Validér hele listen — viser samlet fejl + per-interval fejl. Bruges også
  // til at blokere "Tilføj" når draften ikke kan beregnes korrekt.
  const validation = useMemo(() => validateServiceIntervals(value), [value]);

  // Auto-rens: hvis listen indeholder ugyldige eller ikke-normaliserede
  // intervaller (fx legacy-data hvor "hver 2. uge" var gemt som 14 dage,
  // eller en duplicate), fjern dem eller erstat dem med den normaliserede
  // form. Det sikrer at brugeren aldrig kan ende med en uberegnelig
  // kombination — selv ikke ved at åbne en gammel service.
  useEffect(() => {
    const cleaned: string[] = [];
    const seen = new Set<string>();
    let changed = false;
    for (const raw of value) {
      if (raw === "engangskøb") {
        if (!seen.has(raw)) {
          seen.add(raw);
          cleaned.push(raw);
        } else {
          changed = true;
        }
        continue;
      }
      const parsed = parseInterval(raw);
      if (!parsed || parsed.once) {
        changed = true; // dropper ukendte nøgler
        continue;
      }
      // Normalisér + map tilbage til legacy-enum hvor muligt, så vi gemmer
      // den pæneste/kanoniske repræsentation (fx 14 dage → hver_14_dag).
      const key = buildKey(parsed.n, parsed.unit);
      if (validateIntervalKey(key)) {
        changed = true; // ugyldig (fx > grænserne) → fravælg automatisk
        continue;
      }
      if (key !== raw) changed = true;
      if (seen.has(key)) {
        changed = true;
        continue;
      }
      seen.add(key);
      cleaned.push(key);
    }
    if (!changed) return;
    onChange(cleaned.length > 0 ? cleaned : ["engangskøb"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join("|")]);

  const add = (n?: number, unit?: IntervalUnit) => {
    const useN = Math.max(1, Math.min(999, n ?? (parseInt(draftN, 10) || 1)));
    const useUnit = unit ?? draftUnit;
    const key = buildKey(useN, useUnit);
    const err = validateIntervalKey(key);
    if (err) return;
    if (items.includes(key)) return;
    commit([...items, key]);
    if (n === undefined) setDraftN("1");
  };

  const remove = (key: string) => {
    commit(items.filter((k) => k !== key));
  };

  const toggleOnce = () => {
    commit(items, !includeOnce);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.indexOf(String(active.id));
    const to = items.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    commit(arrayMove(items, from, to));
  };

  // Live-preview: viser den smart-normaliserede draft.
  const draftPreview = useMemo(() => {
    const n = Math.max(1, parseInt(draftN, 10) || 1);
    const norm = normalizeInterval(n, draftUnit);
    const original = formatInterval(buildInterval(n, draftUnit));
    const normalized = formatInterval(buildInterval(norm.n, norm.unit));
    const normalizedKey = buildKey(norm.n, norm.unit);
    const error = validateIntervalKey(normalizedKey);
    return {
      original,
      normalized,
      changed: norm.n !== n || norm.unit !== draftUnit,
      error,
      key: normalizedKey,
    };
  }, [draftN, draftUnit]);

  return (
    <div className="space-y-4">
      {/* Engangskøb-toggle */}
      <button
        type="button"
        onClick={toggleOnce}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
          includeOnce ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-secondary"
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Engangskøb</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Kunden bestiller én gang uden abonnement.</p>
        </div>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
            includeOnce ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
          }`}
        >
          {includeOnce && <Check className="h-3 w-3" />}
        </span>
      </button>

      {/* Hurtig-vælg-chips */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Hurtig-vælg
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PICKS.map(({ n, unit }) => {
            const key = buildKey(n, unit);
            const active = items.includes(key);
            const invalid = !!validateIntervalKey(key);
            return (
              <button
                key={key}
                type="button"
                disabled={invalid}
                onClick={() => {
                  if (invalid) return;
                  active ? remove(key) : add(n, unit);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  invalid
                    ? "cursor-not-allowed border-border bg-card text-muted-foreground/40 line-through"
                    :
                  active
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {active && <Check className="-ml-0.5 mr-1 inline h-3 w-3" />}
                {formatInterval(key)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste af tilbagevendende intervaller (drag-and-drop) */}
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Valgte abonnement-intervaller ({items.length}) — træk for at ændre rækkefølge
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1.5">
                {items.map((iv) => (
                  <SortableRow
                    key={iv}
                    id={iv}
                    label={formatInterval(iv)}
                    error={validation.errors[iv] ?? null}
                    onRemove={() => remove(iv)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Samlet validerings-banner */}
      {!validation.ok && validation.message && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{validation.message}. Ret eller fjern de markerede intervaller.</span>
        </div>
      )}

      {/* Brugerdefineret interval */}
      <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Brugerdefineret interval
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-foreground">Hver</span>
          <Input
            type="number"
            min={1}
            max={999}
            inputMode="numeric"
            value={draftN}
            onChange={(e) => setDraftN(e.target.value)}
            className="h-9 w-20 text-sm tabular-nums"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Select value={draftUnit} onValueChange={(v) => setDraftUnit(v as IntervalUnit)}>
            <SelectTrigger className="h-9 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {(parseInt(draftN, 10) || 1) === 1 ? u.singular : UNIT_LABEL_PLURAL[u.value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={() => add()}
            className="h-9"
            disabled={
              !!draftPreview.error || items.includes(draftPreview.key)
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Tilføj
          </Button>
        </div>
        <p
          className={`mt-2 flex items-center gap-1.5 text-[11px] ${
            draftPreview.error ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {draftPreview.error ? (
            <>
              <AlertCircle className="h-3 w-3" />
              <span>{draftPreview.error}</span>
            </>
          ) : draftPreview.changed ? (
            <>
              <Sparkles className="h-3 w-3 text-accent" />
              <span>
                Du skrev <span className="line-through">{draftPreview.original.toLowerCase()}</span> — vi
                gemmer det som <span className="font-medium text-foreground">{draftPreview.normalized}</span>
              </span>
            </>
          ) : (
            <>Vises som: <span className="font-medium text-foreground">{draftPreview.normalized}</span></>
          )}
        </p>
      </div>
    </div>
  );
};

export default IntervalBuilder;
