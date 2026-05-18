import { ShieldCheck, ArrowRight, Quote, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartLink from "@/components/SmartLink";

const GetQuotes = () => {
  const matches = [
    { name: "Ready2Clean",   price: "1.450 kr", rating: "4.9", verified: true,  logo: "R2", reply: "Svar på 12 min",  avatar: "bg-foreground text-background" },
    { name: "Nordic Service", price: "1.620 kr", rating: "4.8", verified: true,  logo: "NS", reply: "Svar på 28 min",  avatar: "bg-accent text-accent-foreground" },
    { name: "Pro Helpers",   price: "1.380 kr", rating: "4.7", verified: false, logo: "PH", reply: "Svar på 1 t 04 min", avatar: "bg-[hsl(187_100%_49%)] text-foreground" },
  ];

  return (
    <section className="bg-background py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Venstre: tekst + CTA */}
          <div>
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Indhent 3 tilbud
            </span>
            <h2 className="mt-5 text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground md:text-[2.75rem]">
              Få relevante tilbud uden ekstra støj.
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Beskriv opgaven én gang og sammenlign svarene roligt — du vælger,
              hvem du vil tale videre med.
            </p>

            <ul className="mt-8 space-y-4 text-[15px] text-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground">1</span>
                Beskriv opgaven på under et minut.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground">2</span>
                Modtag op til 3 tilbud fra verificerede serviceydere.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground">3</span>
                Sammenlign pris, anmeldelser og svartid samme sted.
              </li>
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <SmartLink to="/tilbud">
                <Button size="lg" className="h-11 gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background hover:bg-foreground/90">
                  Start gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SmartLink>
              <span className="text-xs text-muted-foreground">
                Gratis og uforpligtende — ingen kontooprettelse krævet.
              </span>
            </div>
          </div>

          {/* Højre: live preview card */}
          <div className="relative rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_60px_-20px_rgba(0,0,0,0.12)] sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Live tilbud
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-accent" />
                Prioriteret efter relevans
              </div>
            </div>

            <div className="space-y-2.5">
              {matches.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-shadow hover:shadow-sm"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold tracking-tight ${m.avatar}`}>
                    {m.logo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">{m.name}</span>
                      {m.verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="text-foreground/80">★ {m.rating}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {m.reply}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">{m.price}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Estimat</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetQuotes;
