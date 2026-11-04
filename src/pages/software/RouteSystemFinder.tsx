import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Info, RotateCcw } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { comparisons } from "./comparisons";
import { NEEDS, WORK, TEAM, finderResult, type Answers } from "./finder";

const opt = "min-h-11 w-full rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-colors";
const on = "border-primary bg-primary text-primary-foreground";
const off = "border-border bg-card text-foreground hover:border-primary/50";

const RouteSystemFinder = () => {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({ work: "", team: "", needs: [], current: "" });
  const steps = 4;
  const canNext = step === 0 ? !!a.work : step === 1 ? !!a.team : step === 2 ? true : !!a.current;
  const r = step >= steps ? finderResult(a) : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Rutesystem-finder: find det rette ruteprogram"
        description="Svar på 4 korte spørgsmål og se, hvilket ruteprogram der passer til din servicevirksomhed – med ærlig sammenligning af SkvizBiz, Fenster, RuteKlar og flere."
        canonicalPath="/software/rutesystem-finder"
      />
      <SiteNav />
      <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rutesystem-finder</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-[2.6rem]">Find det ruteprogram, der passer til dig</h1>
          <p className="mt-4 text-lg leading-relaxed text-foreground/80">Fire korte spørgsmål. Vi siger ærligt, hvad vi kan, og hvad vi ikke kan endnu.</p>
        </div>

        {!r && (
          <section className="mt-10 max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / steps) * 100}%` }} />
            </div>
            <p className="text-sm text-muted-foreground">Spørgsmål {step + 1} af {steps}</p>

            {step === 0 && (<>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Hvordan ser dit arbejde ud?</h2>
              <div className="mt-5 grid gap-3">{WORK.map((o) => (
                <button key={o.id} type="button" className={`${opt} ${a.work === o.id ? on : off}`} onClick={() => setA({ ...a, work: o.id })}>{o.label}</button>
              ))}</div>
            </>)}
            {step === 1 && (<>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Hvor mange er I?</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">{TEAM.map((o) => (
                <button key={o.id} type="button" className={`${opt} ${a.team === o.id ? on : off}`} onClick={() => setA({ ...a, team: o.id })}>{o.label}</button>
              ))}</div>
            </>)}
            {step === 2 && (<>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Hvad er vigtigt for dig?</h2>
              <p className="text-sm text-muted-foreground">Vælg gerne flere.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">{NEEDS.map((o) => {
                const sel = a.needs.includes(o.id);
                return (
                  <button key={o.id} type="button" aria-pressed={sel} className={`${opt} flex items-center gap-3 ${sel ? on : off}`}
                    onClick={() => setA({ ...a, needs: sel ? a.needs.filter((x) => x !== o.id) : [...a.needs, o.id] })}>
                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${sel ? "border-primary-foreground" : "border-border"}`}>{sel && <Check className="h-3.5 w-3.5" />}</span>
                    {o.label}
                  </button>
                );
              })}</div>
            </>)}
            {step === 3 && (<>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Hvad bruger du i dag?</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[...comparisons.map((c) => ({ id: c.slug, label: c.name })), { id: "none", label: "Papir, Excel eller intet" }, { id: "other", label: "Et andet program" }].map((o) => (
                  <button key={o.id} type="button" className={`${opt} ${a.current === o.id ? on : off}`} onClick={() => setA({ ...a, current: o.id })}>{o.label}</button>
                ))}
              </div>
            </>)}

            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="outline" className="min-h-11" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="mr-1 h-4 w-4" />Tilbage</Button>
              <Button className="min-h-11" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === steps - 1 ? "Se resultat" : "Næste"}<ArrowRight className="ml-1 h-4 w-4" /></Button>
            </div>
          </section>
        )}

        {r && (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border-2 border-primary/40 bg-card p-6 sm:p-8">
              <p className="text-sm font-semibold text-muted-foreground">Vores anbefaling</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">Serviceydere passer til {r.fitLabel}</h2>
              <p className="mt-3 text-[15px] leading-6 text-foreground/80">{r.intro}</p>
              {r.matched.length > 0 && (<>
                <h3 className="mt-6 font-semibold text-foreground">Det får du af det, du valgte</h3>
                <ul className="mt-3 space-y-2.5">{r.matched.map((m) => (
                  <li key={m} className="flex gap-3 text-[15px] leading-6 text-foreground"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />{m}</li>
                ))}</ul>
              </>)}
              {r.gaps.length > 0 && (<>
                <h3 className="mt-6 font-semibold text-foreground">Det har vi ikke endnu – ærligt sagt</h3>
                <ul className="mt-3 space-y-2.5">{r.gaps.map((g) => (
                  <li key={g} className="flex gap-3 text-[15px] leading-6 text-foreground"><Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />{g}</li>
                ))}</ul>
              </>)}
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="min-h-11"><Link to="/opret-virksomhed">Prøv Serviceydere gratis <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
                <Button variant="outline" size="lg" className="min-h-11" onClick={() => { setStep(0); setA({ work: "", team: "", needs: [], current: "" }); }}><RotateCcw className="mr-1 h-4 w-4" />Start forfra</Button>
              </div>
            </section>

            <aside className="space-y-4">
              {r.from && (
                <section className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="text-lg font-semibold text-foreground">Kommer du fra {r.from.name}?</h2>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Det er {r.from.name} god til</h3>
                  <ul className="mt-2 space-y-1.5 text-[15px] text-muted-foreground">{r.from.summaryThem.map((s) => <li key={s}>• {s}</li>)}</ul>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Derfor vælger mange Serviceydere</h3>
                  <ul className="mt-2 space-y-1.5">{r.from.summaryUs.map((s) => (
                    <li key={s} className="flex gap-2 text-[15px] text-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{s}</li>
                  ))}</ul>
                  <Link to={`/software/sammenlign/${r.from.slug}`} className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-foreground underline underline-offset-4">Se hele sammenligningen <ArrowRight className="h-4 w-4" /></Link>
                </section>
              )}
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">Skift uden besvær</h2>
                <p className="mt-2 text-[15px] leading-6 text-muted-foreground">Kundeservice flytter dine kunder, aftaler og services gratis fra dit nuværende system.</p>
                <Link to="/software/skift-rutesystem" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-foreground underline underline-offset-4">Sådan skifter du <ArrowRight className="h-4 w-4" /></Link>
              </section>
            </aside>
          </div>
        )}

        <p className="mt-10 max-w-3xl text-sm text-muted-foreground">
          Finderen er lavet af Serviceydere. Oplysninger om andre systemer kommer fra deres egne sider – se kilder og tjekdato under <Link to="/software/sammenlign" className="underline">Sammenlign rutesystemer</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default RouteSystemFinder;
