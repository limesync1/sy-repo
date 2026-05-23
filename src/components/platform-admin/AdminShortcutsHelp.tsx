// AdminShortcutsHelp — let-tilgængelig oversigt over alle tastatur-genveje
// i platform-admin. Åbnes med "?" eller via knappen i headeren. Gør power-
// user-flow opdageligt uden at gemme det i dokumentation.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const SECTIONS: { title: string; rows: { keys: string[]; label: string }[] }[] = [
  {
    title: "Generelt",
    rows: [
      { keys: ["⌘", "K"], label: "Åbn kommando-palette" },
      { keys: ["?"], label: "Vis denne hjælp" },
      { keys: ["["], label: "Kollaps / udvid sidebar" },
      { keys: ["Esc"], label: "Luk dialoger / mobil-menu" },
    ],
  },
  {
    title: "Hop mellem faner (tryk g, derefter…)",
    rows: [
      { keys: ["g", "o"], label: "Overblik" },
      { keys: ["g", "v"], label: "Virksomheder" },
      { keys: ["g", "u"], label: "Brugere" },
      { keys: ["g", "r"], label: "Ordrer" },
      { keys: ["g", "s"], label: "Abonnementer" },
      { keys: ["g", "c"], label: "Livechat" },
      { keys: ["g", "d"], label: "Domæner" },
      { keys: ["g", "a"], label: "Aktivitetslog" },
      { keys: ["g", "h"], label: "Sundhed" },
      { keys: ["g", "m"], label: "Mails" },
    ],
  },
];

export default function AdminShortcutsHelp({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Tastatur-genveje</DialogTitle>
          <DialogDescription>
            Hurtigere navigation i platform-admin. Genveje ignoreres mens du
            skriver i input-felter.
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