import { lazy, Suspense } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import ArticleHero from "@/components/landing/ArticleHero";
import { findCityFact } from "./cityFacts";
import { HUB_CITIES, servicesForCity } from "./cityServices";

const Footer = lazy(() => import("@/components/landing/Footer"));

const linkCls = "flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted";

const CityHubPage = () => {
  const { city: slug } = useParams<{ city?: string }>();
  const city = slug ? findCityFact(slug) : null;
  if (slug && !city) return <Navigate to="/by" replace />;

  if (!city) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Find serviceydere i din by – alle byer" description="Se priser og få 3 gratis tilbud på rengøring, håndværk, maler, elektriker, VVS og meget mere i 34 danske byer." canonicalPath="/by" />
        <SiteNav />
        <ArticleHero breadcrumbs={[{ label: "Forside", to: "/" }, { label: "Byer" }]} eyebrow="Hele Danmark" title="Find serviceydere i din by" subtitle="Vælg din by og se lokale priser på alle services." />
        <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {HUB_CITIES.map((c) => <li key={c.slug}><Link to={`/by/${c.slug}`} className={linkCls}>{c.name}</Link></li>)}
          </ul>
        </main>
        <Suspense fallback={null}><Footer /></Suspense>
      </div>
    );
  }

  const services = servicesForCity(city.slug);
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`Serviceydere i ${city.name} – priser på ${services.length} services`} description={`Find rengøring, håndværkere, maler, elektriker, VVS og flere services i ${city.name}. Se lokale priser og få 3 gratis tilbud.`} canonicalPath={`/by/${city.slug}`} />
      <SiteNav />
      <ArticleHero breadcrumbs={[{ label: "Forside", to: "/" }, { label: "Byer", to: "/by" }, { label: city.name }]} eyebrow={city.region} title={`Serviceydere i ${city.name}`} subtitle={`Se lokale priser på ${services.length} services i ${city.name}, og få op til 3 gratis tilbud.`} />
      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => <li key={s.href}><Link to={s.href} className={linkCls}>{s.label} i {city.name}</Link></li>)}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">Områder: {city.areas.join(" · ")}</p>
        <p className="mt-4 text-sm"><Link to="/by" className="underline">Se alle byer</Link></p>
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};

export default CityHubPage;
