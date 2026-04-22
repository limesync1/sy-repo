import { Zap, ShieldCheck, ArrowRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const GetQuotes = () => {
  const matches = [
    { name: "Ready2Clean", price: "1.450 kr", rating: "4.9", verified: true, logo: "R2", tone: "bg-feature-cool text-feature-cool-foreground" },
    { name: "Nordic Service", price: "1.620 kr", rating: "4.8", verified: true, logo: "NS", tone: "bg-feature-warm text-feature-warm-foreground" },
    { name: "Pro Helpers", price: "1.380 kr", rating: "4.7", verified: false, logo: "PH", tone: "bg-feature-lilac text-feature-lilac-foreground" },
  ];

  return (
    <section className="bg-background py-12 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-border bg-foreground px-5 py-6 text-background shadow-sm sm:px-7 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/10 px-3 py-1 text-xs font-semibold text-background">
                <Quote className="h-3 w-3 text-accent" />
                Indhent 3 tilbud
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-background sm:text-3xl">
                Få relevante tilbud uden ekstra støj.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-background/75 sm:text-base">
                Beskriv opgaven én gang og sammenlign svarene mere roligt.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/tilbud">
                  <Button size="lg" className="h-11 gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
                    Start gratis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-4 py-2 text-sm font-medium text-background/85">
                  <Zap className="h-4 w-4 text-accent" />
                  Prioriteret efter relevans
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-background p-4 text-foreground sm:p-5">
              <div className="space-y-2">
                {matches.map((m) => (
                  <div key={m.name} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-bold ${m.tone}`}>
                      {m.logo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-foreground">{m.name}</span>
                        {m.verified && <ShieldCheck className="h-3 w-3 shrink-0 text-accent" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground">★ {m.rating}</div>
                    </div>
                    <div className="text-sm font-bold text-foreground">{m.price}</div>
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
