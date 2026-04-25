import { useParams, Link } from "react-router-dom";
import { useBusinessBySlug, useServices, useReviews } from "@/hooks/useDatabase";
import CartSheet from "@/components/business/CartSheet";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import BusinessSEO from "@/components/business/BusinessSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { useState, useMemo } from "react";
import {
  ArrowLeft, Star, Mail, Phone, MapPin, Clock, CheckCircle,
  ArrowDown, Sparkles, BadgeCheck,
} from "lucide-react";
import Footer from "@/components/landing/Footer";

/* ─── Opening-hours helpers ───
 * Sorter åbningstider i kanonisk rækkefølge (Man → Søn) uafhængigt af
 * hvordan virksomheden tastede dem ind. Vi normaliserer dagen til lowercase
 * og laver fallback til alfabetisk sortering for ukendte nøgler. */
const DAY_ORDER: Record<string, number> = {
  mandag: 0, tirsdag: 1, onsdag: 2, torsdag: 3, fredag: 4, lørdag: 5, søndag: 6,
  // Engelsk fallback i tilfælde af legacy-data
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
};
const sortOpeningHours = (entries: [string, string][]): [string, string][] =>
  [...entries].sort(([a], [b]) => {
    const ai = DAY_ORDER[a.toLowerCase()] ?? 99;
    const bi = DAY_ORDER[b.toLowerCase()] ?? 99;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b, "da");
  });

/* ───── Main Content ───── */
const DynamicBusinessContent = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: business, isLoading, error } = useBusinessBySlug(slug || "");
  const { data: services } = useServices(business?.id);
  const { data: reviews } = useReviews(business?.id);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Memoize grouped services
  type ServiceItem = NonNullable<typeof services>[number];
  const groupedServices = useMemo(() => {
    const groups: Record<string, Record<string, ServiceItem[]>> = {};
    services?.forEach((s) => {
      const cat = (s as any).service_category || "Øvrige";
      const sub = (s as any).subcategory || "";
      if (!groups[cat]) groups[cat] = {};
      if (!groups[cat][sub]) groups[cat][sub] = [];
      groups[cat][sub].push(s);
    });
    return groups;
  }, [services]);

  const categories = Object.keys(groupedServices);
  const hasMultipleCategories = categories.length > 1;

  const displayedServices = useMemo(() => {
    if (!activeCategory) return groupedServices;
    return { [activeCategory]: groupedServices[activeCategory] };
  }, [activeCategory, groupedServices]);

  const categoryEntries = useMemo(() => {
    return Object.entries(displayedServices).map(([cat, subs]) => ({
      cat,
      subs,
      total: Object.values(subs).flat().length,
    }));
  }, [displayedServices]);

  const shouldUseCompactCategoryGrid = useMemo(
    () => !activeCategory && categoryEntries.length >= 2 && categoryEntries.every((entry) => entry.total === 1),
    [activeCategory, categoryEntries]
  );

  const compactCategoryEntries = useMemo(
    () => (shouldUseCompactCategoryGrid ? categoryEntries : []),
    [categoryEntries, shouldUseCompactCategoryGrid]
  );

  const fullWidthCategoryEntries = useMemo(
    () => (shouldUseCompactCategoryGrid ? [] : categoryEntries),
    [categoryEntries, shouldUseCompactCategoryGrid]
  );

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="text-sm text-muted-foreground">Indlæser virksomhed...</span>
      </div>
    </div>
  );

  if (error || !business) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Virksomheden blev ikke fundet.</p>
      <Link to="/"><Button variant="outline">Tilbage til forsiden</Button></Link>
    </div>
  );

  const avgRating = reviews?.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const openingHours = business.opening_hours && typeof business.opening_hours === "object"
    ? sortOpeningHours(
        Object.entries(business.opening_hours as Record<string, string>).filter(([, v]) => v)
      )
    : [];
  const hasCover = !!business.cover_image_url;

  const scrollToServices = () => {
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
  };

  // Stats
  const serviceCount = services?.length || 0;
  const reviewCount = reviews?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <BusinessSEO
        name={business.name}
        description={business.description}
        city={business.city}
        address={business.address}
        zipCode={business.zip_code}
        phone={business.phone}
        email={business.email}
        logoUrl={business.logo_url}
        coverImageUrl={business.cover_image_url}
        avgRating={avgRating}
        reviewCount={reviewCount}
        slug={business.slug}
        openingHours={business.opening_hours as Record<string, string> | undefined}
        categories={(business.categories?.length ? business.categories : [business.category]).filter(Boolean) as string[]}
        services={services?.map((s: any) => ({ name: s.name, description: s.description, base_price: s.base_price }))}
      />

      {/* ── Sticky Nav (light, matches landing) ── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md" aria-label="Virksomhedsnavigation">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" aria-label="Tilbage til Serviceydere" className="transition-opacity hover:opacity-80">
              <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-8 md:h-9" />
            </Link>
            <Separator orientation="vertical" className="mx-1 h-5 hidden sm:block" />
            <span className="hidden truncate text-sm font-semibold text-foreground sm:inline">{business.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/virksomheder" className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:bg-secondary/70">
              <ArrowLeft className="h-3.5 w-3.5" /> Tilbage til søgning
            </Link>
            <CartSheet businessId={business.id} />
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 md:pt-6">
          {/* Cover image med blød gradient */}
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-secondary shadow-[0_26px_60px_-40px_hsl(var(--foreground)/0.22)]">
            <div className={`relative w-full ${hasCover ? "h-48 sm:h-56 md:h-72 lg:h-80" : "h-24 md:h-28"}`}>
              {hasCover && (
                <>
                  <img
                    src={business.cover_image_url!}
                    alt={`${business.name} cover`}
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />
                </>
              )}
            </div>
          </div>

          {/* Identity row — logo + navn + meta sammen, så hierarki er klart.
              Logo og tekstblok ligger på samme baseline lige under cover. */}
          <div className="relative -mt-8 flex flex-col gap-5 pb-6 md:-mt-10 md:flex-row md:items-end md:gap-6 md:pb-8">
            {/* Logo */}
            <div className="relative z-10 shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-card shadow-xl md:h-24 md:w-24">
                {business.logo_url ? (
                  <img src={business.logo_url} alt={`${business.name} logo`} className="h-full w-full object-contain p-2" loading="eager" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-accent/5 text-3xl font-extrabold text-accent">
                    {business.name.charAt(0)}
                  </div>
                )}
              </div>
              {business.is_verified && (
                <span
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground ring-4 ring-background shadow-md"
                  title="Verificeret virksomhed"
                >
                  <BadgeCheck className="h-4 w-4" strokeWidth={3} />
                </span>
              )}
            </div>

            {/* Tekst-kolonne */}
            <div className="min-w-0 flex-1">
              {/* Brancher som diskrete chips øverst */}
              {(business.categories?.[0] || business.category) && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(business.categories?.length ? business.categories : [business.category]).filter(Boolean).slice(0, 3).map((c) => (
                    <span key={c} className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground/70">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-[1.85rem] font-extrabold leading-tight tracking-tight text-foreground md:text-[2.25rem] lg:text-[2.6rem]">
                  {business.name}
                </h1>
                {business.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/20">
                    <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.75} />
                    Verificeret
                  </span>
                )}
              </div>

              {/* Meta-rækken — rating, by, antal services */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                {avgRating ? (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-foreground text-foreground" />
                    <span className="font-semibold text-foreground">{avgRating}</span>
                    <span>· {reviewCount} {reviewCount === 1 ? "anmeldelse" : "anmeldelser"}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Ny på platformen
                  </span>
                )}
                {business.city && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{business.city}
                    </span>
                  </>
                )}
                {serviceCount > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span>{serviceCount} {serviceCount === 1 ? "service" : "services"}</span>
                  </>
                )}
              </div>

              {business.description && (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground line-clamp-2 md:text-[0.95rem]">{business.description}</p>
              )}
            </div>

            {/* CTA — kun på md+, knappen flyttes ind i sidebar på mobil for et renere hero */}
            {business.phone && services && services.length > 0 && (
              <div className="hidden shrink-0 md:flex md:flex-col md:gap-2">
                <a href={`tel:${business.phone}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 gap-2 rounded-full border-border bg-card px-5 text-sm font-semibold text-foreground transition-all hover:border-foreground/40 hover:bg-secondary"
                  >
                    <Phone className="h-4 w-4" /> Ring nu
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      </header>


      {/* ── Body ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 py-3 md:gap-5 md:py-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">

          {/* ── Main Column ── */}
          <div className="min-w-0 space-y-8">

            {/* Services */}
            {services && services.length > 0 && (
              <section id="services" aria-labelledby="services-heading" className="rounded-[2rem] border border-border bg-card p-4 shadow-[0_22px_50px_-34px_hsl(var(--foreground)/0.2)] md:p-5">
                <div className="mb-4 flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Book direkte</p>
                    <h2 id="services-heading" className="text-[1.75rem] font-bold text-foreground">Services</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Vælg en service, tilpas den hvis nødvendigt, og læg den direkte i bestillingen.</p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">{serviceCount} {serviceCount === 1 ? "service" : "services"}</span>
                </div>

                {/* Category filter pills */}
                 {hasMultipleCategories && (
                   <div className="mb-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        !activeCategory
                          ? "border-accent bg-accent text-accent-foreground shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
                      }`}
                    >
                      Alle
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                          activeCategory === cat
                            ? "border-accent bg-accent text-accent-foreground shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
                        }`}
                      >
                        {cat}
                        <span className="ml-1.5 text-xs opacity-70">
                          {Object.values(groupedServices[cat]).flat().length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Service cards */}
                 <div className="space-y-6">
                  {fullWidthCategoryEntries.map(({ cat, subs }) => (
                    <div key={cat}>
                      {(hasMultipleCategories || Object.keys(subs).some(k => k !== "")) && (
                        <h3 className="mb-4 text-lg font-bold text-foreground">{cat}</h3>
                      )}
                      {Object.keys(subs).length >= 2 && Object.entries(subs).every(([, items]) => items.length === 1) ? (
                         <div className="grid gap-5 md:grid-cols-2">
                          {Object.entries(subs).map(([sub, items]) => {
                            const service = items[0];

                            return (
                               <div key={sub || service.id} className="flex h-full flex-col gap-2.5">
                                {sub && (
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{sub}</h4>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <DynamicServiceCard
                                    key={service.id}
                                    service={service}
                                    businessName={business.name}
                                    businessLogoUrl={business.logo_url || undefined}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                         <div className="space-y-5">
                          {Object.entries(subs).map(([sub, items]) => (
                            <div key={sub || "default"}>
                              {sub && (
                                <h4 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{sub}</h4>
                              )}
                               <div className="grid gap-4 sm:grid-cols-2">
                                {items.map((s) => (
                                  <DynamicServiceCard
                                    key={s.id}
                                    service={s}
                                    businessName={business.name}
                                    businessLogoUrl={business.logo_url || undefined}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {compactCategoryEntries.length > 0 && (
                     <div className="grid gap-5 md:grid-cols-2">
                      {compactCategoryEntries.map(({ cat, subs }) => {
                        const [sub, items] = Object.entries(subs)[0];
                        const service = items[0];

                        return (
                          <div key={cat} className="flex h-full flex-col gap-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-bold text-foreground">{cat}</h3>
                                {sub && (
                                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{sub}</p>
                                )}
                              </div>
                              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">1 service</span>
                            </div>

                            <div className="flex-1">
                              <DynamicServiceCard
                                key={service.id}
                                service={service}
                                businessName={business.name}
                                businessLogoUrl={business.logo_url || undefined}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* About */}
             {business.description && (
               <section aria-labelledby="about-heading" className="rounded-[2rem] border border-border bg-secondary/20 p-5 md:p-7">
                <div className="max-w-3xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Virksomhedsprofil</p>
                  <h2 id="about-heading" className="mb-3 text-xl font-bold text-foreground md:text-2xl">Om {business.name}</h2>
                  <p className="leading-7 text-muted-foreground whitespace-pre-line">{business.description}</p>
                </div>
              </section>
            )}

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <section id="reviews" aria-labelledby="reviews-heading">
                <div className="mb-5 flex items-center justify-between">
                  <h2 id="reviews-heading" className="text-xl font-bold text-foreground">Anmeldelser</h2>
                  {avgRating && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className={`h-4 w-4 ${i <= Math.round(Number(avgRating)) ? "fill-accent text-accent" : "text-muted"}`} />
                        ))}
                      </div>
                      <span className="font-medium text-foreground">{avgRating}</span>
                      <span className="text-muted-foreground">({reviewCount})</span>
                    </div>
                  )}
                </div>

                {/* Rating distribution */}
                {reviewCount >= 3 && (
                  <div className="mb-5 rounded-3xl border border-border bg-secondary/25 p-5 md:p-6">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-foreground">{avgRating}</div>
                        <div className="flex gap-0.5 mt-1">
                          {[1,2,3,4,5].map((i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(Number(avgRating)) ? "fill-accent text-accent" : "text-muted"}`} />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{reviewCount} anmeldelser</div>
                      </div>
                      <div className="flex-1 space-y-1">
                        {[5,4,3,2,1].map((rating) => {
                          const count = reviews.filter(r => r.rating === rating).length;
                          const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                          return (
                            <div key={rating} className="flex items-center gap-2 text-xs">
                              <span className="w-3 text-muted-foreground">{rating}</span>
                              <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-6 text-right text-muted-foreground">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                  <div className="grid gap-4 sm:grid-cols-2">
                  {reviews.map((r) => (
                    <Card key={r.id} className="rounded-2xl border-border bg-card/90 shadow-sm">
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                            {r.reviewer_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">{r.reviewer_name}</span>
                            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("da-DK", { year: "numeric", month: "short", day: "numeric" })}</span>
                          </div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map((i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-accent text-accent" : "text-muted"}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm leading-relaxed text-muted-foreground">{r.comment}</p>}
                        {r.is_verified && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-accent">
                            <CheckCircle className="h-3 w-3" /> Verificeret kunde
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-24 lg:self-start">
            {/* Bestil/Contact Card — primary CTA */}
             <Card className="overflow-hidden rounded-[2rem] border border-border shadow-[0_22px_50px_-34px_hsl(var(--foreground)/0.22)]">
               <div className="border-b border-accent/15 bg-accent/5 px-5 py-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h3 className="font-bold text-foreground">Klar til at bestille?</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Vælg en service nedenfor eller kontakt {business.name} direkte.</p>
                {services && services.length > 0 && (
                  <Button
                    onClick={scrollToServices}
                    className="mt-3 hidden h-11 w-full gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-md shadow-accent/20 transition-all hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/30 active:scale-[0.98] lg:flex"
                  >
                    Se {serviceCount} service{serviceCount === 1 ? "" : "s"} <ArrowDown className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CardContent className="space-y-2 p-4">
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-secondary active:scale-[0.99]">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{business.phone}</span>
                  </a>
                )}
                {business.email && (
                  <a href={`mailto:${business.email}`} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-all hover:border-foreground/30 hover:bg-secondary active:scale-[0.99]">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{business.email}</span>
                  </a>
                )}
                {business.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.address}${business.zip_code ? `, ${business.zip_code}` : ""}${business.city ? ` ${business.city}` : ""}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground font-medium transition-all hover:border-foreground/30 hover:bg-secondary active:scale-[0.99]"
                  >
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <span>{business.address}{business.zip_code ? `, ${business.zip_code}` : ""}{business.city ? ` ${business.city}` : ""}</span>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Opening Hours */}
             {openingHours.length > 0 && (
               <Card className="rounded-[2rem] border-border bg-card/90 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
                    <Clock className="h-4 w-4 text-accent" /> Åbningstider
                  </h3>
                  <div className="space-y-2 text-sm">
                    {openingHours.map(([day, time]) => {
                      const today = new Date().toLocaleDateString("da-DK", { weekday: "long" });
                      const isToday = day.toLowerCase() === today.toLowerCase();
                      return (
                        <div key={day} className={`flex justify-between rounded-lg px-2 py-1 ${isToday ? "bg-accent/5 font-medium" : ""}`}>
                          <span className={isToday ? "text-foreground" : "text-muted-foreground"}>
                            {day} {isToday && <span className="text-xs text-accent ml-1">i dag</span>}
                          </span>
                          <span className={isToday ? "text-foreground font-semibold" : "font-medium text-foreground"}>{time}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trust Badges */}
             <Card className="rounded-[2rem] border-border bg-card/90 shadow-sm">
              <CardContent className="space-y-3 p-5">
                {business.is_verified && (
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                      <CheckCircle className="h-4 w-4 text-accent" />
                    </div>
                    <span className="font-medium">Verificeret virksomhed</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                  </div>
                  <span className="font-medium">Sikker betaling</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <Star className="h-4 w-4 text-accent" />
                  </div>
                  <span className="font-medium">Ægte anmeldelser</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const DynamicBusinessPage = () => <DynamicBusinessContent />;

export default DynamicBusinessPage;
