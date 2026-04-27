import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import RecentBusinesses from "@/components/landing/RecentBusinesses";
import Testimonials from "@/components/landing/Testimonials";
import WhyUs from "@/components/landing/WhyUs";
import GetQuotes from "@/components/landing/GetQuotes";
import Footer from "@/components/landing/Footer";
import Stats from "@/components/landing/Stats";
import ForBusinesses from "@/components/landing/ForBusinesses";
import SEO from "@/components/SEO";

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
      <HeroSection />
      <Stats />
      <RecentBusinesses />
      <HowItWorks />
      <GetQuotes />
      <Testimonials />
      <WhyUs />
      <ForBusinesses />
      <Footer />
    </div>
  );
};

export default Index;
