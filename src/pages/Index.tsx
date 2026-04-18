import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import Categories from "@/components/landing/Categories";
import RecentBusinesses from "@/components/landing/RecentBusinesses";
import Testimonials from "@/components/landing/Testimonials";
import WhyUs from "@/components/landing/WhyUs";
import GetQuotes from "@/components/landing/GetQuotes";
import Footer from "@/components/landing/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Serviceydere – Find serviceydere i hele Danmark"
        description="Find, sammenlign og book verificerede serviceydere i Danmark. Få op til 3 gratis tilbud på rengøring, håndværker, flyttehjælp, haveservice og meget mere."
        canonicalPath="/"
        keywords="serviceydere, find serviceydere, tilbud, rengøring, håndværker, flyttehjælp, haveservice, maler, vvs, elektriker, danmark"
      />
      <HeroSection />
      <Categories />
      <GetQuotes />
      <RecentBusinesses />
      <HowItWorks />
      <Testimonials />
      <WhyUs />
      <Footer />
    </div>
  );
};

export default Index;
