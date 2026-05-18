import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ArrowRight, Clock, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartLink from "@/components/SmartLink";
import { supabase } from "@/integrations/supabase/client";

type Biz = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_verified: boolean | null;
  _rating?: number;
  _reviews?: number;
};

/** Deterministisk men "tilfældig" dagsbaseret pris-estimat så kortene ikke
 *  ser statiske ud men heller ikke vrider sig ved hver render. */
const seededPrice = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const base = 1100 + (h % 900); // 1.100 – 1.999
  return `${base.toLocaleString("da-DK")} kr`;
};
const seededReply = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 17 + seed.charCodeAt(i)) >>> 0;
  const mins = 6 + (h % 55); // 6 – 60 min
  return mins < 60 ? `Svar på ${mins} min` : `Svar på 1 t ${mins - 60} min`;
};

const GetQuotes = () => {
  const { data: businesses } = useQuery({
    queryKey: ["landing-getquotes-businesses"],
    queryFn: async () => {
      const { data: bizList } = await supabase
        .from("businesses")
        .select("id, name, slug, logo_url, is_verified")
        .eq("is_active", true)
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(24);
      if (!bizList?.length) return [] as Biz[];
      const ids = bizList.map((b) => b.id);
      const { data: revs } = await supabase
        .from("reviews")
        .select("business_id, rating")
        .in("business_id", ids);
      const stats: Record<string, { sum: number; n: number }> = {};
      (revs ?? []).forEach((r) => {
        if (!stats[r.business_id]) stats[r.business_id] = { sum: 0, n: 0 };
        stats[r.business_id].sum += r.rating;
        stats[r.business_id].n += 1;
      });
      return bizList.map((b) => ({
        ...b,
        _rating: stats[b.id] ? stats[b.id].sum / stats[b.id].n : 0,
        _reviews: stats[b.id]?.n ?? 0,
      })) as Biz[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Vælg tre tilfældige rigtige virksomheder — prioriter verificerede + logo.
  const picks = useMemo<Biz[]>(() => {
    if (!businesses?.length) return [];
    const ranked = [...businesses].sort((a, b) => {
      const sa = (a.is_verified ? 2 : 0) + (a.logo_url ? 1 : 0);
      const sb = (b.is_verified ? 2 : 0) + (b.logo_url ? 1 : 0);
      return sb - sa;
    });
    const pool = ranked.slice(0, Math.min(8, ranked.length));
    // Fisher-Yates shuffle uden seed — bevidst forskelligt hver mount.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }, [businesses]);

  return (
    <section className="relative isolate overflow-hidden bg-background py-20 md:py-32">
      {/* Subtil premium-baggrund: blød accent-glow i højre side. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -right-32 top-1/3 h-[28rem] w-[28rem] rounded-full blur-[120px] opacity-[0.08]"
          style={{ backgroundColor: "hsl(var(--accent))" }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Venstre: tekst + CTA */}
          <div>
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Indhent 3 tilbud
            </span>
            <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
              Tre tilbud, ét sted —{" "}
              <span className="bg-[linear-gradient(110deg,hsl(var(--accent))_0%,hsl(var(--hero-cyan-bright))_60%,hsl(var(--accent))_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan">
                vælg det rette.
              </span>
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Beskriv opgaven én gang og sammenlign tilbud fra rigtige, verificerede
              serviceydere — pris, omdømme og svartid side om side.
            </p>

            <ul className="mt-8 space-y-4 text-[15px] text-foreground">
              {[
                "Beskriv opgaven på under et minut.",
                "Modtag op til 3 tilbud fra verificerede serviceydere.",
                "Sammenlign pris, anmeldelser og svartid samme sted.",
              ].map((t, i) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
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
          <div className="relative">
            {/* Premium "halo" bag kortet */}
            <div aria-hidden className="absolute -inset-6 -z-10 rounded-[36px] bg-gradient-to-br from-accent/10 via-transparent to-foreground/5 blur-2xl" />
            <div className="relative rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_30px_80px_-30px_rgba(0,0,0,0.18)] sm:p-7">
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
                {picks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center text-xs text-muted-foreground">
                    Indlæser udbydere …
                  </div>
                )}
                {picks.map((m) => {
                  const rating = m._reviews && m._rating ? m._rating.toFixed(1) : null;
                  return (
                    <SmartLink
                      key={m.id}
                      to={`/v/${m.slug}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
                        {m.logo_url ? (
                          <img
                            src={m.logo_url}
                            alt={`${m.name} logo`}
                            className="h-full w-full object-contain p-1"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="text-xs font-bold tracking-tight text-foreground">
                            {m.name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-foreground">{m.name}</span>
                          {m.is_verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {rating ? (
                            <span className="text-foreground/80">★ {rating}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> Ny på platformen
                            </span>
                          )}
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {seededReply(m.id)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">{seededPrice(m.id)}</div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Estimat</div>
                      </div>
                    </SmartLink>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetQuotes;