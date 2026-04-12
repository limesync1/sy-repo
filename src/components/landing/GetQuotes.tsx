import { MessageSquarePlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const GetQuotes = () => {
  return (
    <section className="relative overflow-hidden bg-foreground py-20 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(184_90%_42%/0.1),transparent_60%)]" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/20">
            <MessageSquarePlus className="h-8 w-8 text-accent-foreground" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Indhent 3 tilbud
          </h2>
          <p className="mb-8 text-lg text-white/60">
            Beskriv dit projekt og modtag op til 3 tilbud fra verificerede serviceydere – helt gratis og uforpligtende.
          </p>
          <Link to="/quote">
            <Button size="lg" className="h-13 gap-2 rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground shadow-lg hover:bg-accent/90">
              Få tilbud nu
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GetQuotes;
