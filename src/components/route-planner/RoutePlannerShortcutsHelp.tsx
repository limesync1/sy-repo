// Tastatur-genveje for ruteplanlæggeren — vist i en dialog så hele listen
// er læsbar (i stedet for en lille tooltip). Åbnes med "?" eller via knappen.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const SECTIONS: { title: string; rows: { keys: string[]; label: string }[] }[] = [
  {
    title: "Navigation",
    rows: [
      { keys: ["←"], label: "Forrige uge / måned" },
      { keys: ["→"], label: "Næste uge / måned" },
      { keys: ["T"], label: "Hop til i dag" },
      { keys: ["Esc"], label: "Luk valgt panel" },
    ],
  },
  {
    title: "Handlinger",
    rows: [
      { keys: ["N"], label: "Ny rute" },
      { keys: ["P"], label: "Print dagens ruter" },
      { keys: ["D"], label: "Vis dag som tidslinje" },
      { keys: ["⌘", "Z"], label: "Fortryd" },
      { keys: ["⌘", "⇧", "Z"], label: "Gentag" },
      { keys: ["?"], label: "Vis denne hjælp" },
    ],
  },
];

export default function RoutePlannerShortcutsHelp({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tastatur-genveje</DialogTitle>
          <DialogDescription>
            Hurtigere planlægning. Genveje ignoreres mens du skriver i et felt.
          </DialogDescription>
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