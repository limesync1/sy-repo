import type { ReactNode } from "react";

export default function QuickAnswer({ facts, note }: { facts: ReactNode[]; note?: ReactNode }) {
  if (!facts.length) return null;

  return (
    <aside aria-label="Kort svar" className="not-prose my-6 rounded-lg border border-border bg-primary/5 p-4 sm:my-8 sm:p-5">
      <h2 className="m-0 text-base font-semibold leading-relaxed text-foreground">Kort svar</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-relaxed text-foreground">
        {facts.map((fact, index) => <li key={index} className="break-words">{fact}</li>)}
      </ul>
      {note && <p className="mb-0 mt-3 text-sm leading-relaxed text-muted-foreground">{note}</p>}
    </aside>
  );
}