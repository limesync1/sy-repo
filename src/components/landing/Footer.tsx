import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 border-t border-border pt-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Serviceydere
            </div>
            <h3 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight text-foreground">
              Find næste skridt direkte fra forsiden.
            </h3>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/virksomheder"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
              >
                Find services
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/tilbud"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Få tilbud
              </Link>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Platform
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/virksomheder"
                    className="transition-colors hover:text-foreground"
                  >
                    Find services
                  </Link>
                </li>
                <li>
                  <Link
                    to="/tilbud"
                    className="transition-colors hover:text-foreground"
                  >
                    Indhent tilbud
                  </Link>
                </li>
                <li>
                  <Link
                    to="/log-ind?mode=business"
                    className="transition-colors hover:text-foreground"
                  >
                    Bliv udbyder
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Konto</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/log-ind"
                    className="transition-colors hover:text-foreground"
                  >
                    Log ind
                  </Link>
                </li>
                <li>
                  <Link
                    to="/log-ind?signup=1"
                    className="transition-colors hover:text-foreground"
                  >
                    Opret konto
                  </Link>
                </li>
                <li>
                  <span>Danmark</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Kontakt</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="mailto:kontakt@serviceydere.dk"
                    className="transition-colors hover:text-foreground"
                  >
                    kontakt@serviceydere.dk
                  </a>
                </li>
                <li>
                  <span>Support</span>
                </li>
                <li>
                  <img
                    src="/serviceydere-logo-dark.png"
                    alt="Serviceydere"
                    className="mt-2 h-7 w-auto opacity-80"
                  />
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Serviceydere
        </div>
      </div>
    </footer>
  );
};

export default Footer;
