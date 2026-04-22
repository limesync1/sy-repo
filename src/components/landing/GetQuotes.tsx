import { Sparkles, Zap, ShieldCheck, ArrowRight, Clock, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const GetQuotes = () => {
  const matches = [
    { name: "Ready2Clean", price: "1.450 kr", rating: "4.9", verified: true, logo: "R2", tone: "bg-feature-cool text-feature-cool-foreground", reason: "Bedst samlet", eta: "Kan starte hurtigt" },
    { name: "Nordic Service", price: "1.620 kr", rating: "4.8", verified: true, logo: "NS", tone: "bg-feature-warm text-feature-warm-foreground", reason: "Stærk kvalitet", eta: "Mange glade kunder" },
    { name: "Pro Helpers", price: "1.380 kr", rating: "4.7", verified: false, logo: "PH", tone: "bg-feature-lilac text-feature-lilac-foreground", reason: "God pris", eta: "Fornuftigt budgetvalg" },
  ];

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="surface-dark-panel overflow-hidden rounded-[32px] px-5 py-7 text-background shadow-panel sm:px-8 sm:py-9 md:px-10 md:py-10">
          <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/10 px-3 py-1 text-xs font-semibold text-background">
                <Quote className="h-3 w-3 text-accent" />
                Indhent 3 tilbud
              </span>
              <h2 className="mt-4 max-w-xl text-3xl leading-tight text-background sm:text-4xl md:text-[3rem]">
                Få de mest relevante valg først.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-background/75 sm:text-base">
                Når du ikke vil vælge ud fra én profil alene, kan du beskrive opgaven én gang og få tre relevante tilbud retur.
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-background/10 bg-background/5 p-4">
                  <div className="text-sm font-semibold text-background">1. Beskriv opgaven</div>
                  <div className="mt-1 text-sm text-background/70">Kort og konkret, så matchingen bliver skarpere.</div>
                </div>
                <div className="rounded-2xl border border-background/10 bg-background/5 p-4">
                  <div className="text-sm font-semibold text-background">2. Få tre relevante svar</div>
                  <div className="mt-1 text-sm text-background/70">Prioriteret efter relevans, kvalitet og nærhed.</div>
                </div>
                <div className="rounded-2xl border border-background/10 bg-background/5 p-4">
                  <div className="text-sm font-semibold text-background">3. Vælg i dit eget tempo</div>
                  <div className="mt-1 text-sm text-background/70">Sammenlign uden at hoppe mellem flere sider.</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/tilbud">
                  <Button size="lg" className="h-12 gap-2 rounded-full bg-accent px-7 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
                    Start gratis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/virksomheder">
                  <Button size="lg" variant="outline" className="h-12 gap-2 rounded-full border-background/20 bg-transparent px-6 text-sm font-medium text-background hover:bg-background/10 hover:text-background">
                    Se virksomheder
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] bg-background p-4 text-foreground shadow-panel sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">Relevante tilbud</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" /> Prioriterer kvalitet, pris og nærhed
                  </div>
                </div>
                <span className="flex h-2 w-2 animate-pulse rounded-full bg-accent" />
              </div>

              <div className="space-y-2">
                {matches.map((m, i) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                    style={{ animation: `fade-in 0.4s ease-out ${i * 120}ms both` }}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-bold ${m.tone}`}>
                      {m.logo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-foreground">{m.name}</span>
                        {m.verified && <ShieldCheck className="h-3 w-3 shrink-0 text-accent" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground">★ {m.rating} · {m.reason}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground/80">{m.eta}</div>
                    </div>
                    <div className="text-sm font-bold text-foreground">{m.price}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-secondary p-3 text-sm text-muted-foreground">
                  <div className="font-semibold text-foreground">Færre, bedre matches</div>
                  <div className="mt-1">Mere relevante forslag først.</div>
                </div>
                <div className="rounded-2xl bg-accent-soft p-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    Hurtigere sammenligning
                  </div>
                  <div className="mt-1">Pris og signaler samlet ét sted.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetQuotes;
