import { lazy, Suspense } from "react";
import HeroSection from "@/components/landing/HeroSection";
import SEO from "@/components/SEO";
import Reveal from "@/components/landing/Reveal";
import SiteNav from "@/components/SiteNav";
// Hero + de to nærmeste below-fold sektioner indlæses ivrigt, så brugeren
// ikke ser en kort Suspense-flash når de scroller (det føltes som om
// forsiden "loadede igen"). De tungere sektioner længere nede code-splittes
// stadig så initial JS-bundle bliver markant mindre.
import Stats from "@/components/landing/Stats";
import Categories from "@/components/landing/Categories";
import RecentBusinesses from "@/components/landing/RecentBusinesses";
const HowItWorks        = lazy(() => import("@/components/landing/HowItWorks"));
const GetQuotes         = lazy(() => import("@/components/landing/GetQuotes"));
const PopularCities     = lazy(() => import("@/components/landing/PopularCities"));
const AudienceSplit     = lazy(() => import("@/components/landing/AudienceSplit"));
const Testimonials      = lazy(() => import("@/components/landing/Testimonials"));
const WhyUs             = lazy(() => import("@/components/landing/WhyUs"));
const ForBusinesses     = lazy(() => import("@/components/landing/ForBusinesses"));
const CTABand           = lazy(() => import("@/components/landing/CTABand"));
const Footer            = lazy(() => import("@/components/landing/Footer"));

const Index = () => {
  // Struktureret data for forsiden — hjælper Google med at vise rich results
  // (sitelinks searchbox, organisation knowledge panel, FAQ accordion).
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
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "Sådan finder du den rette serviceyder",
      description:
        "Find, sammenlign og book lokale serviceydere i Danmark på under 5 minutter.",
      step: [
        { "@type": "HowToStep", position: 1, name: "Søg", text: "Fortæl kort hvad du skal have hjælp til." },
        { "@type": "HowToStep", position: 2, name: "Sammenlign", text: "Få overblik over de stærkeste muligheder." },
        { "@type": "HowToStep", position: 3, name: "Book", text: "Vælg det tilbud eller den profil, der passer bedst." },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Koster det noget at bruge Serviceydere?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nej. Det er gratis for private at finde, sammenligne og kontakte serviceydere på platformen.",
          },
        },
        {
          "@type": "Question",
          name: "Hvor mange tilbud kan jeg få?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Du kan modtage op til 3 tilbud fra relevante, verificerede udbydere i dit område.",
          },
        },
        {
          "@type": "Question",
          name: "Er virksomhederne på Serviceydere verificerede?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ja, vi tjekker CVR og kontaktoplysninger på alle virksomheder, der får et verificeret stempel.",
          },
        },
      ],
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
      {/* Hver sektion fader blødt ind når den scrolles i syne. Det giver
          forsiden en rolig, sammenhængende rytme på alle enheder uden at
          skubbe layout — IntersectionObserver er praktisk talt gratis.
          Suspense-fallback er null fordi Reveal allerede holder pladsen
          via dens egen min-height/transition. */}
      <Suspense fallback={null}>
        <main id="main">
          <Reveal><Stats /></Reveal>
          <Reveal><Categories /></Reveal>
          <Reveal><HowItWorks /></Reveal>
          <Reveal><GetQuotes /></Reveal>
          <Reveal><RecentBusinesses /></Reveal>
          <Reveal><PopularCities /></Reveal>
          <Reveal><AudienceSplit /></Reveal>
          <Reveal><Testimonials /></Reveal>
          <Reveal><WhyUs /></Reveal>
          <Reveal><ForBusinesses /></Reveal>
          <Reveal>
            <CTABand
              eyebrow="Kom i gang"
              title="Beskriv opgaven én gang — få op til 3 tilbud"
              body="Det er gratis og uforpligtende. Du taler direkte med virksomhederne."
              primary={{ label: "Indhent 3 tilbud", to: "/tilbud" }}
              secondary={{ label: "Find services", to: "/virksomheder" }}
            />
          </Reveal>
        </main>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
