import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const GetQuotes = () => {
  return (
    <section className="bg-primary/10 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
            <MessageSquarePlus className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Indhent 3 tilbud
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Beskriv dit projekt og modtag op til 3 tilbud fra verificerede serviceydere – helt gratis og uforpligtende.
          </p>
          <Button size="lg" className="h-12 px-8 text-base font-semibold">
            Få tilbud nu
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GetQuotes;
