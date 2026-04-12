import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import Categories from "@/components/landing/Categories";
import GetQuotes from "@/components/landing/GetQuotes";
import WhyUs from "@/components/landing/WhyUs";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <HowItWorks />
      <Categories />
      <GetQuotes />
      <WhyUs />
      <Footer />
    </div>
  );
};

export default Index;
