import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ShieldCheck, MapPin, Building2, ArrowRight } from "lucide-react";
import FavoriteButton from "@/components/business/FavoriteButton";
import HorizontalScroller from "./HorizontalScroller";

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

const BusinessCard = ({
  biz,
  featured = false,
}: {
  biz: Biz;
  featured?: boolean;
}) => {
  const cats = biz.categories?.length
    ? biz.categories
    : biz.category
      ? [biz.category]
      : [];
  const primaryCat = cats[0];
  const extraCats = cats.length - 1;

  return (
    <Link
      to={`/b/${biz.slug}`}
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-border bg-background shadow-sm transition-all hover:shadow-md ${
        featured ? "min-h-[420px]" : "min-h-[320px]"
      }`}
    >
      <div
        className={`relative overflow-hidden ${featured ? "aspect-[16/11]" : "aspect-[16/10]"}`}
      >
        {biz.cover_image_url ? (
          <img
            src={biz.cover_image_url}
            alt={biz.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <Building2 className="h-14 w-14 text-muted-foreground/35" />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          {biz.is_verified ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-background/92 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
              <ShieldCheck className="h-3 w-3 text-accent" />
              Verificeret
            </div>
          ) : (
            <span />
          )}
          <FavoriteButton businessId={biz.id} />
        </div>

        {biz.logo_url && (
          <div className="absolute bottom-4 left-4 h-14 w-14 overflow-hidden rounded-2xl border border-border bg-background shadow-md">
            <img
              src={biz.logo_url}
              alt=""
              className="h-full w-full object-contain p-1.5"
            />
          </div>
        )}
      </div>

      <div
        className={`flex flex-1 flex-col justify-between px-5 py-5 ${biz.logo_url ? "pt-6" : "pt-5"}`}
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-foreground">
              {biz.name}
            </h3>
            {biz._reviewCount && biz._reviewCount > 0 ? (
              <div className="flex shrink-0 items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                <span className="font-medium text-foreground">
                  {biz._avgRating!.toFixed(1)}
                </span>
              </div>
            ) : (
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                Ny
              </span>
            )}
          </div>

          {primaryCat && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                {primaryCat}
              </span>
              {extraCats > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  +{extraCats} mere
                </span>
              )}
            </div>
          )}

          {biz.city && (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{biz.city}</span>
            </div>
          )}
        </div>

        <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          Se virksomhed
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
};

const RecentBusinesses = () => {
  const { data: businesses } = useQuery({
    queryKey: ["recent-businesses"],
    queryFn: async () => {
      const { data: bizList } = await supabase
        .from("businesses")
        .select(
          "id, name, slug, city, logo_url, cover_image_url, is_verified, category, categories, created_at",
        )
        .eq("is_active", true)
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);

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
        _avgRating: stats[b.id] ? stats[b.id].sum / stats[b.id].n : 0,
        _reviewCount: stats[b.id]?.n ?? 0,
      })) as Biz[];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!businesses || businesses.length === 0) return null;

  const featured = businesses.slice(0, 6);

  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Virksomheder
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Aktuelle profiler, der er nemme at vurdere hurtigt.
            </h2>
          </div>
          <Link
            to="/virksomheder"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-80"
          >
            Vis alle virksomheder
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="hidden gap-4 lg:grid lg:grid-cols-12">
          {featured.map((biz, index) => {
            const isFeatured = index === 0;
            const spanClass = isFeatured
              ? "col-span-7 row-span-2"
              : "col-span-5";
            return (
              <div key={biz.id} className={spanClass}>
                <BusinessCard biz={biz} featured={isFeatured} />
              </div>
            );
          })}
        </div>

        <div className="lg:hidden">
          <HorizontalScroller>
            {businesses.map((biz, index) => (
              <div key={biz.id} className="w-[304px] shrink-0 sm:w-[340px]">
                <BusinessCard biz={biz} featured={index === 0} />
              </div>
            ))}
          </HorizontalScroller>
        </div>
      </div>
    </section>
  );
};

export default RecentBusinesses;
