import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ShieldCheck, MapPin, Building2, ArrowRight } from "lucide-react";
import HorizontalScroller from "./HorizontalScroller";
import FavoriteButton from "@/components/business/FavoriteButton";
import BusinessCover from "@/components/shared/media/BusinessCover";
import BusinessLogo from "@/components/shared/media/BusinessLogo";
import { cn } from "@/lib/utils";

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

const BusinessCard = ({ biz, className }: { biz: Biz; className?: string }) => {
  const cats = biz.categories?.length ? biz.categories : biz.category ? [biz.category] : [];
  const primaryCat = cats[0];

  return (
    <article className={cn("group relative flex h-[390px] w-[270px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg sm:w-[292px]", className)}>
      {/* Favorit-knappen ligger uden for linket — så vi undgår ulovlig
          nested <button> i <a> (skærmlæser-fjendtligt og ugyldig HTML).
          FavoriteButton positionerer sig selv absolut top-right. */}
      <FavoriteButton businessId={biz.id} className="z-20" />
      <Link
        to={`/v/${biz.slug}`}
        aria-label={`${biz.name}${biz.city ? `, ${biz.city}` : ""} — se virksomhed`}
        className="flex flex-1 flex-col"
      >
        <div className="relative">
          <BusinessCover
            url={biz.cover_image_url}
            name={biz.name}
            alt={`${biz.name}${biz.city ? ` – ${biz.city}` : ""}${primaryCat ? `, ${primaryCat}` : ""}`}
            ratio="16/10"
            sizes="(max-width: 640px) 80vw, 320px"
            widths={[320, 480, 640, 960]}
            className="rounded-t-lg"
          />
          {biz.is_verified && (
            <div className="absolute left-3.5 top-3.5">
               <div className="inline-flex items-center gap-1 rounded-md bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
                <ShieldCheck className="h-3 w-3 text-accent" />
                Verificeret
              </div>
            </div>
          )}
        </div>


        <div className="flex min-h-0 flex-1 flex-col p-5">
          {/* Logo står på linje med navnet — det gamle overlap gjorde smalle
              logoer til en tynd stribe henover coveret. */}
          <div className="flex min-w-0 items-start gap-3">
            <BusinessLogo url={biz.logo_url} name={biz.name} size={44} className="shadow-sm" />
            <div className="min-w-0 flex-1">
               <h3 className="line-clamp-2 min-h-[44px] text-base font-semibold leading-snug text-foreground">
                {biz.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-muted-foreground">
                {biz.city && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{biz.city}</span>
                  </span>
                )}
                {biz._reviewCount && biz._reviewCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                    <span className="font-medium">{(biz._avgRating ?? 0).toFixed(1)}</span>
                    <span className="text-muted-foreground">({biz._reviewCount})</span>
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground/80">Ny profil</span>
                )}
              </div>
            </div>
          </div>


          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            {primaryCat ? (
              <span className="line-clamp-1 inline-flex max-w-[120px] items-center rounded-md bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
                {primaryCat}
              </span>
            ) : <span />}
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              Se profil
              <ArrowRight className="h-3.5 w-3.5" />
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




  return (
    <section className="relative isolate overflow-hidden bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-9 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Nye på platformen
            </span>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-[2.35rem] lg:text-[2.75rem]">
              Nye virksomheder i Danmark
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground md:text-base">
               Se de senest oprettede virksomhedsprofiler. Åbn en profil for at se ydelser,
               priser, område og eventuelle anmeldelser.
            </p>
          </div>
          <Link
            to="/virksomheder"
            className="group inline-flex items-center gap-2 self-start rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:-translate-y-0.5 md:self-auto"
          >
            Se alle virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>



        {businesses.length <= 3 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {businesses.map((biz) => (
              <BusinessCard key={biz.id} biz={biz} className="w-full sm:w-full" />
            ))}
          </div>
        ) : (
          <HorizontalScroller ariaLabel="Nye virksomheder — stryg vandret for at se flere">
            {businesses.map((biz) => (
              <BusinessCard key={biz.id} biz={biz} />
            ))}
          </HorizontalScroller>
        )}
      </div>
    </section>
  );

};

export default RecentBusinesses;
