import { ArrowRight, Clock3, ShieldCheck, Sparkles } from "lucide-react";
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
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
          <div className="flex flex-col justify-between rounded-[36px] bg-foreground px-6 py-7 text-background shadow-sm sm:px-8 sm:py-8">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-semibold text-background/88 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Få tilbud uden langt flow
              </span>
              <h2 className="mt-5 max-w-md text-3xl font-bold tracking-tight text-background md:text-4xl">
                Send opgaven ud én gang og få de bedste kandidater tilbage.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-background/70">
                Når du ikke gider lede manuelt, kan du lade platformen samle de
                mest oplagte svar og lægge dem i den rigtige rækkefølge.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-3 rounded-[24px] bg-background/8 px-4 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-sm font-bold text-foreground">
                  1
                </span>
                <div>
                  <div className="text-sm font-semibold text-background">
                    Skriv kort hvad der skal laves
                  </div>
                  <div className="mt-1 text-sm text-background/64">
                    Det behøver ikke være perfekt formuleret.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-[24px] bg-background/8 px-4 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-sm font-bold text-foreground">
                  2
                </span>
                <div>
                  <div className="text-sm font-semibold text-background">
                    De bedste match løftes op
                  </div>
                  <div className="mt-1 text-sm text-background/64">
                    Pris, kvalitet og lokation bliver vægtet samlet.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-[24px] bg-background/8 px-4 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-sm font-bold text-foreground">
                  3
                </span>
                <div>
                  <div className="text-sm font-semibold text-background">
                    Vælg den løsning der passer bedst
                  </div>
                  <div className="mt-1 text-sm text-background/64">
                    Du slipper for at starte forfra flere steder.
                  </div>
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

          <div className="overflow-hidden rounded-[36px] border border-border bg-secondary shadow-sm">
            <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="bg-background px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Matchoversigt
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      Kandidater sorteret efter samlet styrke
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Klar på få minutter
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {matches.map((match, index) => (
                    <div
                      key={match.name}
                      className="grid gap-3 rounded-[24px] border border-border bg-card px-4 py-4 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-sm font-bold text-foreground">
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

              <div className="grid gap-px bg-border sm:grid-cols-3 lg:grid-cols-1">
                <div className="bg-background px-5 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Prioritet
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    Kvalitet først
                  </div>
                </div>
                <div className="bg-background px-5 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Prioritet
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    Pris med i billedet
                  </div>
                </div>
                <div className="bg-background px-5 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Prioritet
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    Nærhed tæller med
                    <ArrowRight className="h-4 w-4" />
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
