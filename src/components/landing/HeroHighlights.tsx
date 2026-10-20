import type { LucideIcon } from "lucide-react";

export type HeroHighlight = { icon: LucideIcon; title: string; text?: string };

/** Rolig glas-boks til højre i den blå top: korte, konkrete pointer for siden. */
export default function HeroHighlights({ title, items, numbered = false }: { title?: string; items: HeroHighlight[]; numbered?: boolean }) {
  return (
    <div className="rounded-2xl border border-ocean-foreground/20 bg-hero-bg/55 p-5 shadow-2xl backdrop-blur-md sm:p-6">
      {title && <p className="mb-4 text-sm font-semibold text-ocean-foreground">{title}</p>}
      <ul className="space-y-4">
        {items.map((it, i) => (
          <li key={it.title} className="flex gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ocean-foreground text-hero-bg">
              {numbered ? <span className="text-sm font-bold">{i + 1}</span> : <it.icon className="h-5 w-5" aria-hidden="true" />}
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[15px] font-semibold leading-snug text-ocean-foreground">{it.title}</span>
              {it.text && <span className="mt-0.5 block text-sm leading-6 text-ocean-foreground/80">{it.text}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
