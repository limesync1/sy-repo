// Tastatur-genveje for ruteplanlæggeren — vist i en dialog så hele listen
// er læsbar (i stedet for en lille tooltip). Åbnes med "?" eller via knappen.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";
import { SheetHeaderBlock } from "./SheetSection";

const SECTIONS: { title: string; rows: { keys: string[]; label: string }[] }[] = [
  {
    title: "Navigation",
    rows: [
      { keys: ["←"], label: "Forrige uge / måned" },
      { keys: ["→"], label: "Næste uge / måned" },
      { keys: ["J"], label: "Næste dag" },
      { keys: ["K"], label: "Forrige dag" },
      { keys: ["T"], label: "Hop til i dag" },
      { keys: ["/"], label: "Søg i ”Aftaler uden rute”" },
      { keys: ["Esc"], label: "Luk valgt panel" },
    ],
  },
  {
    title: "Handlinger",
    rows: [
      { keys: ["N"], label: "Ny rute" },
      { keys: ["A"], label: "Auto-fordel aftaler uden rute" },
      { keys: ["O"], label: "Optimér åben rute" },
      { keys: ["P"], label: "Print dagens ruter" },
      { keys: ["D"], label: "Vis dagsoversigt" },
      { keys: ["⌘", "Z"], label: "Fortryd" },
      { keys: ["⌘", "⇧", "Z"], label: "Gentag" },
      { keys: ["?"], label: "Vis denne hjælp" },
    ],
  },
  {
    title: "Valg af aftaler",
    rows: [
      { keys: ["Klik"], label: "Vælg / fravælg én aftale" },
      { keys: ["⇧", "Klik"], label: "Vælg interval mellem to aftaler" },
      { keys: ["Esc"], label: "Ryd valg / luk panel" },
      { keys: ["Delete"], label: "Fjern valgt stop fra rute" },
    ],
  },
  {
    title: "Valg af ruter (i kalenderen)",
    rows: [
      { keys: ["⌘", "Klik"], label: "Vælg / fravælg én rute" },
      { keys: ["⇧", "Klik"], label: "Tilføj rute til valg" },
      { keys: ["Esc"], label: "Ryd valgte ruter" },
    ],
  },
];

export default function RoutePlannerShortcutsHelp({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="planner-overlay w-[calc(100vw-1rem)] max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-md">
        <DialogHeader className="planner-overlay-header space-y-0 text-left -mx-6 -mt-6 mb-2 px-5 py-3 pr-12 border-b">
          <SheetHeaderBlock
            icon={<Keyboard className="h-4 w-4" />}
            title={<DialogTitle className="text-base">Tastaturgenveje</DialogTitle>}
            description={<DialogDescription className="text-xs">Hurtigere planlægning. Genveje ignoreres, mens du skriver i et felt.</DialogDescription>}
          />
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.title}
              </p>
              <ul className="space-y-1.5">
                {s.rows.map((r) => (
                  <li key={r.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{r.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {r.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-secondary px-1.5 font-mono text-[10px] font-semibold text-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}