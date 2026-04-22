import { Sparkles, Zap, ShieldCheck, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const GetQuotes = () => {
  const matches = [
    { name: "Ready2Clean", price: "1.450 kr", rating: "4.9", verified: true, logo: "R2", tone: "bg-secondary text-foreground", reason: "Bedst samlet", eta: "Kan starte hurtigt" },
    { name: "Nordic Service", price: "1.620 kr", rating: "4.8", verified: true, logo: "NS", tone: "bg-accent/10 text-accent", reason: "Stærk kvalitet", eta: "Mange glade kunder" },
    { name: "Pro Helpers", price: "1.380 kr", rating: "4.7", verified: false, logo: "PH", tone: "bg-muted text-foreground", reason: "God pris", eta: "Fornuftigt budgetvalg" },
  ];

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[36px] border border-border bg-secondary px-5 py-8 shadow-sm sm:px-8 sm:py-10 md:px-12 md:py-12">
          <div className="grid items-start gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
                <Sparkles className="h-3 w-3" />
                AI-drevet matching
              </span>
              <h2 className="mt-4 max-w-xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Få et skarpere udvalg med det samme.
              </h2>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-card px-4 py-4">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">1</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Beskriv kort opgaven</div>
                    <div className="mt-1 text-sm text-muted-foreground">Du behøver ikke udfylde et langt flow for at komme i gang.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-card px-4 py-4">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">2</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">De stærkeste matches ryger øverst</div>
                    <div className="mt-1 text-sm text-muted-foreground">Pris, kvalitet og nærhed bliver vægtet sammen i stedet for hver for sig.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-card px-4 py-4">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground">3</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Du vælger hurtigere</div>
                    <div className="mt-1 text-sm text-muted-foreground">Mindre støj og færre dårlige klik, når kandidaterne allerede er sorteret.</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/tilbud">
                  <Button size="lg" className="h-12 gap-2 rounded-full px-7 text-sm font-semibold">
                    Prøv det gratis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/virksomheder">
                  <Button size="lg" variant="outline" className="h-12 gap-2 rounded-full bg-background px-6 text-sm font-medium">
                    Se virksomheder
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_110px]">
                <div className="rounded-[32px] border border-border bg-background p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-foreground">AI matcher</div>
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
                        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
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
                    Viser først dem der mest sandsynligt passer
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[24px] border border-border bg-background px-4 py-4 text-center shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filter</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">Kvalitet</div>
                  </div>
                  <div className="rounded-[24px] border border-border bg-background px-4 py-4 text-center shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filter</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">Pris</div>
                  </div>
                  <div className="rounded-[24px] border border-border bg-background px-4 py-4 text-center shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filter</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">Nærhed</div>
                  </div>
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
