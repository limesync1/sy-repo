import { useParams, Link } from "react-router-dom";
import { useBusinessBySlug, useServices, useReviews } from "@/hooks/useDatabase";
import CartSheet from "@/components/business/CartSheet";
import DynamicServiceCard from "@/components/business/DynamicServiceCard";
import BusinessSEO from "@/components/business/BusinessSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import {
  ArrowLeft, Star, Mail, Phone, MapPin, Clock, CheckCircle,
  ShieldCheck, ArrowDown, Globe, Sparkles, Users, Award,
} from "lucide-react";

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
    ? Object.entries(business.opening_hours as Record<string, string>).filter(([, v]) => v)
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
      />

      {/* ── Sticky Nav (light, matches landing) ── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md" aria-label="Virksomhedsnavigation">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" aria-label="Tilbage til Serviceydere">
              <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-8 md:h-9" />
            </Link>
            <Separator orientation="vertical" className="mx-1 h-5 hidden sm:block" />
            <span className="hidden truncate text-sm font-semibold text-foreground sm:inline">{business.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/search" className="hidden md:inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Tilbage til søgning
            </Link>
            <CartSheet businessId={business.id} />
          </div>
        </div>
      </nav>

      {/* ── Hero (light) ── */}
      <header className="relative overflow-hidden border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-10 md:pt-12 md:pb-14">
          {/* Cover image — full width, contained */}
          {hasCover && (
            <div className="mb-8 overflow-hidden rounded-3xl">
              <div className="relative aspect-[21/8] w-full bg-secondary md:aspect-[21/7]">
                <img
                  src={business.cover_image_url!}
                  alt={`${business.name} cover`}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col items-start gap-5 md:flex-row md:items-end md:gap-7">
            {business.logo_url && (
              <div className="shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-md flex items-center justify-center h-20 w-20 md:h-24 md:w-24">
                <img src={business.logo_url} alt={`${business.name} logo`} className="h-full w-full object-contain p-2" loading="eager" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              {(business.categories?.[0] || business.category) && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(business.categories?.length ? business.categories : [business.category]).filter(Boolean).slice(0, 3).map((c) => (
                    <span key={c} className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
                {business.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {business.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />{business.city}
                  </span>
                )}
                {avgRating && (
                  <span className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                    <span className="font-semibold text-foreground">{avgRating}</span>
                    <span className="text-muted-foreground">({reviewCount} {reviewCount === 1 ? "anmeldelse" : "anmeldelser"})</span>
                  </span>
                )}
                {business.is_verified && (
                  <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent text-xs gap-1 px-2 py-0.5">
                    <ShieldCheck className="h-3 w-3" /> Verificeret
                  </Badge>
                )}
                {!avgRating && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Ny på platformen
                  </span>
                )}
              </div>

              {services && services.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    onClick={scrollToServices}
                    size="lg"
                    className="h-12 gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90"
                  >
                    Bestil nu <ArrowDown className="h-4 w-4" />
                  </Button>
                  {business.phone && (
                    <a href={`tel:${business.phone}`}>
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-12 gap-2 rounded-full border-border bg-card px-5 text-sm font-medium text-foreground hover:bg-secondary"
                      >
                        <Phone className="h-4 w-4" /> {business.phone}
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* ── Body ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 py-8 md:gap-10 md:py-12 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">

          {/* ── Main Column ── */}
          <div className="min-w-0 space-y-10">

            {/* About */}
            {business.description && (
              <section aria-labelledby="about-heading">
                <h2 id="about-heading" className="mb-3 text-lg font-bold text-foreground">Om {business.name}</h2>
                <p className="max-w-2xl leading-relaxed text-muted-foreground whitespace-pre-line">{business.description}</p>
              </section>
            )}

            {/* Services */}
            {services && services.length > 0 && (
              <section id="services" aria-labelledby="services-heading">
                <div className="mb-5 flex items-center justify-between">
                  <h2 id="services-heading" className="text-xl font-bold text-foreground">Services</h2>
                  <span className="text-sm text-muted-foreground">{serviceCount} {serviceCount === 1 ? "service" : "services"}</span>
                </div>

                {/* Category filter pills */}
                {hasMultipleCategories && (
                  <div className="mb-6 flex flex-wrap gap-2">
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
                <div className="space-y-10">
                  {Object.entries(displayedServices).map(([cat, subs]) => (
                    <div key={cat}>
                      {(hasMultipleCategories || Object.keys(subs).some(k => k !== "")) && (
                        <h3 className="mb-4 text-lg font-bold text-foreground">{cat}</h3>
                      )}
                      <div className="space-y-6">
                        {Object.entries(subs).map(([sub, items]) => (
                          <div key={sub || "default"}>
                            {sub && (
                              <h4 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{sub}</h4>
                            )}
                            <div className="grid gap-5 sm:grid-cols-2">
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
                    </div>
                  ))}
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
                  <div className="mb-5 rounded-xl border border-border p-4 bg-secondary/20">
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

                <div className="grid gap-3 sm:grid-cols-2">
                  {reviews.map((r) => (
                    <Card key={r.id} className="border-border">
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
          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* Bestil/Contact Card — primary CTA */}
            <Card className="border-2 border-accent/20 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 px-5 py-4 border-b border-accent/15">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h3 className="font-bold text-foreground">Klar til at bestille?</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Vælg en service nedenfor eller kontakt {business.name} direkte.</p>
                {services && services.length > 0 && (
                  <Button
                    onClick={scrollToServices}
                    className="mt-3 w-full gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-foreground hover:bg-accent/90"
                  >
                    Se {serviceCount} service{serviceCount === 1 ? "" : "s"} <ArrowDown className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
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
              <Card className="border-border">
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
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
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

      <footer className="border-t border-border bg-secondary/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {business.name} · Drevet af <Link to="/" className="font-medium text-foreground hover:underline">Serviceydere</Link></p>
        </div>
      </footer>
    </div>
  );
};

const DynamicBusinessPage = () => <DynamicBusinessContent />;

export default DynamicBusinessPage;
