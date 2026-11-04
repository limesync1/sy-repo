import { CITY_STATS_SOURCE, cityStatInsights, findCityStat } from "./cityStats";

const n = (v: number) => v.toLocaleString("da-DK");

/** Lokale fakta fra Danmarks Statistik. Renderes også i prerenderet HTML. */
export function CityFactsBox({ slug, name }: { slug: string; name: string }) {
  const s = findCityStat(slug);
  if (!s) return null;
  return (
    <section className="not-prose my-8 rounded-xl border border-border bg-card p-5 sm:p-6" aria-labelledby={`fakta-${slug}`}>
      <h2 id={`fakta-${slug}`} className="m-0 text-xl font-semibold text-foreground">{name} i tal</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Indbyggere", n(s.population)],
          ["Beboede boliger", n(s.dwellings)],
          ["Etageboliger", `${s.flat} %`],
          ["Parcel- og rækkehuse", `${s.house + s.row} %`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-muted/50 p-3">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-lg font-semibold text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-5 text-base font-semibold text-foreground">Det betyder det for dig</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-relaxed text-foreground/90">
        {cityStatInsights(s).map((t) => <li key={t}>{t}</li>)}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        Tal for hele {s.municipality}. Kilde:{" "}
        <a href={CITY_STATS_SOURCE.url} className="underline" rel="noopener" target="_blank">{CITY_STATS_SOURCE.label}</a>.
        {" "}Sidst opdateret {new Date(CITY_STATS_SOURCE.updated).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}.
      </p>
    </section>
  );
}
