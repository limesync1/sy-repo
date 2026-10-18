import { lazy, Suspense } from "react";
import HeroSection from "@/components/landing/HeroSection";
import SEO from "@/components/SEO";
import Reveal from "@/components/landing/Reveal";
import SiteNav from "@/components/SiteNav";
import SectionSkeleton from "@/components/landing/SectionSkeleton";
import { OFFICIAL_PROFILE_URLS } from "@/lib/social-links";
// Hero + de to nærmeste below-fold sektioner indlæses ivrigt, så brugeren
// ikke ser en kort Suspense-flash når de scroller (det føltes som om
// forsiden "loadede igen"). De tungere sektioner længere nede code-splittes
// stadig så initial JS-bundle bliver markant mindre.
import Categories from "@/components/landing/Categories";
const HowItWorks        = lazy(() => import("@/components/landing/HowItWorks"));
const WhyUs             = lazy(() => import("@/components/landing/WhyUs"));
const FounderNote       = lazy(() => import("@/components/landing/FounderNote"));
const ForBusinesses     = lazy(() => import("@/components/landing/ForBusinesses"));
const CTABand           = lazy(() => import("@/components/landing/CTABand"));
const Footer            = lazy(() => import("@/components/landing/Footer"));

const Index = () => {
  // Beskriv hjemmesiden og organisationen, ikke skjulte FAQ’er eller udfasede HowTo-resultater.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Serviceydere",
      url: "https://serviceydere.dk/",
      inLanguage: "da-DK",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://serviceydere.dk/virksomheder?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
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

  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Serviceydere – Find & book lokale serviceydere i Danmark"
        description="Find, sammenlign og book verificerede serviceydere i hele Danmark. Få op til 3 gratis tilbud på rengøring, håndværker, flyttehjælp, haveservice og meget mere."
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
