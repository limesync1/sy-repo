import { useParams, Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useBusinessBySlug, useServices, useReviews } from "@/hooks/useDatabase";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import BusinessSEO from "@/components/business/BusinessSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { useState, useMemo, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Star, Mail, Phone, MapPin, Clock, CheckCircle,
  ArrowDown, Sparkles, BadgeCheck, Wrench,
} from "lucide-react";
import Footer from "@/components/landing/Footer";
import BusinessLiveChatWidget from "@/components/livechat/BusinessLiveChatWidget";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";

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
  // Hvis slug ikke matcher en aktuel virksomhed, slår vi op i historikken
  // og redirecter til den nuværende adresse — så gamle links altid virker.
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  useEffect(() => {
    if (!slug || business || isLoading) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("business_slug_history")
        .select("business_id, businesses!inner(slug)")
        .eq("slug", slug)
        .maybeSingle();
      const newSlug = (data as any)?.businesses?.slug;
      if (!cancelled && newSlug && newSlug !== slug) setRedirectTo(`/v/${newSlug}`);
    })();
    return () => { cancelled = true; };
  }, [slug, business, isLoading]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { count: cartCount, sheetOpen: cartSheetOpen } = useCart();
  const cartFabVisible = cartCount > 0 && !cartSheetOpen;

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

  if (isLoading) return <BusinessPageSkeleton />;

  if (redirectTo) return <Navigate to={redirectTo} replace />;

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
        reviews={reviews?.map((r: any) => ({
          reviewer_name: r.reviewer_name,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
        }))}
        customDomain={(business.settings as any)?.custom_domain || null}
      />

      {/* ── Sticky Nav (light, matches landing) ── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md" aria-label="Virksomhedsnavigation">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" aria-label="Tilbage til Serviceydere" className="transition-opacity hover:opacity-80">
              <img
                src="/serviceydere-logo-dark.webp"
                alt="Serviceydere"
                className="h-10 md:h-12 w-auto"
                width={1920}
                height={539}
                decoding="async"
                fetchPriority="high"
               loading="lazy"/>
            </Link>
            <Separator orientation="vertical" className="mx-1 h-5 hidden sm:block" />
            <span className="hidden truncate text-sm font-semibold text-foreground sm:inline">{business.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/virksomheder" className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:bg-secondary/70">
              <ArrowLeft className="h-3.5 w-3.5" /> Tilbage til søgning
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="relative border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 md:pt-6">
          {/* Cover — roligt bredformat der aldrig bliver højere end skærmen
              tåler: 3:2 på mobil, 16:7 på tablet, 21:8 på store skærme, med et
              hårdt loft så coveret ikke skubber indholdet ned. */}
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-secondary shadow-[0_26px_60px_-40px_hsl(var(--foreground)/0.22)]">
            {hasCover ? (
              <a
                href={business.cover_image_url!}
                target="_blank"
                rel="noreferrer"
                aria-label="Åbn coverbillede i fuld størrelse"
                className="group relative block aspect-[2/1] max-h-[180px] w-full sm:aspect-[16/6] sm:max-h-[230px] lg:aspect-[24/7] lg:max-h-[290px]"
              >
                {/* Blurret baggrund udfylder rammen, så smalle billeder ikke
                    efterlader tomme kanter */}
                <img
                  src={business.cover_image_url!}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-50"
                  loading="eager"
                  decoding="async"
                />
                <img
                  src={business.cover_image_url!}
                  alt={`${business.name}${business.city ? ` i ${business.city}` : ""} – billede`}
                  className="relative h-full w-full object-cover object-center"
                  width={1600}
                  height={610}
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1280px"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-foreground/35 to-transparent" />
                <span className="absolute bottom-3 right-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
                  Se i fuld størrelse
                </span>
              </a>
            ) : (
              <div
                aria-hidden
                className="relative h-24 w-full bg-gradient-to-br from-accent/30 via-feature-lilac/20 to-feature-warm/30 md:h-32"
              >
                <div className="absolute inset-0 bg-noise opacity-[0.06]" />
              </div>
            )}
          </div>




          {/* Identity row — kun logoet overlapper coveret. Tekstkolonnen sidder
              i sin egen flow nedenunder, så branche-chips aldrig lander oven i billedet. */}
          <div className="relative flex flex-col gap-4 pb-6 md:flex-row md:items-start md:gap-6 md:pb-8">
            {/* Logo — alene om at overlappe cover */}
            <div className="relative z-10 -mt-10 shrink-0 md:-mt-12">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-card shadow-xl md:h-24 md:w-24">
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={`${business.name} logo${business.city ? ` – ${business.city}` : ""}`}
                    className="h-full w-full object-contain p-2"
                    width={96}
                    height={96}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
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

            {/* Tekst-kolonne — sidder i normal flow, så chips ikke kolliderer med cover */}
            <div className="min-w-0 flex-1 pt-1 md:pt-3">
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
              <div className="hidden shrink-0 md:flex md:flex-col md:gap-2 md:pt-3">
                <a href={`tel:${business.phone}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-11 gap-2 rounded-full border-border bg-card px-5 text-sm font-semibold text-foreground transition-all hover:border-foreground/40 hover:bg-secondary hover:text-foreground"
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
              <section id="services" aria-labelledby="services-heading" className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_22px_50px_-34px_hsl(var(--foreground)/0.2)]">
                {/* Farvet sektionshoved — gør det tydeligt hvad man kan her */}
                <div className="border-b border-border bg-gradient-to-r from-accent/12 via-feature-lilac/10 to-transparent p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Book direkte online</p>
                      <h2 id="services-heading" className="text-xl font-bold text-foreground sm:text-[1.75rem]">Services du kan bestille</h2>
                      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        Tilpas opgaven, se prisen med det samme og læg den i bestillingen. Ingen betaling før virksomheden har bekræftet.
                      </p>
                    </div>
                    <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">{serviceCount} {serviceCount === 1 ? "service" : "services"}</span>
                  </div>

                  {/* 3-trins forklaring — fjerner tvivl om hvad der kan gøres */}
                  <ol className="mt-4 grid gap-2 sm:grid-cols-3">
                    {[
                      { n: "1", t: "Vælg service", d: "Filtrér på kategori" },
                      { n: "2", t: "Tilpas antal", d: "Prisen opdateres live" },
                      { n: "3", t: "Send bestilling", d: "Virksomheden bekræfter" },
                    ].map((s) => (
                      <li key={s.n} className="flex items-center gap-2.5 rounded-xl bg-card/80 px-3 py-2 ring-1 ring-border/70">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">{s.n}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-foreground">{s.t}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{s.d}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="p-3 sm:p-4 md:p-5">


                {/* Category filter pills */}
                 {hasMultipleCategories && (
                    <div className="mb-4 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
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
                        className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
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
                       <div className="grid gap-3 md:grid-cols-2">
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
                          <div className="space-y-4">
                          {Object.entries(subs).map(([sub, items]) => (
                            <div key={sub || "default"}>
                              {sub && (
                                <h4 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{sub}</h4>
                              )}
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                      <div className="grid gap-3 md:grid-cols-2">
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
                </div>
              </section>

            )}

            {/* Empty state — vises hvis virksomheden endnu ikke har oprettet services */}
            {services && services.length === 0 && (
              <section
                id="services"
                aria-labelledby="services-heading"
                className="rounded-[2rem] border border-dashed border-border bg-card/60 p-6 text-center md:p-8"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground/60">
                  <Wrench className="h-5 w-5" />
                </div>
                <h2 id="services-heading" className="mt-3 text-lg font-bold text-foreground">
                  Ingen services oprettet endnu
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {business.name} har ikke tilføjet services til deres profil endnu. Du kan stadig kontakte virksomheden direkte for et tilbud.
                </p>
                {(business.phone || business.email) && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {business.phone && (
                      <a href={`tel:${business.phone}`}>
                        <Button variant="outline" className="rounded-full">
                          <Phone className="h-4 w-4" /> Ring til {business.name}
                        </Button>
                      </a>
                    )}
                    {business.email && (
                      <a href={`mailto:${business.email}`}>
                        <Button variant="outline" className="rounded-full">
                          <Mail className="h-4 w-4" /> Send email
                        </Button>
                      </a>
                    )}
                  </div>
                )}
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

            {/* Åbningstider — vises på tablet/mobil hvor sidebaren er skjult,
                så brugeren stadig kan se hvornår virksomheden er åben. */}
            {openingHours.length > 0 && (
              <Card className="rounded-[2rem] border-border bg-card/90 shadow-sm lg:hidden">
                <CardContent className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
                    <Clock className="h-4 w-4 text-accent" /> Åbningstider
                  </h3>
                  <div className="space-y-2 text-sm">
                    {openingHours.map(([day, time]) => {
                      const today = new Date().toLocaleDateString("da-DK", { weekday: "long" });
                      const isToday = day.toLowerCase() === today.toLowerCase();
                      return (
                        <div key={day} className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${isToday ? "bg-accent/8" : ""}`}>
                          <span className={isToday ? "text-foreground" : "text-muted-foreground"}>
                            {day}
                            {isToday && (
                              <span className="ml-1.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                I dag
                              </span>
                            )}
                          </span>
                          <span className={`tabular-nums font-medium text-foreground`}>{time}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews — samlet card med summary + grid, så det føles som ét sammenhængende afsnit */}
            {reviews && reviews.length > 0 && (
              <section
                id="reviews"
                aria-labelledby="reviews-heading"
                className="rounded-[2rem] border border-border bg-card p-4 shadow-[0_22px_50px_-34px_hsl(var(--foreground)/0.2)] md:p-5"
              >
                <div className="mb-4 flex items-end justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hvad kunderne siger</p>
                    <h2 id="reviews-heading" className="text-[1.5rem] font-bold text-foreground md:text-[1.75rem]">Anmeldelser</h2>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">
                    {reviewCount} {reviewCount === 1 ? "anmeldelse" : "anmeldelser"}
                  </span>
                </div>

                {/* Summary — kun ved 3+ anmeldelser, ellers spilder vi plads */}
                {reviewCount >= 3 && avgRating && (
                  <div className="mb-5 grid gap-5 rounded-2xl border border-border bg-secondary/30 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-foreground tabular-nums">{avgRating}</div>
                      <div className="mt-1.5 flex justify-center gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className={`h-4 w-4 ${i <= Math.round(Number(avgRating)) ? "fill-accent text-accent" : "text-muted"}`} />
                        ))}
                      </div>
                      <div className="mt-1.5 text-xs text-muted-foreground">af 5</div>
                    </div>
                    <div className="space-y-1.5">
                      {[5,4,3,2,1].map((rating) => {
                        const count = reviews.filter(r => r.rating === rating).length;
                        const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                        return (
                          <div key={rating} className="flex items-center gap-2.5 text-xs">
                            <span className="inline-flex w-8 items-center gap-0.5 text-muted-foreground tabular-nums">
                              {rating}<Star className="h-3 w-3 fill-muted-foreground/60 text-muted-foreground/60" />
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-border/70 overflow-hidden">
                              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-8 text-right text-muted-foreground tabular-nums">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Anmeldelses-kort */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {reviews.map((r) => (
                    <article
                      key={r.id}
                      className="rounded-2xl border border-border bg-secondary/20 p-4 transition-colors hover:bg-secondary/35"
                    >
                      <header className="mb-2 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                          {r.reviewer_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-foreground">{r.reviewer_name}</span>
                            {r.is_verified && (
                              <span title="Verificeret kunde" className="inline-flex shrink-0 text-accent">
                                <CheckCircle className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((i) => (
                                <Star key={i} className={`h-3 w-3 ${i <= r.rating ? "fill-accent text-accent" : "text-muted"}`} />
                              ))}
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString("da-DK", { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                      </header>
                      {r.comment && <p className="text-sm leading-relaxed text-foreground/80">{r.comment}</p>}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sidebar ──
              Vises kun på desktop (lg+). På tablet/mobil findes der allerede
              en "Ring nu"-knap i hero og en sticky bestil-bar i bunden, så
              denne sidebar ville være redundant og fylde top af siden. */}
          <aside className="hidden space-y-4 lg:block lg:sticky lg:top-24 lg:self-start">
            {/* Bestil/Contact Card — primary CTA (desktop only) */}
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
                    className="mt-3 flex h-11 w-full gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-md shadow-accent/20 transition-all hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/30 active:scale-[0.98]"
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
                        <div key={day} className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${isToday ? "bg-accent/8" : ""}`}>
                          <span className={isToday ? "text-foreground" : "text-muted-foreground"}>
                            {day}
                            {isToday && (
                              <span className="ml-1.5 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                I dag
                              </span>
                            )}
                          </span>
                          <span className={`tabular-nums ${isToday ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>{time}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

          </aside>
        </div>
      </main>

      <Footer />

      {business && (business.settings as any)?.livechat_enabled && (
        <BusinessLiveChatWidget
          businessId={business.id}
          businessName={business.name}
          logoUrl={business.logo_url}
          cartFabVisible={cartFabVisible}
        />
      )}

    </div>
  );
};

const DynamicBusinessPage = () => <DynamicBusinessContent />;

export default DynamicBusinessPage;

/* ──────────────────────────────────────────────────────────
 * Skeleton — vises mens virksomheds-data hentes. Bevar samme
 * layout-struktur som siden, så der ikke er stort visuelt skift
 * når data endelig dropper in (mindre CLS, mere "smooth").
 * ────────────────────────────────────────────────────────── */
const BusinessPageSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Top-nav placeholder */}
    <div className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>

    {/* Hero */}
    <header className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8 md:pt-6">
        <Skeleton className="h-48 w-full rounded-[1.75rem] sm:h-56 md:h-72 lg:h-80" />
        <div className="relative flex flex-col gap-4 pb-6 md:flex-row md:items-start md:gap-6 md:pb-8">
          <Skeleton className="-mt-10 h-20 w-20 rounded-2xl border-4 border-background md:-mt-12 md:h-24 md:w-24" />
          <div className="flex-1 space-y-2.5 pt-1 md:pt-3">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-9 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
          </div>
        </div>
      </div>
    </header>

    {/* Body */}
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
      <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-[2rem]" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
        <Skeleton className="hidden h-64 rounded-[2rem] lg:block" />
      </div>
    </main>
  </div>
);
