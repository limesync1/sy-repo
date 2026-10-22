import { lazy, Suspense, useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";
import SEO from "@/components/SEO";
import Reveal from "@/components/landing/Reveal";
import SiteNav from "@/components/SiteNav";
import SectionSkeleton from "@/components/landing/SectionSkeleton";
import { OFFICIAL_PROFILE_URLS } from "@/lib/social-links";
import { heroPhotos } from "@/components/landing/hero-photos";
// Hero + de to nærmeste below-fold sektioner indlæses ivrigt, så brugeren
// ikke ser en kort Suspense-flash når de scroller (det føltes som om
// forsiden "loadede igen"). De tungere sektioner længere nede code-splittes
// stadig så initial JS-bundle bliver markant mindre.
import Categories from "@/components/landing/Categories";
const loadHow = () => import("@/components/landing/HowItWorks");
const loadWhy = () => import("@/components/landing/WhyUs");
const loadFounder = () => import("@/components/landing/FounderNote");
const loadFor = () => import("@/components/landing/ForBusinesses");
const loadCta = () => import("@/components/landing/CTABand");
const loadFooter = () => import("@/components/landing/Footer");
const sectionLoaders = [loadHow, loadWhy, loadFounder, loadFor, loadCta, loadFooter];
const HowItWorks        = lazy(loadHow);
const WhyUs             = lazy(loadWhy);
const FounderNote       = lazy(loadFounder);
const ForBusinesses     = lazy(loadFor);
const CTABand           = lazy(loadCta);
const Footer            = lazy(loadFooter);

const Index = () => {
  // Hent sektionerne længere nede i ledig tid efter første visning, så man
  // aldrig ser pladsholdere, når man scroller.
  useEffect(() => {
    const ric = (window as any).requestIdleCallback as ((cb: () => void, o?: { timeout: number }) => number) | undefined;
    const run = () => sectionLoaders.forEach((load) => { void load(); });
    const id = ric ? ric(run, { timeout: 2500 }) : window.setTimeout(run, 1200);
    return () => { ric ? (window as any).cancelIdleCallback?.(id) : clearTimeout(id); };
  }, []);

  // Beskriv hjemmesiden og organisationen, ikke skjulte FAQ’er eller udfasede HowTo-resultater.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://serviceydere.dk/#website",
      name: "Serviceydere",
      url: "https://serviceydere.dk/",
      inLanguage: "da-DK",
      publisher: { "@id": "https://serviceydere.dk/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://serviceydere.dk/virksomheder?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://serviceydere.dk/#organization",
      name: "Serviceydere",
      url: "https://serviceydere.dk/",
      logo: "https://serviceydere.dk/serviceydere-logo-dark.webp",
      areaServed: { "@type": "Country", name: "Danmark" },
      contactPoint: {
        "@type": "ContactPoint",
        email: "kontakt@serviceydere.dk",
        contactType: "customer support",
        availableLanguage: ["Danish"],
      },
      sameAs: OFFICIAL_PROFILE_URLS,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://serviceydere.dk/#webpage",
      url: "https://serviceydere.dk/",
      name: "Serviceydere – Find lokale services og få op til 3 tilbud",
      inLanguage: "da-DK",
      isPartOf: { "@id": "https://serviceydere.dk/#website" },
      about: { "@id": "https://serviceydere.dk/#organization" },
      image: heroPhotos.map(photo => ({
        "@type": "ImageObject",
        contentUrl: new URL(photo.src, "https://serviceydere.dk").href,
        caption: photo.alt,
        width: photo.width,
        height: photo.height,
      })),
    },
  ];

  return (
    <div className="homepage min-h-screen bg-background">
      <SEO
        title="Serviceydere – Find lokale services og få op til 3 tilbud"
        description="Find lokale serviceydere, sammenlign priser og book direkte. Få op til 3 gratis, uforpligtende tilbud på vinduespudsning, rengøring, haveservice og håndværk."
        image="https://storage.googleapis.com/gpt-engineer-file-uploads/kE6rxSrBOkSKYUFwx0bE4pFuwR73/social-images/social-1779134586683-Serviceydere-bk.webp"
        canonicalPath="/"
        keywords="serviceydere, find serviceydere, lokale serviceydere, tilbud, rengøring, håndværker, flyttehjælp, haveservice, maler, vvs, elektriker, tømrer, danmark"
        jsonLd={jsonLd}
      />
      <SiteNav />
      <HeroSection />
      {/* Hver sektion fader blødt ind når den scrolles i syne, og har sin
          EGEN Suspense med en pladsholder i samme højde. Så venter resten af
          siden ikke på den langsomste sektion, og der er ingen hop. */}
      <main id="main">
        <Reveal><Categories /></Reveal>
        <Suspense fallback={<SectionSkeleton cards={3} cardClassName="h-44" />}>
          <Reveal><HowItWorks /></Reveal>
        </Suspense>
        <Suspense fallback={<SectionSkeleton cards={4} cols="sm:grid-cols-2 lg:grid-cols-4" cardClassName="h-40" />}>
          <Reveal><WhyUs /></Reveal>
        </Suspense>
        <Suspense fallback={<SectionSkeleton cards={1} cols="grid-cols-1" cardClassName="h-64" dark className="bg-ocean" />}>
          <Reveal><FounderNote /></Reveal>
        </Suspense>
        <Suspense fallback={<SectionSkeleton cards={6} cardClassName="h-40" />}>
          <Reveal><ForBusinesses /></Reveal>
        </Suspense>

        <Suspense fallback={<SectionSkeleton cards={0} className="bg-background" dark />}>
          <Reveal className="bg-background">
            <CTABand
              animated
              eyebrow="Kom i gang"
              title="Beskriv opgaven én gang — få op til 3 tilbud"
              body="Det er gratis og uforpligtende. Du taler direkte med virksomhederne."
              primary={{ label: "Indhent 3 tilbud", to: "/tilbud" }}
              secondary={{ label: "Find services", to: "/virksomheder" }}
            />
          </Reveal>
        </Suspense>
      </main>
      <Suspense fallback={<SectionSkeleton cards={4} cols="sm:grid-cols-2 lg:grid-cols-4" cardClassName="h-32" dark className="bg-ocean" />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
