import { MessageSquarePlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const GetQuotes = () => {
  return (
    <section className="relative overflow-hidden border-y border-border/50 bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10 py-20 md:py-28">
      <div className="absolute -top-20 right-0 h-[300px] w-[300px] rounded-full bg-accent/10 blur-3xl" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 shadow-lg shadow-accent/10">
            <MessageSquarePlus className="h-8 w-8 text-accent" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Indhent 3 tilbud
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Beskriv dit projekt og modtag op til 3 tilbud fra verificerede serviceydere – helt gratis og uforpligtende.
          </p>
          <Button size="lg" className="h-13 gap-2 rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90">
            Få tilbud nu
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GetQuotes;
