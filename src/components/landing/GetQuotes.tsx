import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const GetQuotes = () => {
  return (
    <section className="bg-background py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-secondary px-8 py-12 md:px-16 md:py-16">
          <div className="grid items-center gap-8 md:grid-cols-[1.3fr_0.7fr]">
            <div>
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Beskriv opgaven – vi finder folkene.
              </h2>
              <p className="mb-6 max-w-md text-base text-muted-foreground">
                Modtag op til 3 skræddersyede tilbud fra verificerede serviceydere. Helt gratis & uforpligtende.
              </p>
              <Link to="/quote">
                <Button size="lg" className="h-12 gap-2 rounded-full bg-accent px-7 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
                  Få tilbud nu
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="hidden md:flex md:justify-end">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "3", l: "tilbud" },
                  { v: "24t", l: "responstid" },
                  { v: "0 kr", l: "gebyr" },
                  { v: "100%", l: "verificeret" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl bg-card p-4 text-center shadow-sm">
                    <div className="text-xl font-bold text-foreground">{s.v}</div>
                    <div className="text-xs text-muted-foreground">{s.l}</div>
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
