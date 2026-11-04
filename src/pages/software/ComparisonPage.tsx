import { Link, Navigate, useParams } from "react-router-dom";
import { Check, X, Minus, HelpCircle, ArrowRight, ExternalLink } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { usePlatformPricing } from "@/hooks/useBusinessPlan";
import { comparisonBySlug, comparisons, type Cell } from "./comparisons";

const kr = (n: number) => n.toLocaleString("da-DK", { maximumFractionDigits: 0 });

const LABEL: Record<Cell["v"], string> = { yes: "Ja", no: "Nej", partial: "Delvist", unknown: "Ikke oplyst" };
const ICON = { yes: Check, no: X, partial: Minus, unknown: HelpCircle };
const TONE: Record<Cell["v"], string> = {
  yes: "bg-primary text-primary-foreground",
  no: "bg-destructive/15 text-destructive",
  partial: "bg-muted text-foreground",
  unknown: "bg-muted text-muted-foreground",
};

const FACT_FEATURES = new Set(["Oprettelsesgebyr", "Månedspris fra", "Månedspris", "Pris", "Ekstra bruger", "Ekstra medarbejder", "Binding", "Gratis prøve"]);

function CellView({ c, fact }: { c: Cell; fact?: boolean }) {
  if (fact && c.note) {
    return <span className="block text-[15px] font-semibold leading-6 text-foreground">{c.note}</span>;
  }
  const Icon = ICON[c.v];
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${TONE[c.v]}`} aria-hidden>
        <Icon className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0 text-[15px] leading-6 text-foreground">
        <span className="font-semibold">{LABEL[c.v]}</span>
        {c.note && <span className="block text-sm text-muted-foreground">{c.note}</span>}
      </span>
    </div>
  );
}

const ComparisonPage = () => {
  const { slug } = useParams();
  const c = comparisonBySlug(slug);
  const { data: pricing } = usePlatformPricing();
  if (!c) return <Navigate to="/software/skift-rutesystem" replace />;

  const loading = "Henter pris …";
  const usPrice: Record<string, string> = pricing
    ? {
        "Månedspris fra": `${kr(pricing.base_price_dkk)} kr./md. uden moms`,
        "Månedspris": `${kr(pricing.base_price_dkk)} kr./md. uden moms`,
        "Pris": `Fra ${kr(pricing.base_price_dkk)} kr./md. uden moms`,
        "Oprettelsesgebyr": pricing.startup_fee_dkk > 0 ? `${kr(pricing.startup_fee_dkk)} kr. uden moms` : "0 kr.",
        "Ekstra bruger": `${kr(pricing.price_per_employee_login_dkk)} kr./md. uden moms`,
        "Ekstra medarbejder": `${kr(pricing.price_per_employee_login_dkk)} kr./md. uden moms`,
      }
    : {};
  const rows = c.rows.map((r) =>
    r.us.note === "Se priser" ? { ...r, us: { ...r.us, note: usPrice[r.feature] ?? loading } } : r,
  );
  const groups = [...new Set(rows.map((r) => r.group))];
  const others = comparisons.filter((x) => x.slug !== c.slug);
  const title = `Serviceydere vs. ${c.name} (2026): funktioner, pris og alternativ`;
  const desc = `Se forskellen på Serviceydere og ${c.name} punkt for punkt: ruteplanlægning, medarbejder-app, fakturering, pris og dataflytning. Tjekket ${c.checked}.`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={title}
        description={desc}
        canonicalPath={`/software/sammenlign/${c.slug}`}
        jsonLd={[{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Software", item: "https://serviceydere.dk/software" },
            { "@type": "ListItem", position: 2, name: "Sammenlign", item: "https://serviceydere.dk/software/sammenlign" },
            { "@type": "ListItem", position: 3, name: c.name, item: `https://serviceydere.dk/software/sammenlign/${c.slug}` },
          ],
        }, {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }]}
      />
      <SiteNav />
      <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <nav aria-label="Brødkrumme" className="text-sm text-muted-foreground">
          <Link to="/software" className="underline-offset-2 hover:underline">Software</Link>
          {" / "}
          <Link to="/software/sammenlign" className="underline-offset-2 hover:underline">Sammenlign</Link>
          {" / "}<span className="text-foreground">{c.name}</span>
        </nav>

        <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-[2.6rem]">
          Serviceydere eller {c.name}?
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-foreground/80">
          {c.name} er {c.tagline.charAt(0).toLowerCase() + c.tagline.slice(1)} Her ser du ærligt, hvad hvert system kan, så du kan vælge det, der passer til dig.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Tjekket {c.checked} ud fra {c.name}s egne sider. Alle priser er uden moms.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border-2 border-primary/40 bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Vælg Serviceydere, hvis du vil have</h2>
            <ul className="mt-4 space-y-3">
              {c.summaryUs.map((s) => (
                <li key={s} className="flex gap-3 text-[15px] leading-6 text-foreground"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />{s}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Vælg {c.name}, hvis du har brug for</h2>
            <ul className="mt-4 space-y-3">
              {c.summaryThem.map((s) => (
                <li key={s} className="flex gap-3 text-[15px] leading-6 text-foreground"><Check className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />{s}</li>
              ))}
            </ul>
          </section>
        </div>

        <h2 className="mt-14 text-2xl font-semibold text-foreground">Funktion for funktion</h2>
        <p className="mt-2 text-muted-foreground">«Ikke oplyst» betyder, at vi ikke har kunnet finde det på {c.name}s egne sider.</p>

        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <section key={g} aria-labelledby={`g-${g}`}>
              <h3 id={`g-${g}`} className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{g}</h3>
              {/* Tabel fra tablet; kort på mobil så intet skal scrolles sidelæns. */}
              <div className="hidden overflow-hidden rounded-2xl border border-border sm:block">
                <table className="w-full text-left">
                  <thead className="bg-muted/60">
                    <tr>
                      <th scope="col" className="w-[34%] px-5 py-3 text-sm font-semibold text-foreground">Funktion</th>
                      <th scope="col" className="w-[33%] px-5 py-3 text-sm font-semibold text-foreground">Serviceydere</th>
                      <th scope="col" className="w-[33%] px-5 py-3 text-sm font-semibold text-foreground">{c.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter((r) => r.group === g).map((r) => (
                      <tr key={r.feature} className="border-t border-border bg-card align-top">
                        <th scope="row" className="px-5 py-4 text-[15px] font-medium text-foreground">{r.feature}</th>
                        <td className="px-5 py-4"><CellView c={r.us} fact={FACT_FEATURES.has(r.feature)} /></td>
                        <td className="px-5 py-4"><CellView c={r.them} fact={FACT_FEATURES.has(r.feature)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 sm:hidden">
                {rows.filter((r) => r.group === g).map((r) => (
                  <div key={r.feature} className="rounded-xl border border-border bg-card p-4">
                    <p className="font-semibold text-foreground">{r.feature}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <div><dt className="mb-1 text-xs font-semibold text-muted-foreground">Serviceydere</dt><dd><CellView c={r.us} fact={FACT_FEATURES.has(r.feature)} /></dd></div>
                      <div><dt className="mb-1 text-xs font-semibold text-muted-foreground">{c.name}</dt><dd><CellView c={r.them} fact={FACT_FEATURES.has(r.feature)} /></dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-14 rounded-2xl bg-foreground p-6 text-background sm:p-10">
          <h2 className="text-2xl font-semibold">Skift fra {c.name} uden at taste noget ind igen</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-background/80">Send dit udtræk til kundeservice, så flytter vi kunder, aftaler og services gratis. Du kan bruge {c.name}, indtil du har tjekket, at alt er på plads.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary" className="min-h-11"><Link to="/opret-virksomhed">Opret virksomhed gratis <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="min-h-11 border-background/40 bg-transparent text-background hover:bg-background/10 hover:text-background"><Link to="/software/priser">Se priser</Link></Button>
          </div>
        </section>

        <h2 className="mt-14 text-2xl font-semibold text-foreground">Ofte stillede spørgsmål</h2>
        <div className="mt-4 space-y-3">
          {c.faq.map((f) => (
            <details key={f.q} className="group rounded-xl border border-border bg-card p-5 open:shadow-sm">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold text-foreground">
                {f.q}<span className="text-xl text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-2 leading-relaxed text-foreground/80">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-14 grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kilder</h2>
            <ul className="mt-3 space-y-2">
              {c.sources.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener nofollow" className="inline-flex min-h-11 items-center gap-1.5 text-foreground underline underline-offset-2">{s.label}<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a></li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Sammenligningen bygger kun på offentligt tilgængelige oplysninger på den angivne dato og kan have ændret sig siden. {c.name} er et varemærke tilhørende sin ejer og nævnes kun for at kunne sammenligne. Serviceydere er ikke tilknyttet {c.name}.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Ser du en fejl? <Link to="/kontakt" className="underline underline-offset-2">Skriv til os</Link>, så retter vi den.</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Andre sammenligninger</h2>
            <ul className="mt-3 space-y-2">
              {others.map((o) => (
                <li key={o.slug}><Link to={`/software/sammenlign/${o.slug}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-foreground underline underline-offset-2">Serviceydere vs. {o.name}<ArrowRight className="h-4 w-4" aria-hidden /></Link></li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ComparisonPage;
