import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { comparisons } from "./comparisons";

const TITLE = "Skift fra SkvizBiz, Fenster eller et andet rutesystem";
const DESC = "Skift rutesystem uden at taste alt ind igen: Serviceydere flytter gratis dine kunder, aftaler og services fra SkvizBiz, Fenster eller andre systemer.";

const STEPS = [
  { h: "1. Opret din virksomhed gratis", p: "Du opretter en konto og vælger din branche. Det tager få minutter." },
  { h: "2. Send os dit dataudtræk", p: "Eksportér kunder, aftaler og services fra dit nuværende system, fx som Excel- eller CSV-fil, og send dem til kundeservice." },
  { h: "3. Vi flytter dine data gratis", p: "Vi lægger kunder, adresser, aftaler, intervaller og services ind for dig. Du tjekker resultatet, før du går i gang." },
  { h: "4. Kør videre fra dag ét", p: "Planlæg ruter, giv medarbejderne appen og fakturér via e-conomic eller Dinero." },
];

const MOVED = ["Kunder med adresser og kontaktoplysninger", "Faste aftaler og intervaller", "Services og priser (uden moms)", "Noter til kunder og adgangsforhold"];

const FAQ = [
  { q: "Koster det noget at få flyttet mine data?", a: "Nej. Kundeservice flytter dine data gratis, når du opretter dig." },
  { q: "Hvilke systemer kan I flytte fra?", a: "Fx SkvizBiz, Fenster og andre rutesystemer, regneark eller regnskabsprogrammer, så længe du kan eksportere dine data." },
  { q: "Skal jeg stoppe med mit gamle system med det samme?", a: "Nej. Du kan bruge det gamle system, indtil du har tjekket, at alt er flyttet korrekt." },
  { q: "Kan jeg stadig fakturere i e-conomic eller Dinero?", a: "Ja. Serviceydere sender fakturaer til e-conomic eller Dinero, og du vælger selv, hvor ofte kunderne faktureres." },
];

const SwitchSystemPage = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title={TITLE}
      description={DESC}
      canonicalPath="/software/skift-rutesystem"
      jsonLd={[{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }]}
    />
    <SiteNav />
    <main id="main" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-foreground/70">Til virksomheder</p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{TITLE}</h1>
      <p className="mt-4 text-lg leading-relaxed text-foreground/80">
        Det er svært at skifte system, når alle kunder og aftaler ligger i det gamle. Hos Serviceydere flytter kundeservice dine data <strong>gratis</strong>, så du ikke skal taste noget ind igen.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild size="lg" className="min-h-11"><Link to="/opret-virksomhed">Opret virksomhed gratis</Link></Button>
        <Button asChild size="lg" variant="outline" className="min-h-11"><Link to="/kontakt">Kontakt kundeservice</Link></Button>
      </div>

      <h2 className="mt-12 text-2xl font-semibold text-foreground">Sammenlign punkt for punkt</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {comparisons.map((c) => (
          <Link key={c.slug} to={`/software/sammenlign/${c.slug}`} className="group flex min-h-11 items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary">
            <span><span className="block text-lg font-semibold text-foreground">Serviceydere vs. {c.name}</span><span className="text-sm text-muted-foreground">Funktioner, pris og dataflytning</span></span>
            <ArrowRight className="h-5 w-5 text-foreground transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-semibold text-foreground">Sådan foregår skiftet</h2>
      <div className="mt-6 space-y-4">
        {STEPS.map((s) => (
          <section key={s.h} className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">{s.h}</h3>
            <p className="mt-2 leading-relaxed text-foreground/80">{s.p}</p>
          </section>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-semibold text-foreground">Det flytter vi for dig</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-foreground/80">
        {MOVED.map((m) => <li key={m}>{m}</li>)}
      </ul>

      <h2 className="mt-12 text-2xl font-semibold text-foreground">Det får du bagefter</h2>
      <p className="mt-4 leading-relaxed text-foreground/80">
        <Link to="/software/ruteplanlaegger" className="font-semibold underline underline-offset-2">Ruteplanlægning</Link>,{" "}
        en <Link to="/software/medarbejder-app" className="font-semibold underline underline-offset-2">medarbejder-app</Link> med billedbevis og manuel tidsregistrering,{" "}
        <Link to="/software/booking-og-tilbud" className="font-semibold underline underline-offset-2">booking og tilbud</Link> og{" "}
        <Link to="/software/fakturering-og-regnskab" className="font-semibold underline underline-offset-2">fakturering til e-conomic og Dinero</Link>. Se også <Link to="/software/priser" className="font-semibold underline underline-offset-2">priserne</Link>.
      </p>

      <h2 className="mt-12 text-2xl font-semibold text-foreground">Ofte stillede spørgsmål</h2>
      <div className="mt-4 space-y-4">
        {FAQ.map((f) => (
          <section key={f.q} className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">{f.q}</h3>
            <p className="mt-2 leading-relaxed text-foreground/80">{f.a}</p>
          </section>
        ))}
      </div>
    </main>
    <Footer />
  </div>
);

export default SwitchSystemPage;
