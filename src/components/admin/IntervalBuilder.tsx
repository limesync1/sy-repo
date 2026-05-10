import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Trash2, GripVertical, Check } from "lucide-react";
import {
  buildInterval,
  formatInterval,
  INTERVAL_UNITS,
  parseInterval,
  unitLabel,
  type IntervalUnit,
} from "@/lib/interval";
import { toLegacyEnum } from "@/lib/interval";

/**
 * Brugerflade til at definere hvilke intervaller en service skal kunne
 * bookes på. Brugeren tilføjer rækker bestående af "antal" + "enhed",
 * kan rykke rækkerne op/ned, og vi gemmer dem som det nye fleksible
 * `every_<N>_<unit>`-format (eller "engangskøb").
 *
 * Værdierne er fuldt bagudkompatible: legacy-strenge som "ugentlig"
 * vises som "Ugentligt" via den centrale `formatInterval`-funktion.
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

export const IntervalBuilder = ({ value, onChange }: IntervalBuilderProps) => {
  // Lokal "draft"-række så brugeren kan se og skrive før de tilføjer.
  const [draftN, setDraftN] = useState<string>("1");
  const [draftUnit, setDraftUnit] = useState<IntervalUnit>("week");
  const [includeOnce, setIncludeOnce] = useState<boolean>(value.includes("engangskøb"));

  const items = value.filter((v) => v !== "engangskøb");

  const commit = (nextItems: string[], includeOnceNext = includeOnce) => {
    const out: string[] = [];
    if (includeOnceNext) out.push("engangskøb");
    out.push(...nextItems);
    onChange(out.length > 0 ? out : ["engangskøb"]);
  };

  const add = () => {
    const n = Math.max(1, Math.min(999, parseInt(draftN, 10) || 1));
    // Normalisér til legacy enum-værdi hvor muligt, så DB-triggers og
    // agreements-enum stadig accepterer nyoprettede services. Falder ellers
    // tilbage til det nye `every_<N>_<unit>` format.
    const newKey = buildInterval(n, draftUnit);
    const key = toLegacyEnum(newKey) ?? newKey;
    if (items.includes(key)) return;
    commit([...items, key]);
    setDraftN("1");
  };

  const remove = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    commit(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    commit(next);
  };

  const toggleOnce = () => {
    const next = !includeOnce;
    setIncludeOnce(next);
    commit(items, next);
  };

  // Live-preview af hvad draften vil hedde
  const draftPreview = (() => {
    const n = Math.max(1, parseInt(draftN, 10) || 1);
    return formatInterval(buildInterval(n, draftUnit));
  })();

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

      {/* Liste af tilbagevendende intervaller */}
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tilbagevendende intervaller ({items.length})
          </p>
          <ul className="space-y-1.5">
            {items.map((iv, idx) => {
              const p = parseInterval(iv);
              const n = p?.n ?? 1;
              const unit = p?.unit ?? "week";
              return (
                <li
                  key={iv}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5"
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {formatInterval(iv)}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground tabular-nums">
                    {n} {unitLabel(n, unit)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Flyt op"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => move(idx, 1)}
                      disabled={idx === items.length - 1}
                      aria-label="Flyt ned"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => remove(idx)}
                      aria-label="Fjern"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Tilføj nyt interval */}
      <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tilføj interval
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
            onClick={add}
            className="h-9"
            disabled={items.includes(buildInterval(Math.max(1, parseInt(draftN, 10) || 1), draftUnit))}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Tilføj
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Vises som: <span className="font-medium text-foreground">{draftPreview}</span>
        </p>
      </div>
    </div>
  );
};

export default IntervalBuilder;