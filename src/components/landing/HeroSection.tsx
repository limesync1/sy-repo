import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const suggestions = ["Rengøring", "Håndværker", "Flyttehjælp", "Haveservice", "Maler", "VVS"];

const HeroSection = () => {
  const [query, setQuery] = useState("");

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
      <div className="container relative mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Find den rette service
            <span className="block text-primary"> – hurtigt og nemt</span>
          </h1>
          <p className="mb-10 text-lg text-muted-foreground md:text-xl">
            Sammenlign priser, læs anmeldelser og book de bedste serviceydere i hele Danmark.
          </p>

          <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hvad har du brug for?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 pl-10 text-base"
              />
            </div>
            <Button size="lg" className="h-12 px-8 text-base font-semibold">
              Find en service
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
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
