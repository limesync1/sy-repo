/**
 * Tillids-stribe med kvalitative trust-signaler. Bruger ikke fabrikerede
 * tal (brugerantal, anmeldelser, svartider) — kun ting vi reelt kan
 * stå inde for som platform.
 */
const ITEMS: { title: string; body: string }[] = [
  { title: "CVR-verificeret", body: "Alle udbydere tjekkes mod CVR-registret." },
  { title: "Gratis at bruge", body: "Du betaler kun for selve opgaven — aldrig for tilbud." },
  { title: "Op til 3 tilbud", body: "Beskriv opgaven én gang, modtag flere uforpligtende tilbud." },
  { title: "Direkte kontakt", body: "Du taler direkte med firmaet — ingen mellemled." },
];

const TrustBar = () => (
  <div className="not-prose my-8 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-panel sm:grid-cols-2 lg:grid-cols-4">
    {ITEMS.map((s) => (
      <div key={s.title} className="rounded-xl bg-muted/35 px-4 py-4">
        <p className="text-sm font-semibold tracking-tight text-foreground">{s.title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{s.body}</p>
      </div>
    ))}
  </div>
);

export default TrustBar;