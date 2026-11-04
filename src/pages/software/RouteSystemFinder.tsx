import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Info, RotateCcw, Sparkles, ShieldCheck, Clock, ListChecks } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { comparisons } from "./comparisons";
import { NEEDS, WORK, TEAM, PRIORITY, finderResult, type Answers } from "./finder";

const opt = "min-h-14 w-full rounded-xl border-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const on = "border-primary bg-primary text-primary-foreground";
const off = "border-border bg-background text-foreground hover:border-primary/60";
const empty: Answers = { work: "", team: "", needs: [], current: "", priority: "" };
const TITLES = ["Hvordan ser dit arbejde ud?", "Hvor mange er I?", "Hvad er vigtigst for dig?", "Hvilke funktioner skal du bruge?", "Hvad bruger du i dag?"];
const ORIGIN = "https://serviceydere.dk";

type O = { id: string; label: string; hint?: string };
const Choice = ({ o, sel, onClick }: { o: O; sel: boolean; onClick: () => void }) => (
  <button type="button" aria-pressed={sel} className={`${opt} ${sel ? on : off}`} onClick={onClick}>
    <span className="block text-[15px] font-semibold leading-snug">{o.label}</span>
    {o.hint && <span className={`mt-0.5 block text-sm ${sel ? "text-primary-foreground/85" : "text-muted-foreground"}`}>{o.hint}</span>}
  </button>
);

const RouteSystemFinder = () => {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(empty);
  const steps = TITLES.length;
  const canNext = [!!a.work, !!a.team, !!a.priority, true, !!a.current][step];
  const r = step >= steps ? finderResult(a) : null;
  const pick = (k: keyof Answers, v: string) => setA({ ...a, [k]: v });
  const summary = [
    WORK.find((x) => x.id === a.work)?.label,
    TEAM.find((x) => x.id === a.team)?.label,
    PRIORITY.find((x) => x.id === a.priority)?.label,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Rutesystem-finder 2026: find det bedste ruteprogram"
        description="Gratis test: svar på 5 korte spørgsmål og få et begrundet match til din servicevirksomhed – med ærlig sammenligning af SkvizBiz, Fenster, RuteKlar, Minuba og flere."
        canonicalPath="/software/rutesystem-finder"
        jsonLd={[
          { "@context": "https://schema.org", "@type": "WebApplication", name: "Rutesystem-finder", url: `${ORIGIN}/software/rutesystem-finder`, applicationCategory: "BusinessApplication", operatingSystem: "Web", inLanguage: "da-DK", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" }, publisher: { "@type": "Organization", name: "Serviceydere", url: ORIGIN } },
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: `${ORIGIN}/` },
            { "@type": "ListItem", position: 2, name: "Sammenlign rutesystemer", item: `${ORIGIN}/software/sammenlign` },
            { "@type": "ListItem", position: 3, name: "Rutesystem-finder", item: `${ORIGIN}/software/rutesystem-finder` },
          ] },
        ]}
      />
      <SiteNav />
      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <nav aria-label="Brødkrumme" className="text-sm text-muted-foreground">
          <Link to="/software/sammenlign" className="underline-offset-4 hover:underline">Sammenlign rutesystemer</Link> <span aria-hidden>/</span> Rutesystem-finder
        </nav>
        <div className="mt-4 max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-[2.6rem]">Find det ruteprogram, der passer til dig</h1>
          <p className="mt-4 text-lg leading-relaxed text-foreground/80">Fem korte spørgsmål. Du får et match med en klar begrundelse – og vi siger ærligt, hvad vi ikke kan endnu.</p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/80">
            <li className="flex items-center gap-2"><Clock className="h-4 w-4" aria-hidden />Tager 1 minut</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden />Ingen e-mail krævet</li>
            <li className="flex items-center gap-2"><ListChecks className="h-4 w-4" aria-hidden />Fakta fra de andres egne sider</li>
          </ul>
        </div>

        {!r && (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_300px]">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8" aria-live="polite">
              <ol className="mb-6 grid grid-cols-5 gap-2" aria-label={`Spørgsmål ${step + 1} af ${steps}`}>
                {TITLES.map((_, i) => <li key={i} className={`h-2 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
              </ol>
              <p className="text-sm font-medium text-muted-foreground">Spørgsmål {step + 1} af {steps}</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">{TITLES[step]}</h2>
              {step === 3 && <p className="mt-1 text-sm text-muted-foreground">Vælg gerne flere – eller spring over.</p>}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {step === 0 && WORK.map((o) => <Choice key={o.id} o={o} sel={a.work === o.id} onClick={() => pick("work", o.id)} />)}
                {step === 1 && TEAM.map((o) => <Choice key={o.id} o={o} sel={a.team === o.id} onClick={() => pick("team", o.id)} />)}
                {step === 2 && PRIORITY.map((o) => <Choice key={o.id} o={o} sel={a.priority === o.id} onClick={() => pick("priority", o.id)} />)}
                {step === 3 && NEEDS.map((o) => {
                  const sel = a.needs.includes(o.id);
                  return (
                    <button key={o.id} type="button" aria-pressed={sel} className={`${opt} flex items-center gap-3 ${sel ? on : off}`}
                      onClick={() => setA({ ...a, needs: sel ? a.needs.filter((x) => x !== o.id) : [...a.needs, o.id] })}>
                      <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${sel ? "border-primary-foreground" : "border-border"}`}>{sel && <Check className="h-4 w-4" />}</span>
                      <span className="text-[15px] font-semibold">{o.label}</span>
                    </button>
                  );
                })}
                {step === 4 && [...comparisons.map((c) => ({ id: c.slug, label: c.name })), { id: "none", label: "Papir, Excel eller intet" }, { id: "other", label: "Et andet program" }].map((o) => (
                  <Choice key={o.id} o={o} sel={a.current === o.id} onClick={() => pick("current", o.id)} />
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="outline" className="min-h-11" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="mr-1 h-4 w-4" />Tilbage</Button>
                <Button className="min-h-11" disabled={!canNext} onClick={() => setStep(step + 1)}>{step === steps - 1 ? "Se mit resultat" : step === 3 && !a.needs.length ? "Spring over" : "Næste"}<ArrowRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </section>

            <aside className="rounded-2xl border border-border bg-muted/40 p-6">
              <h2 className="font-semibold text-foreground">Dine svar</h2>
              {summary.length ? (
                <ul className="mt-3 space-y-2">{summary.map((s) => <li key={s} className="flex gap-2 text-[15px] text-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{s}</li>)}</ul>
              ) : <p className="mt-2 text-[15px] text-muted-foreground">Dine valg vises her undervejs.</p>}
              <p className="mt-5 text-sm leading-6 text-muted-foreground">Vi vægter dit arbejde, holdets størrelse, hvad der betyder mest, og de funktioner du vælger. Resultatet viser præcis hvorfor.</p>
            </aside>
          </div>
        )}

        {r && (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <section className="rounded-2xl border-2 border-primary/40 bg-card p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-primary bg-background" aria-label={`Match ${r.score} procent`}>
                  <span className="text-2xl font-bold text-foreground">{r.score}%</span>
                  <span className="text-xs text-muted-foreground">match</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><Sparkles className="h-4 w-4" aria-hidden />Vores anbefaling</p>
                  <h2 className="mt-1 text-2xl font-semibold text-foreground">Serviceydere passer til {r.fitLabel}</h2>
                </div>
              </div>
              <p className="mt-5 text-[15px] leading-7 text-foreground/85">{r.intro}</p>

              <h3 className="mt-7 text-lg font-semibold text-foreground">Derfor anbefaler vi det</h3>
              <ol className="mt-3 grid gap-3 sm:grid-cols-2">{r.reasons.map((x, i) => (
                <li key={x.title} className="rounded-xl border border-border bg-background p-4">
                  <p className="flex gap-2 font-semibold text-foreground"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>{x.title}</p>
                  <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">{x.text}</p>
                </li>
              ))}</ol>

              {r.matched.length > 0 && (<>
                <h3 className="mt-7 text-lg font-semibold text-foreground">Det får du</h3>
                <ul className="mt-3 space-y-2.5">{r.matched.map((m) => (
                  <li key={m} className="flex gap-3 text-[15px] leading-6 text-foreground"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />{m}</li>
                ))}</ul>
              </>)}
              {r.gaps.length > 0 && (
                <div className="mt-7 rounded-xl border border-border bg-muted/50 p-4">
                  <h3 className="font-semibold text-foreground">Det har vi ikke endnu – ærligt sagt</h3>
                  <ul className="mt-2 space-y-2">{r.gaps.map((g) => (
                    <li key={g} className="flex gap-3 text-[15px] leading-6 text-foreground"><Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />{g}</li>
                  ))}</ul>
                </div>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="min-h-11"><Link to="/opret-virksomhed">Prøv gratis i 14 dage <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
                <Button variant="outline" size="lg" className="min-h-11" onClick={() => { setStep(0); setA(empty); }}><RotateCcw className="mr-1 h-4 w-4" />Start forfra</Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Uden kreditkort og uden binding.</p>
            </section>

            <aside className="space-y-4">
              {r.from && (
                <section className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="text-lg font-semibold text-foreground">Kommer du fra {r.from.name}?</h2>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Det er {r.from.name} god til</h3>
                  <ul className="mt-2 space-y-1.5 text-[15px] text-muted-foreground">{r.from.summaryThem.map((s) => <li key={s}>• {s}</li>)}</ul>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">Det får du ekstra i Serviceydere</h3>
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

        <section className="mt-16 max-w-3xl">
          <h2 className="text-2xl font-semibold text-foreground">Sådan vælger du det rigtige rutesystem</h2>
          <p className="mt-3 text-[15px] leading-7 text-foreground/85">Et rutesystem (også kaldet ruteprogram eller ruteplanlægger) samler dine kunder, faste besøg, medarbejdere og fakturaer. Se især efter disse fem ting:</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-foreground/85">
            <li><strong>Faste intervaller:</strong> kan systemet selv lave næste besøg, når et besøg er udført?</li>
            <li><strong>Medarbejder-app:</strong> ser medarbejderne dagens stop, og virker det uden internet?</li>
            <li><strong>Fakturering:</strong> sendes fakturaer direkte til e-conomic eller Dinero?</li>
            <li><strong>Dokumentation:</strong> kan du tage billedbevis og udfylde tjeklister?</li>
            <li><strong>Skift:</strong> hjælper leverandøren med at flytte dine data, og er der binding?</li>
          </ol>
          <p className="mt-4 text-[15px] leading-7 text-foreground/85">Vil du se det hele side om side? <Link to="/software/sammenlign" className="font-semibold underline underline-offset-4">Sammenlign rutesystemer</Link> eller læs om <Link to="/software/skift-rutesystem" className="font-semibold underline underline-offset-4">gratis skift af rutesystem</Link>.</p>
        </section>

        <p className="mt-10 max-w-3xl text-sm text-muted-foreground">
          Finderen er lavet af Serviceydere. Oplysninger om andre systemer kommer fra deres egne sider – se kilder og tjekdato under <Link to="/software/sammenlign" className="underline">Sammenlign rutesystemer</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default RouteSystemFinder;
