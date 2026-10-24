import { lazy } from "react";
import DeferredSection from "@/components/landing/DeferredSection";
import HeroSection from "@/components/landing/HeroSection";
import SEO from "@/components/SEO";
import Reveal from "@/components/landing/Reveal";
import SiteNav from "@/components/SiteNav";
import SectionSkeleton from "@/components/landing/SectionSkeleton";
import { OFFICIAL_PROFILE_URLS } from "@/lib/social-links";
import { HOME_TITLE, HOME_DESCRIPTION, homePageData } from "@/components/landing/home-seo";
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
const HowItWorks        = lazy(loadHow);
const WhyUs             = lazy(loadWhy);
const FounderNote       = lazy(loadFounder);
const ForBusinesses     = lazy(loadFor);
const CTABand           = lazy(loadCta);
const Footer            = lazy(loadFooter);

const Index = () => {
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
    homePageData(),
  ];

  return (
    <div className="homepage min-h-screen bg-background">
      <SEO
        title={HOME_TITLE}
        description={HOME_DESCRIPTION}
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
        <DeferredSection preload={loadHow} fallback={<SectionSkeleton cards={3} cols="md:grid-cols-3" cardClassName="h-64" dark className="bg-ocean" />}>
          <Reveal><HowItWorks /></Reveal>
        </DeferredSection>
        <DeferredSection preload={loadWhy} fallback={<SectionSkeleton cards={4} cols="sm:grid-cols-2 lg:grid-cols-4" cardClassName="h-64" className="bg-secondary/40" />}>
          <Reveal><WhyUs /></Reveal>
        </DeferredSection>
        <DeferredSection preload={loadFounder} fallback={<SectionSkeleton cards={1} cols="grid-cols-1" cardClassName="h-96" dark className="bg-ocean" />}>
          <Reveal><FounderNote /></Reveal>
        </DeferredSection>
        <DeferredSection preload={loadFor} fallback={<SectionSkeleton cards={3} cardClassName="h-64" className="bg-surface" />}>
          <Reveal><ForBusinesses /></Reveal>
        </DeferredSection>

        <DeferredSection preload={loadCta} fallback={<SectionSkeleton cards={0} className="bg-ocean" dark />}>
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
        </DeferredSection>
      </main>
      <DeferredSection preload={loadFooter} fallback={<SectionSkeleton cards={4} cols="sm:grid-cols-2 lg:grid-cols-4" cardClassName="h-32" dark className="bg-ocean" />}>
        <Footer />
      </DeferredSection>
    </div>
  );
};

export default Index;
