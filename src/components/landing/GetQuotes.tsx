import { ArrowRight, Clock3, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const matches = [
  {
    name: "Ready2Clean",
    price: "1.450 kr",
    rating: "4.9",
    note: "Bedst samlet match",
    verified: true,
  },
  {
    name: "Nordic Service",
    price: "1.620 kr",
    rating: "4.8",
    note: "Stærk kvalitet",
    verified: true,
  },
  {
    name: "Pro Helpers",
    price: "1.380 kr",
    rating: "4.7",
    note: "God pris",
    verified: false,
  },
];

const GetQuotes = () => {
  return (
    <section className="bg-secondary/45 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] lg:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tilbud
            </div>
            <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Når du vil have markedet til at komme til dig.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-muted-foreground lg:justify-self-end">
            Hvis du ikke vil browse manuelt, kan du sende opgaven ud og få de
            stærkeste svar tilbage i et mere sorteret flow.
          </p>
        </div>

        <div className="overflow-hidden rounded-[36px] border border-border bg-background shadow-sm">
          <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
            <div className="bg-foreground px-6 py-7 text-background sm:px-8 sm:py-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-semibold text-background/80">
                <Sparkles className="h-3.5 w-3.5" />
                Smart matching
              </div>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="text-sm font-semibold text-background">
                    1. Beskriv opgaven
                  </div>
                  <div className="mt-1 text-sm leading-6 text-background/68">
                    Kort tekst er nok til at komme i gang.
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-background">
                    2. De bedste svar ryger øverst
                  </div>
                  <div className="mt-1 text-sm leading-6 text-background/68">
                    Kvalitet, pris og lokation vurderes samlet.
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-background">
                    3. Vælg uden at starte forfra
                  </div>
                  <div className="mt-1 text-sm leading-6 text-background/68">
                    Du får et mere brugbart første udvalg med det samme.
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/tilbud">
                  <Button
                    size="lg"
                    className="h-12 rounded-full bg-background px-6 text-sm font-semibold text-foreground hover:bg-background/90"
                  >
                    Få tilbud
                  </Button>
                </Link>
                <Link to="/virksomheder">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-background/20 bg-background/10 px-6 text-sm font-semibold text-background hover:bg-background/20"
                  >
                    Se virksomheder
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-background px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Matchoversigt
                      </div>
                      <div className="mt-1 text-base font-semibold text-foreground">
                        De kandidater der mest sandsynligt passer
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      Klar hurtigt
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {matches.map((match, index) => (
                      <div
                        key={match.name}
                        className="grid gap-3 rounded-[24px] bg-secondary px-4 py-4 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-sm font-bold text-foreground">
                          0{index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {match.name}
                            </div>
                            {match.verified && (
                              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            ★ {match.rating} · {match.note}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          {match.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-px overflow-hidden rounded-[24px] bg-border border border-border">
                  <div className="bg-background px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Fokus
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Star className="h-4 w-4 text-accent" />
                      Kvalitet først
                    </div>
                  </div>
                  <div className="bg-background px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Fokus
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">
                      Pris med i vurderingen
                    </div>
                  </div>
                  <div className="bg-background px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Fokus
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      Lokal relevans
                      <ArrowRight className="h-4 w-4" />
                    </div>
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
