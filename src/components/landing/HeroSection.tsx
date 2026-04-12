import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const suggestions = ["Rengøring", "Håndværker", "Flyttehjælp", "Haveservice", "Maler", "VVS"];

const HeroSection = () => {
  const [query, setQuery] = useState("");

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/15 via-accent/5 to-background" />
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-accent/8 blur-3xl" />

      <div className="container relative mx-auto px-4 pt-8 pb-24 md:pt-12 md:pb-32">
        {/* Nav bar with logo */}
        <nav className="mb-16 flex items-center justify-between md:mb-24">
          <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-9 md:h-11" />
          <Button variant="outline" size="sm" className="border-accent/30 text-foreground hover:bg-accent/10">
            Log ind
          </Button>
        </nav>

        {/* Hero content */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-foreground">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Danmarks nye platform for services
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Find den rette service
            <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent"> – hurtigt og nemt</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground md:text-xl">
            Sammenlign priser, læs anmeldelser og book de bedste serviceydere i hele Danmark.
          </p>

          <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hvad har du brug for?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-13 rounded-xl border-accent/20 bg-card pl-11 text-base shadow-sm focus-visible:ring-accent"
              />
            </div>
            <Button size="lg" className="h-13 rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90">
              Find en service
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="rounded-full border border-border bg-card/80 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur transition-all hover:border-accent/40 hover:text-foreground hover:shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
