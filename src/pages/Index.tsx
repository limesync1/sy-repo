import HeroSection from "@/components/landing/HeroSection";
import Stats from "@/components/landing/Stats";
import HowItWorks from "@/components/landing/HowItWorks";
import Categories from "@/components/landing/Categories";
import WhyUs from "@/components/landing/WhyUs";
import GetQuotes from "@/components/landing/GetQuotes";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <Stats />
      <HowItWorks />
      <Categories />
      <WhyUs />
      <GetQuotes />
      <Footer />
    </div>
  );
};

export default Index;
