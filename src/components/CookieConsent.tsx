import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Cookies-popup — diskret banner der dukker op nederst på siden første gang
 * brugeren besøger Serviceydere. Valget gemmes i localStorage så vi ikke
 * forstyrrer ved hvert besøg.
 *
 * Designet matcher resten af forsiden:
 *  - mørk foreground-baggrund (samme som hero/footer)
 *  - afrundede hjørner + blød skygge
 *  - fade+slide-up entrance via Tailwind utilities
 *  - fuldt responsivt: stack på mobil, række på desktop
 */

const STORAGE_KEY = "serviceydere.cookie-consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const isPanelRoute = location.pathname.startsWith("/virksomhed") || location.pathname.startsWith("/medarbejder");

  useEffect(() => {
    // Forsink mount let så banneret ikke konkurrerer med hero-animationen
    // ved første paint. Det giver også tid til hydration.
    const t = window.setTimeout(() => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
      } catch {
        setVisible(true);
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, []);

  const persist = (value: "accepted" | "rejected") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
    // Fortæl resten af appen (fx testfase-popup'en) at cookievalget er truffet,
    // så ingen modal åbner oven på banneret og gør det umuligt at trykke på.
    window.dispatchEvent(new Event("cookie-consent-given"));
  };

  const showing = visible && !isPanelRoute;
  useEffect(() => {
    if (showing) document.body.setAttribute("data-cookie-banner", "open");
    else document.body.removeAttribute("data-cookie-banner");
    return () => document.body.removeAttribute("data-cookie-banner");
  }, [showing]);

  if (!showing) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookies"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[90] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
        "animate-fade-in",
      )}
      style={{ animationDelay: "100ms" }}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2.5 rounded-xl border border-background/10 bg-foreground/95 px-3.5 py-3 text-background shadow-xl backdrop-blur sm:gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex hidden h-7 w-7 shrink-0 items-center sm:flex justify-center rounded-full bg-background/10">
            <Cookie className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="text-sm leading-6 text-background/85">
            <span className="sm:hidden">Vi bruger </span><span className="hidden sm:inline">Vi bruger cookies til at forbedre din oplevelse. Læs mere i vores </span>
            <Link
              to="/cookies"
              className="inline-flex min-h-11 items-center font-medium text-background underline underline-offset-2 hover:text-background/80"
            >
              <span className="sm:hidden">cookies</span><span className="hidden sm:inline">cookiepolitik</span>
            </Link>
            .
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => persist("rejected")}
            className="h-11 rounded-full px-4 text-sm text-background/85 hover:bg-background/10 hover:text-background"
          >
            Afvis
          </Button>
          <Button
            size="sm"
            onClick={() => persist("accepted")}
            className="h-11 rounded-full bg-background px-5 text-sm font-semibold text-foreground hover:bg-background/90 active:scale-[0.98]"
          >
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;