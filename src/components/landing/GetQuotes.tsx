import { MessageSquarePlus, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const perks = [
  "Op til 3 tilbud på 24 timer",
  "Helt gratis & uforpligtende",
  "Kun verificerede virksomheder",
];

const GetQuotes = () => {
  return (
    <section className="relative overflow-hidden bg-foreground py-24 md:py-32">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent/15 blur-3xl animate-blob" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl animate-blob" style={{ animationDelay: "-7s" }} />
      </div>
      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(hsl(0_0%_100%)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-3 py-1.5 backdrop-blur">
              <MessageSquarePlus className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium text-background/70">Indhent tilbud</span>
            </div>
            <h2 className="mb-6 text-4xl font-extrabold leading-[0.95] tracking-tight text-background md:text-6xl">
              Beskriv opgaven –<br />
              <span className="bg-gradient-to-r from-accent to-background/70 bg-clip-text text-transparent">vi finder folkene.</span>
            </h2>
            <p className="mb-8 max-w-md text-lg text-background/60">
              Modtag op til 3 skræddersyede tilbud fra verificerede serviceydere. Sammenlign og vælg.
            </p>

            <ul className="mb-8 space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3 text-background/80">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm">{p}</span>
                </li>
              ))}
            </ul>

            <Link to="/quote">
              <Button size="lg" className="h-13 gap-2 rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/30 hover:bg-accent/90">
                Få tilbud nu
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Visual mockup */}
          <div className="relative hidden lg:block">
            <div className="rounded-2xl border border-background/10 bg-background/5 p-6 backdrop-blur-xl shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-background/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-background/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-background/20" />
                <div className="ml-auto text-xs text-background/40">Din forespørgsel</div>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Rengøringsservice A/S", price: "2.400 kr/md", rating: "4.9" },
                  { name: "CleanCo Danmark", price: "2.650 kr/md", rating: "4.8" },
                  { name: "Nordic Service", price: "2.800 kr/md", rating: "5.0" },
                ].map((q, i) => (
                  <div
                    key={q.name}
                    className="flex items-center justify-between rounded-xl border border-background/10 bg-background/5 p-4 transition-all hover:border-accent/40"
                    style={{ animation: `fade-in 0.6s ease-out ${i * 120}ms both` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-sm font-bold text-accent">
                        {q.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-background">{q.name}</div>
                        <div className="flex items-center gap-1 text-xs text-background/50">
                          <svg className="h-3 w-3 fill-accent" viewBox="0 0 20 20"><path d="M10 1l2.5 6h6l-5 4 2 6.5L10 14l-5.5 3.5 2-6.5-5-4h6z" /></svg>
                          {q.rating}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-background">{q.price}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetQuotes;
