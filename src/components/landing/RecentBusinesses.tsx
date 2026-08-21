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

  return (
    <article className="group relative flex w-[270px] shrink-0 flex-col overflow-hidden rounded-[28px] bg-card ring-1 ring-border/70 transition-[box-shadow,ring-color] duration-300 hover:ring-accent/50 hover:shadow-[0_26px_50px_-28px_hsl(var(--foreground)/0.45)] sm:w-[292px]">
      {/* Favorit-knappen ligger uden for linket — så vi undgår ulovlig
          nested <button> i <a> (skærmlæser-fjendtligt og ugyldig HTML).
          FavoriteButton positionerer sig selv absolut top-right. */}
      <FavoriteButton businessId={biz.id} className="z-20" />
      <Link
        to={`/v/${biz.slug}`}
        aria-label={`${biz.name}${biz.city ? `, ${biz.city}` : ""} — se virksomhed`}
        className="flex flex-col gap-3"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-[28px] bg-secondary">
          {biz.cover_image_url ? (
            <img
              src={biz.cover_image_url}
              alt={`${biz.name}${biz.city ? ` – ${biz.city}` : ""}${primaryCat ? `, ${primaryCat}` : ""}`}
              className="h-full w-full object-cover"
              width={400}
              height={300}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <Building2 className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {biz.is_verified && (
            <div className="absolute left-3.5 top-3.5">
              <div className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur">
                <ShieldCheck className="h-3 w-3 text-accent" />
                Verificeret
              </div>
            </div>
          )}
        </div>

        <div className="relative space-y-3 p-5 pt-8">
          {/* Logo overlay — løftes op over coveret så virksomheden står tydeligt frem */}
          <div className="absolute -top-7 left-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border-2 border-card bg-card shadow-md">
            {biz.logo_url ? (
              <img src={biz.logo_url} alt={`Logo for ${biz.name}`} className="h-full w-full object-contain p-1" loading="lazy" decoding="async" />
            ) : (
              <span className="text-base font-bold text-accent">{biz.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground">{biz.name}</h3>
              {biz.city && (
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{biz.city}</span>
                </div>
              )}
            </div>
            {biz._reviewCount && biz._reviewCount > 0 ? (
              <div className="flex shrink-0 items-center gap-1 text-sm text-foreground">
                <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                <span className="font-medium">{biz._avgRating!.toFixed(1)}</span>
              </div>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">Ny</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            {primaryCat ? (
              <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
                {primaryCat}
              </span>
            ) : <span />}
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
              Se virksomhed
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
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
      const { data: revs } = await supabase.from("reviews").select("business_id, rating").in("business_id", ids).is("hidden_at", null);

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

  const verifiedCount = businesses.filter((b) => b.is_verified).length;
  const cityCount = new Set(businesses.map((b) => b.city).filter(Boolean)).size;

  return (
    <section className="relative isolate overflow-hidden bg-ocean py-20 text-ocean-foreground md:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-0 h-80 w-80 rounded-full bg-accent/25 blur-[130px]" />
        <div className="absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-feature-lilac/20 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-ocean-foreground/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ocean-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Nyeste på platformen
            </span>
            <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] md:text-[2.75rem] lg:text-[3.25rem]">
              Nye virksomheder i Danmark
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-ocean-foreground/75 md:text-base">
              Bladr i de seneste udbydere — klik på et kort for at se priser, ydelser og anmeldelser.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[13px] font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ocean-foreground/25 bg-ocean-foreground/[0.14] px-3.5 py-1.5 text-ocean-foreground">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                {businesses.length} nye profiler
              </span>
              {verifiedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/20 px-3.5 py-1.5 text-ocean-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {verifiedCount} verificeret
                </span>
              )}
              {cityCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ocean-foreground/25 bg-ocean-foreground/[0.14] px-3.5 py-1.5 text-ocean-foreground">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {cityCount} {cityCount === 1 ? "by" : "byer"}
                </span>
              )}
            </div>
          </div>
          <Link
            to="/virksomheder"
            className="group inline-flex items-center gap-2 self-start rounded-full bg-ocean-foreground px-5 py-2.5 text-sm font-semibold text-ocean transition-all hover:-translate-y-0.5 md:self-auto"
          >
            Se alle virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
