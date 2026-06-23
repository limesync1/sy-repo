/**
 * Lille tillids-stribe med nøgletal — designet til at sidde over fold på
 * SEO-sider for at sænke bounce og hæve CTR til tilbudsflowet.
 * Tallene er bevidst runde (mere troværdige + nemmere at vedligeholde).
 */
const STATS: { label: string; value: string }[] = [
  { value: "500+", label: "Verificerede udbydere" },
  { value: "12.000+", label: "Modtagne tilbud" },
  { value: "4,7/5", label: "Gennemsnitlig anmeldelse" },
  { value: "< 24 t", label: "Typisk svartid" },
];

const TrustBar = () => (
  <div className="not-prose my-8 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 shadow-panel sm:grid-cols-4">
    {STATS.map((s) => (
      <div key={s.label} className="rounded-xl bg-muted/35 px-4 py-4 text-center">
        <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{s.value}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{s.label}</p>
      </div>
    ))}
  </div>
);

export default TrustBar;