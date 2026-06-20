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
  <div className="not-prose my-6 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
    {STATS.map((s) => (
      <div key={s.label} className="text-center">
        <p className="text-lg font-bold text-foreground sm:text-xl">{s.value}</p>
        <p className="text-xs text-muted-foreground">{s.label}</p>
      </div>
    ))}
  </div>
);

export default TrustBar;