import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <p className="mb-2 text-7xl font-extrabold text-foreground">404</p>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Siden blev ikke fundet</h1>
        <p className="mb-6 text-muted-foreground">Den side du leder efter findes ikke eller er blevet flyttet.</p>
        <Link to="/">
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <ArrowLeft className="h-4 w-4" />
            Tilbage til forsiden
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
