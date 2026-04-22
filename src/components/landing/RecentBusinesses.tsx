import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ShieldCheck, MapPin, Building2, ArrowRight } from "lucide-react";
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

  const [featured, ...others] = businesses;
  const categories = featured.categories?.length
    ? featured.categories
    : featured.category
      ? [featured.category]
      : [];

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Virksomheder
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Aktuelle profiler du kan vurdere med det samme.
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

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
          <Link
            to={`/b/${featured.slug}`}
            className="group relative overflow-hidden rounded-[36px] bg-secondary"
          >
            <div className="relative aspect-[16/11] overflow-hidden">
              {featured.cover_image_url ? (
                <img
                  src={featured.cover_image_url}
                  alt={featured.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary">
                  <Building2 className="h-16 w-16 text-muted-foreground/35" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
              <div className="absolute right-4 top-4">
                <FavoriteButton businessId={featured.id} />
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
              <div className="max-w-xl">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {featured.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-background/92 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-sm">
                      <ShieldCheck className="h-3 w-3 text-accent" />
                      Verificeret
                    </span>
                  )}
                  {categories.slice(0, 2).map((category) => (
                    <span
                      key={category}
                      className="inline-flex rounded-full bg-background/18 px-2.5 py-1 text-[11px] font-semibold text-background backdrop-blur-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>

                <h3 className="text-2xl font-semibold tracking-tight text-background sm:text-3xl">
                  {featured.name}
                </h3>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-background/78">
                  {featured._reviewCount && featured._reviewCount > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-background text-background" />
                      {featured._avgRating?.toFixed(1)} ·{" "}
                      {featured._reviewCount} anmeldelser
                    </span>
                  ) : (
                    <span>Ny profil</span>
                  )}
                  {featured.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {featured.city}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>

          <div className="border-t border-border lg:border-t-0 lg:border-l lg:pl-8">
            {others.slice(0, 5).map((biz, index) => {
              const cats = biz.categories?.length
                ? biz.categories
                : biz.category
                  ? [biz.category]
                  : [];
              return (
                <Link
                  key={biz.id}
                  to={`/b/${biz.slug}`}
                  className={`group grid gap-4 py-5 sm:grid-cols-[120px_minmax(0,1fr)] ${index > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-secondary">
                    {biz.cover_image_url ? (
                      <img
                        src={biz.cover_image_url}
                        alt={biz.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary">
                        <Building2 className="h-10 w-10 text-muted-foreground/35" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold tracking-tight text-foreground">
                          {biz.name}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {biz.is_verified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 font-semibold text-foreground">
                              <ShieldCheck className="h-3 w-3 text-accent" />
                              Verificeret
                            </span>
                          )}
                          {cats[0] && <span>{cats[0]}</span>}
                        </div>
                      </div>

                      {biz._reviewCount && biz._reviewCount > 0 && (
                        <div className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground">
                          <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                          {biz._avgRating?.toFixed(1)}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      {biz.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {biz.city}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-2 font-medium text-foreground">
                        Se virksomhed
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecentBusinesses;
