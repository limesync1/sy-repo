import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import SEO from "@/components/SEO";

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
      <nav className="border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-7" />
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary mb-6">
          <Search className="h-9 w-9 text-muted-foreground/30" />
        </div>
        <p className="mb-1 text-6xl font-extrabold text-foreground">404</p>
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
