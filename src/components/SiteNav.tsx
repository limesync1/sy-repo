import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

/**
 * Shared sticky top navigation used across non-landing pages.
 * Includes a working mobile hamburger menu so all routes are usable on phones.
 *
 * Optional `right` slot lets pages inject page-specific actions (e.g. a cart, a "Mit panel" link)
 * to the right of the auth buttons.
 */
interface Props {
  /** Mark a nav item as active (defaults to current pathname matching). */
  active?: "search" | "quote" | "business" | null;
  /** Optional extra controls rendered before the auth buttons (desktop) / before the menu button (mobile). */
  right?: React.ReactNode;
}

const NAV_ITEMS: { key: NonNullable<Props["active"]>; label: string; to: string }[] = [
  { key: "search", label: "Find services", to: "/virksomheder" },
  { key: "quote", label: "Få tilbud", to: "/tilbud" },
  { key: "business", label: "Bliv udbyder", to: "/log-ind?mode=business" },
];

const SiteNav = ({ active, right }: Props) => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (key: NonNullable<Props["active"]>) => {
    if (active !== undefined) return active === key;
    if (key === "search") return pathname.startsWith("/virksomheder") || pathname.startsWith("/search");
    if (key === "quote") return pathname.startsWith("/tilbud") || pathname.startsWith("/quote");
    return false;
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 py-3 sm:py-3.5">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Serviceydere forside">
            <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-8 sm:h-9 md:h-10" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive(item.key)
                    ? "bg-secondary text-foreground"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {right}
            <Link to="/log-ind" className="hidden sm:inline-block">
              <button className="rounded-full px-3 sm:px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary active:bg-secondary/70">
                Log ind
              </button>
            </Link>
            <Link to="/log-ind?signup=1" className="hidden sm:inline-block">
              <button className="rounded-full bg-foreground px-3 sm:px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 active:bg-foreground/80">
                Opret konto
              </button>
            </Link>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary md:hidden"
              aria-label={open ? "Luk menu" : "Åbn menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="mb-3 rounded-2xl border border-border bg-card p-2 shadow-lg md:hidden">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.key)
                    ? "bg-secondary text-foreground"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-border" />
            <Link
              to="/log-ind"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Log ind
            </Link>
            <Link
              to="/log-ind?signup=1"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Opret konto
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default SiteNav;
