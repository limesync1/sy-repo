import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ShieldCheck, MapPin, Building2, ArrowRight } from "lucide-react";
import HorizontalScroller from "./HorizontalScroller";
import FavoriteButton from "@/components/business/FavoriteButton";

type Biz = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  is_verified: boolean | null;
  category: string | null;
  categories: string[] | null;
  _avgRating?: number;
  _reviewCount?: number;
};

const BusinessCard = ({ biz }: { biz: Biz }) => {
  const cats = biz.categories?.length ? biz.categories : biz.category ? [biz.category] : [];
  const primaryCat = cats[0];
  const extraCats = cats.length - 1;

  return (
    <Link to={`/b/${biz.slug}`} className="group flex w-[308px] shrink-0 flex-col gap-3 sm:w-[340px]">
      <article className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-panel">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
          {biz.cover_image_url ? (
            <img
              src={biz.cover_image_url}
              alt={biz.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <Building2 className="h-14 w-14 text-muted-foreground/30" />
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            {biz.is_verified ? (
              <div className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                <ShieldCheck className="h-3 w-3 text-accent" />
                Verificeret
              </div>
            ) : <span />}
            <FavoriteButton businessId={biz.id} />
          </div>

          <div className="absolute inset-x-4 bottom-4 rounded-[22px] bg-background/94 p-3 shadow-panel backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-foreground">{biz.name}</h3>
                {biz.city && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{biz.city}</span>
                  </div>
                )}
              </div>
              {biz.logo_url && (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
                  <img src={biz.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {primaryCat && (
                <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
                  {primaryCat}
                </span>
              )}
              {extraCats > 0 && <span className="text-[11px] font-medium text-muted-foreground">+{extraCats} mere</span>}
            </div>
            {biz._reviewCount && biz._reviewCount > 0 ? (
              <div className="flex shrink-0 items-center gap-1 text-sm text-foreground">
                <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                <span className="font-medium">{biz._avgRating!.toFixed(1)}</span>
                <span className="text-muted-foreground">({biz._reviewCount})</span>
              </div>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">Ny profil</span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm font-semibold text-foreground">
            Se virksomhed
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </article>
    </Link>
  );
};

const RecentBusinesses = () => {
  const { data: businesses } = useQuery({
    queryKey: ["recent-businesses"],
    queryFn: async () => {
      const { data: bizList } = await supabase
        .from("businesses")
        .select("id, name, slug, city, logo_url, cover_image_url, is_verified, category, categories, created_at")
        .eq("is_active", true)
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);

      if (!bizList?.length) return [] as Biz[];

      const ids = bizList.map((b) => b.id);
      const { data: revs } = await supabase.from("reviews").select("business_id, rating").in("business_id", ids);

      const stats: Record<string, { sum: number; n: number }> = {};
      (revs ?? []).forEach((r) => {
        if (!stats[r.business_id]) stats[r.business_id] = { sum: 0, n: 0 };
        stats[r.business_id].sum += r.rating;
        stats[r.business_id].n += 1;
      });

      return bizList.map((b) => ({
        ...b,
        _avgRating: stats[b.id] ? stats[b.id].sum / stats[b.id].n : 0,
        _reviewCount: stats[b.id]?.n ?? 0,
      })) as Biz[];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!businesses || businesses.length === 0) return null;

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 rounded-[30px] border border-border bg-secondary p-6 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Udvalgte virksomheder</p>
            <h2 className="mt-2 text-3xl leading-tight text-foreground md:text-[2.4rem]">Profiler der er nemme at vurdere med det samme.</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">Et mere professionelt overblik over virksomheder, så pris, kategori, sted og troværdighed føles samlet.</p>
          </div>
          <Link to="/virksomheder" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-75">
            Vis alle
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <HorizontalScroller>
          {businesses.map((biz) => (
            <BusinessCard key={biz.id} biz={biz} />
          ))}
        </HorizontalScroller>
      </div>
    </section>
  );
};

export default RecentBusinesses;
