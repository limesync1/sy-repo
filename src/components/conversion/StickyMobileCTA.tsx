import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

/** Ruter hvor mobile sticky CTA er relevant — SEO-trafiksider med kommerciel intent. */
const ENABLED_PREFIXES = [
  "/priser/",
  "/guides",
  "/rengoering/",
  "/flyttehjaelp/",
  "/haandvaerker/",
  "/haveservice/",
  "/blog/",
];

/**
 * Fixed bunden-bar på mobil med direkte CTA til tilbudsflowet.
 * Vises kun:
 *   - på SEO-landingssider med kommerciel intent (se prefixes)
 *   - på mobil (< sm via Tailwind)
 *   - efter brugeren har scrollet ~400 px (undgår "annoncefornemmelse" øverst)
 * Bunden af layoutet får automatisk padding så den ikke skjuler footer.
 */
const StickyMobileCTA = () => {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);

  const enabled = ENABLED_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!enabled) {
      setShow(false);
      return;
    }
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, pathname]);

  if (!enabled || !show) return null;

  return (
    <div
      role="region"
      aria-label="Få tilbud"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-6px_20px_-12px_rgba(0,0,0,0.25)] backdrop-blur sm:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">
            Gratis & uforpligtende
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            Få op til 3 tilbud nu
          </p>
        </div>
        <Link
          to="/tilbud"
          className="inline-flex h-11 shrink-0 items-center rounded-md bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
        >
          Få tilbud →
        </Link>
      </div>
    </div>
  );
};

export default StickyMobileCTA;