import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Quote, Building2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import SmartLink from "@/components/SmartLink";
import HorizontalScroller from "./HorizontalScroller";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  customer_id: string | null;
  created_at: string;
  businesses: { name: string; slug: string; logo_url: string | null } | null;
  _avatarUrl?: string | null;
};

const Testimonials = () => {
  const { data: reviews } = useQuery({
    queryKey: ["landing-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, reviewer_name, customer_id, created_at, businesses(name, slug, logo_url)")
        .gte("rating", 4)
        .not("comment", "is", null)
        .is("hidden_at", null)
        .order("created_at", { ascending: false })
        .limit(40);
      const rows = ((data as unknown as Review[]) ?? []).filter(
        (r) => r.comment && r.comment.length > 20 && r.businesses,
      );
      // Hent profilbilleder for de anmeldere der har en profil.
      const ids = Array.from(new Set(rows.map((r) => r.customer_id).filter(Boolean))) as string[];
      if (ids.length > 0) {
        const { data: profiles } = await (supabase as any).rpc("get_public_profiles", {
          p_user_ids: ids,
        });
        const map = new Map(((profiles ?? []) as { user_id: string; avatar_url: string | null }[]).map((p) => [p.user_id, p.avatar_url]));
        rows.forEach((r) => {
          r._avatarUrl = r.customer_id ? map.get(r.customer_id) ?? null : null;
        });
      }
      return rows;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Shuffle så det ikke altid er samme virksomheder øverst.
  const shuffled = useMemo(() => {
    const arr = [...(reviews ?? [])];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 12);
  }, [reviews]);

  if (!shuffled.length) return null;

  return (
    <section className="bg-secondary py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Anmeldelser
            </span>
            <h2 className="mt-5 text-[1.85rem] font-semibold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-[2.35rem] lg:text-[2.75rem]">
              Det siger kunderne om udbyderne
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Verificerede anmeldelser fra rigtige opgaver — så du ved hvad du går ind til, før du booker.
            </p>
          </div>
          <SmartLink
            to="/virksomheder"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 md:self-auto"
          >
            Find virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
        </div>

        <HorizontalScroller>
          {shuffled.map((r) => (
            <article
              key={r.id}
              className="relative flex w-[300px] shrink-0 flex-col rounded-[24px] border border-border/70 bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border sm:w-[360px]"
            >
              <Quote aria-hidden className="absolute right-5 top-5 h-7 w-7 rotate-180 text-foreground/5" />
              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className={`h-3.5 w-3.5 ${idx < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/20"}`} />
                ))}
              </div>
              <p className="mb-6 line-clamp-4 flex-1 text-[15px] leading-7 text-foreground">"{r.comment}"</p>
              <div className="flex items-center gap-3 border-t border-border pt-4">
                {/* Anmelderens avatar — profilbillede eller initial-fallback. */}
                {r._avatarUrl ? (
                  <img
                    src={r._avatarUrl}
                    alt={r.reviewer_name}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">
                    {r.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{r.reviewer_name}</div>
                  {r.businesses && (
                    <Link
                      to={`/v/${r.businesses.slug}`}
                      className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {/* Lille logo for virksomheden */}
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-border bg-background">
                        {r.businesses.logo_url ? (
                          <img
                            src={r.businesses.logo_url}
                            alt=""
                            className="h-full w-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <Building2 className="h-2.5 w-2.5 text-muted-foreground" />
                        )}
                      </span>
                      <span className="truncate hover:underline">om {r.businesses.name}</span>
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </HorizontalScroller>
      </div>
    </section>
  );
};

export default Testimonials;