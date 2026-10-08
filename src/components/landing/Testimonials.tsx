import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Quote, Building2, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import HorizontalScroller from "./HorizontalScroller";
import { SectionLabelMark } from "@/components/shared/UiArtwork";

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

const Stars = ({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) => (
  <div className="flex items-center gap-1" aria-label={`${rating} ud af 5 stjerner`}>
    {Array.from({ length: 5 }).map((_, idx) => (
      <Star
        aria-hidden
        key={idx}
        className={`${size} ${idx < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
      />
    ))}
  </div>
);

const Reviewer = ({ r }: { r: Review }) => (
  <div className="flex items-center gap-3 border-t border-border pt-4">
    {/* Anmelderens avatar — profilbillede eller initial-fallback. */}
    {r._avatarUrl ? (
      <img
        src={r._avatarUrl}
        alt={r.reviewer_name}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
        loading="lazy"
        decoding="async"
      />
    ) : (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-semibold ring-1 ring-accent/25">
        {r.reviewer_name.charAt(0).toUpperCase()}
      </div>
    )}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="truncate text-sm font-semibold text-foreground">{r.reviewer_name}</span>
        <BadgeCheck aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent" />
      </div>
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
);

const ReviewCard = ({ r, featured = false }: { r: Review; featured?: boolean }) => (
  <article
    className={`group/review relative flex shrink-0 flex-col overflow-hidden rounded-xl border border-border/90 bg-card shadow-sm transition-[border-color,box-shadow,transform] duration-300 motion-safe:hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-premium ${
      featured ? "p-6 sm:p-7 2xl:p-8" : "p-5 2xl:p-7"
    }`}
  >
    <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-accent opacity-0 transition-opacity duration-300 group-hover/review:opacity-100" />
    <Quote aria-hidden className={`absolute rotate-180 text-foreground/10 ${featured ? "right-6 top-6 h-10 w-10" : "right-5 top-5 h-8 w-8"}`} />
    <div className="mb-4">
      <Stars rating={r.rating} size={featured ? "h-5 w-5" : "h-4 w-4"} />
    </div>
    <p
      className={`mb-6 flex-1 text-foreground ${
        featured
          ? "line-clamp-5 text-[17px] leading-8 sm:text-lg sm:leading-8"
          : "line-clamp-4 text-[15px] leading-7"
      }`}
    >
      “{r.comment}”
    </p>
    <Reviewer r={r} />
  </article>
);

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
      // Virksomhedslinket er valgfrit — en anmeldelse uden tilknyttet virksomhed skal stadig vises.
      const rows = ((data as unknown as Review[]) ?? []).filter(
        (r) => r.comment && r.comment.length > 20,
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

  const [featured, ...rest] = shuffled;
  const gridRest = rest.slice(0, 4);

  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-secondary/25 py-12 sm:py-14 lg:py-16 2xl:py-24">
      {/* Diskret accent-glød i hjørnerne giver sektionen dybde uden at forstyrre. */}
      <div aria-hidden className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between 2xl:mb-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <SectionLabelMark />
              Anmeldelser
            </span>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] text-foreground sm:text-[2.2rem] lg:text-[2.4rem] 2xl:mt-5 2xl:text-[2.75rem]">
              Det siger kunderne
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Kun kunder med en bekræftet booking kan anmelde. Derfor er stjernerne her erfaringer
              fra opgaver, der faktisk er blevet udført.
            </p>
          </div>
        </div>

        {/* Mobil/tablet: vandret scroller man kan stryge i. */}
        <div className="lg:hidden">
          <HorizontalScroller fadeEdges={false} ariaLabel="Kundeanmeldelser — stryg vandret for at se flere">
            {shuffled.map((r) => (
              <div key={r.id} className="w-[286px] shrink-0 sm:w-[330px]">
                <ReviewCard r={r} />
              </div>
            ))}
          </HorizontalScroller>
        </div>

        {/* Desktop: bento-grid med én fremhævet anmeldelse. */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-5 2xl:gap-6">
          <div className="lg:col-span-2">
            <ReviewCard r={featured} featured />
          </div>
          {gridRest.map((r) => (
            <ReviewCard key={r.id} r={r} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
