import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import SEO from "@/components/SEO";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="Siden findes ikke – 404"
        description="Den side du leder efter findes ikke på Serviceydere. Gå tilbage til forsiden eller søg efter serviceydere."
        noIndex
      />
      {/* Nav */}
      <nav className="border-b border-border bg-site-header-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <img
              src="/serviceydere-logo-dark.webp"
              alt="Serviceydere"
              className="h-10 w-auto"
              width={1920}
              height={539}
              decoding="async"
              loading="lazy"
            />
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <BrandedIllustration name="notFound" alt="404" className="h-40 w-72 object-cover mb-2" />
        <h1 className="mb-2 text-xl font-bold text-foreground">Siden blev ikke fundet</h1>
        <p className="mb-8 max-w-sm text-center text-sm text-muted-foreground">
          Den side du leder efter findes ikke eller er blevet flyttet.
        </p>
        <div className="flex gap-3">
          <Link to="/">
            <Button className="gap-2 rounded-xl bg-foreground text-background hover:bg-foreground/90">
              <ArrowLeft className="h-4 w-4" />
              Til forsiden
            </Button>
          </Link>
          <Link to="/virksomheder">
            <Button variant="outline" className="gap-2 rounded-xl">
              <Search className="h-4 w-4" />
              Søg
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
