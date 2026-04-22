import { Sparkles, Zap, ShieldCheck, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const GetQuotes = () => {
  const matches = [
    { name: "Ready2Clean", price: "1.450 kr", rating: "4.9", verified: true, logo: "R2", tone: "bg-secondary text-foreground", reason: "Stærkt match", eta: "Kan tage opgaven hurtigt" },
    { name: "Nordic Service", price: "1.620 kr", rating: "4.8", verified: true, logo: "NS", tone: "bg-accent/10 text-accent", reason: "Bedst anmeldt", eta: "Høj kundetilfredshed" },
    { name: "Pro Helpers", price: "1.380 kr", rating: "4.7", verified: false, logo: "PH", tone: "bg-muted text-foreground", reason: "Bedste pris", eta: "Budgetvenligt valg" },
  ];

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[28px] bg-foreground px-5 py-7 sm:px-8 sm:py-9 md:px-12 md:py-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            {/* Left */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                <Sparkles className="h-3 w-3" />
                AI-drevet matching
              </span>
              <h2 className="mt-4 max-w-xl text-2xl font-bold tracking-tight text-background sm:text-3xl md:text-4xl">
                Lad de bedste matches komme til dig.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-background/75 sm:text-base">
                Vi sorterer efter relevans, lokation og kvalitet, så du hurtigere ser hvem der faktisk giver mening.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-background/10 bg-background/5 p-3">
                  <div className="text-sm font-semibold text-background">1 formular</div>
                  <div className="mt-1 text-xs leading-5 text-background/70">Kort og enkelt.</div>
                </div>
                <div className="rounded-2xl border border-background/10 bg-background/5 p-3">
                  <div className="text-sm font-semibold text-background">Op til 3 svar</div>
                  <div className="mt-1 text-xs leading-5 text-background/70">Udvalgt til din opgave.</div>
                </div>
                <div className="rounded-2xl border border-background/10 bg-background/5 p-3">
                  <div className="text-sm font-semibold text-background">Ingen binding</div>
                  <div className="mt-1 text-xs leading-5 text-background/70">Gratis at prøve.</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/tilbud">
                  <Button size="lg" className="h-12 gap-2 rounded-full bg-accent px-7 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90">
                    Prøv det gratis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/virksomheder">
                  <Button size="lg" variant="outline" className="h-12 gap-2 rounded-full border-background/20 bg-transparent px-6 text-sm font-medium text-background hover:bg-background/10 hover:text-background">
                    Browse virksomheder
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — fake AI matching demo */}
            <div className="relative">
              <div className="rounded-2xl bg-background p-4 shadow-2xl sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-foreground">AI matcher</div>
                     <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> Sorteret efter kvalitet, pris og afstand
                    </div>
                  </div>
                  <span className="flex h-2 w-2 animate-pulse rounded-full bg-accent" />
                </div>

                <div className="space-y-2">
                  {matches.map((m, i) => (
                    <div
                      key={m.name}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                      style={{ animation: `fade-in 0.4s ease-out ${i * 120}ms both` }}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${m.tone}`}>
                        {m.logo}
                      </div>
                      <div className="flex-1 min-w-0">
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

                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-secondary py-2 text-xs font-medium text-muted-foreground">
                  <Zap className="h-3 w-3 text-accent" />
                  Klarere prioritering af de bedste muligheder
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
