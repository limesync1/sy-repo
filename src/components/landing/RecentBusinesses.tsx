import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ShieldCheck, Heart, MapPin, Building2 } from "lucide-react";
import { useState } from "react";
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

const BusinessCard = ({ biz }: { biz: Biz }) => {
  const [liked, setLiked] = useState(false);
  const cats = biz.categories?.length ? biz.categories : (biz.category ? [biz.category] : []);
  const primaryCat = cats[0];
  const extraCats = cats.length - 1;

  return (
    <Link
      to={`/b/${biz.slug}`}
      className="group flex w-[280px] shrink-0 flex-col gap-3 sm:w-[300px]"
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-secondary">
        {biz.cover_image_url ? (
          <img
            src={biz.cover_image_url}
            alt={biz.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <Building2 className="h-14 w-14 text-muted-foreground/30" />
          </div>
        )}

        {/* Heart */}
        <button
          onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
          className="absolute right-3 top-3 transition-transform hover:scale-110"
          aria-label="Gem"
        >
          <Heart className={`h-7 w-7 stroke-[2] drop-shadow-md ${liked ? "fill-accent text-accent" : "fill-foreground/30 text-white"}`} />
        </button>

        {/* Verified badge */}
        {biz.is_verified && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
            <ShieldCheck className="h-3 w-3 text-accent" />
            Verificeret
          </div>
        )}

        {/* Logo chip bottom-left — properly contained */}
        {biz.logo_url && (
          <div className="absolute -bottom-5 left-4 h-14 w-14 overflow-hidden rounded-xl border-2 border-card bg-card shadow-md flex items-center justify-center">
            <img src={biz.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className={`flex flex-col gap-1 px-1 ${biz.logo_url ? "pt-4" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground line-clamp-1">{biz.name}</h3>
          {biz._reviewCount && biz._reviewCount > 0 ? (
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
              <span className="font-medium text-foreground">{biz._avgRating!.toFixed(1)}</span>
            </div>
          ) : (
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Ny</span>
          )}
        </div>

        {/* Categories — labelled, with chip styling */}
        {primaryCat && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
              {primaryCat}
            </span>
            {extraCats > 0 && (
              <span className="text-[11px] font-medium text-muted-foreground">+{extraCats} mere</span>
            )}
          </div>
        )}

        {/* Location with explicit icon */}
        {biz.city && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{biz.city}</span>
          </div>
        )}
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
        .select("id, name, slug, city, logo_url, cover_image_url, is_verified, category, categories, created_at")
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

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Populære virksomheder
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Verificerede serviceydere — klar til opgaven</p>
          </div>
          <Link to="/search" className="text-sm font-semibold text-foreground underline-offset-4 hover:underline">
            Vis alle
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
