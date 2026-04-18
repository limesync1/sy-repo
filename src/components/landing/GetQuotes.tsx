import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const perks = [
  "Op til 3 tilbud på 24 timer",
  "Helt gratis & uforpligtende",
  "Kun verificerede virksomheder",
];

const GetQuotes = () => {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/10 via-secondary to-background px-6 py-14 md:px-14 md:py-20">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
                Beskriv opgaven –<br />
                <span className="text-accent">vi finder folkene.</span>
              </h2>
              <p className="mb-6 max-w-md text-base text-muted-foreground md:text-lg">
                Modtag op til 3 skræddersyede tilbud fra verificerede serviceydere.
              </p>

              <ul className="mb-8 space-y-2.5">
                {perks.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-sm text-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>

              <Link to="/quote">
                <Button size="lg" className="h-12 gap-2 rounded-full bg-accent px-8 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90">
                  Få tilbud nu
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Visual mockup */}
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-foreground/5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <div className="ml-auto text-xs text-muted-foreground">Din forespørgsel</div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { name: "Rengøringsservice A/S", price: "2.400 kr/md", rating: "4.9" },
                    { name: "CleanCo Danmark", price: "2.650 kr/md", rating: "4.8" },
                    { name: "Nordic Service", price: "2.800 kr/md", rating: "5.0" },
                  ].map((q, i) => (
                    <div
                      key={q.name}
                      className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-3.5 transition-all hover:border-accent/40 hover:bg-card"
                      style={{ animation: `fade-in 0.6s ease-out ${i * 120}ms both` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent">
                          {q.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{q.name}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <svg className="h-3 w-3 fill-accent" viewBox="0 0 20 20"><path d="M10 1l2.5 6h6l-5 4 2 6.5L10 14l-5.5 3.5 2-6.5-5-4h6z" /></svg>
                            {q.rating}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-foreground">{q.price}</div>
                    </div>
                  ))}
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
