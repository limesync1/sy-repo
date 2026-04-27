import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookies"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4",
        "animate-fade-in",
      )}
      style={{ animationDelay: "100ms" }}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-xl border border-background/10 bg-foreground/95 px-3.5 py-3 text-background shadow-xl backdrop-blur sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-start gap-2.5 sm:items-center">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/10">
            <Cookie className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="text-[12px] leading-5 text-background/85">
            Vi bruger cookies til at forbedre din oplevelse. Læs mere i vores{" "}
            <Link
              to="/cookies"
              className="font-medium text-background underline underline-offset-2 hover:text-background/80"
            >
              cookiepolitik
            </Link>
            .
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => persist("rejected")}
            className="h-7 rounded-full px-3 text-xs text-background/85 hover:bg-background/10 hover:text-background"
          >
            Afvis
          </Button>
          <Button
            size="sm"
            onClick={() => persist("accepted")}
            className="h-7 rounded-full bg-background px-3.5 text-xs font-semibold text-foreground hover:bg-background/90 active:scale-[0.98]"
          >
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;