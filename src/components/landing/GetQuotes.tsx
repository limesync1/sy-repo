import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ArrowRight, MapPin, Sparkles, Building2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartLink from "@/components/SmartLink";
import { supabase } from "@/integrations/supabase/client";

type Biz = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  categories: string[] | null;
  category: string | null;
  is_verified: boolean | null;
  _rating?: number;
  _reviews?: number;
};

const GetQuotes = () => {
  // Hent admin-valgte anbefalede virksomheder. Hvis ingen er valgt, falder vi
  // tilbage til de senest oprettede verificerede virksomheder.
  const { data: businesses } = useQuery({
    queryKey: ["landing-featured-businesses"],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("featured_business_ids")
        .eq("id", 1)
        .maybeSingle();
      const ids = (settings?.featured_business_ids ?? []) as string[];

      let bizList: any[] | null = null;
      if (ids.length) {
        const { data } = await supabase
          .from("businesses")
          .select("id, name, slug, logo_url, city, category, categories, is_verified")
          .in("id", ids)
          .eq("is_active", true);
        // Bevar admin-rækkefølgen
        bizList = ids
          .map((id) => (data ?? []).find((b) => b.id === id))
          .filter(Boolean) as any[];
      }
      if (!bizList?.length) {
        const { data } = await supabase
          .from("businesses")
          .select("id, name, slug, logo_url, city, category, categories, is_verified")
          .eq("is_active", true)
          .order("is_verified", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3);
        bizList = data ?? [];
      }
      if (!bizList.length) return [] as Biz[];

      const bIds = bizList.map((b) => b.id);
      const { data: revs } = await supabase
        .from("reviews")
        .select("business_id, rating")
        .in("business_id", bIds)
        .is("hidden_at", null);
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

  const picks = useMemo<Biz[]>(() => (businesses ?? []).slice(0, 3), [businesses]);

  return (
    <section className="relative isolate overflow-hidden bg-surface py-16 md:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -right-32 top-1/3 h-[28rem] w-[28rem] rounded-full blur-[120px] opacity-[0.08]"
          style={{ backgroundColor: "hsl(var(--accent))" }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Anbefalede virksomheder
            </span>
            <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-[2.35rem] lg:text-[2.75rem]">
              Håndplukkede serviceydere —{" "}
              <span className="bg-[linear-gradient(110deg,hsl(var(--accent))_0%,hsl(var(--hero-cyan-bright))_60%,hsl(var(--accent))_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan">
                klar til at hjælpe dig.
              </span>
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Vi fremhæver verificerede virksomheder med stærke anmeldelser og
              tydelig profil, så du hurtigt finder en udbyder du kan stole på.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <SmartLink to="/virksomheder">
                <Button size="lg" className="h-11 gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background hover:bg-foreground/90">
                  Se alle virksomheder
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SmartLink>
              <SmartLink to="/tilbud" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Eller indhent 3 gratis tilbud
              </SmartLink>
            </div>
          </div>

          <div className="relative pb-6">
            {/* Blød glød bag kortet — holdes inden for sektionen så kanten
                aldrig bliver klippet skarpt af overflow. */}
            <div aria-hidden className="absolute -inset-x-4 -top-4 bottom-0 -z-10 rounded-[36px] bg-gradient-to-br from-accent/10 via-transparent to-foreground/5 blur-2xl" />
            <div className="relative rounded-[28px] border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_-40px_rgba(0,0,0,0.22)] sm:p-7">

              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Anbefalet af Serviceydere
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Top 3
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
                  const cat = (m.categories?.[0]) || m.category || null;
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
                            alt={`Logo for ${m.name}`}
                            className="h-full w-full object-contain p-1"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="text-xs font-bold tracking-tight text-foreground">
                            {m.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-foreground">{m.name}</span>
                          {m.is_verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          {cat && <span className="rounded-full bg-secondary px-1.5 py-0.5 font-medium text-foreground">{cat}</span>}
                          {m.city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {m.city}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {rating ? (
                          <>
                            <div className="inline-flex items-center gap-1 text-sm font-bold text-foreground">
                              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                              {rating}
                            </div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {m._reviews} anmeldelser
                            </div>
                          </>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            <Building2 className="h-3 w-3" /> Ny profil
                          </div>
                        )}
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
