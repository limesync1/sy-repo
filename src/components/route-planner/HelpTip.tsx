// HelpTip — lille kontekstuel hjælp i ruteplanlæggeren. Teksten hentes fra
// samme funktionskatalog som den offentlige funktionsguide og PDF-guiden
// (src/data/routePlannerFeatures.ts), så forklaringerne aldrig kan komme til
// at sige noget andet i UI'et end på /software/funktioner.
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { featureById, PLANNER_GUIDE_PDF_PATH, type PlannerFeature } from "@/data/routePlannerFeatures";

type Props = {
  /** Id på funktionen i funktionskataloget. */
  feature: PlannerFeature["id"];
  /** Ekstra klasser på knappen. */
  className?: string;
  /** Vis kun de første N trin (default: alle). */
  maxSteps?: number;
};

export default function HelpTip({ feature, className, maxSteps }: Props) {
  const f = featureById(feature);
  if (!f) return null;
  const steps = maxSteps ? f.steps.slice(0, maxSteps) : f.steps;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Hjælp: ${f.title}`}
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
            className,
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-80 p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-foreground">{f.title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{f.summary}</p>

        {steps.length > 0 && (
          <ol className="mt-3 space-y-1.5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs leading-5 text-foreground">
                <span className="mt-[1px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold tabular-nums">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          {f.shortcut ? (
            <span className="text-[11px] text-muted-foreground">
              Genvej: <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono text-[10px] font-semibold text-foreground">{f.shortcut}</kbd>
            </span>
          ) : <span />}
          <a
            href={PLANNER_GUIDE_PDF_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
          >
            Hele guiden
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
