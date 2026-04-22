import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary/35">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="overflow-hidden rounded-[40px] border border-border bg-background shadow-sm">
          <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="bg-foreground px-6 py-7 text-background sm:px-8 sm:py-8">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-background/60">
                Klar til næste skridt
              </div>
              <h3 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight text-background">
                Start med søgning eller send opgaven ud med det samme.
              </h3>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  to="/virksomheder"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
                >
                  Find services
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/tilbud"
                  className="inline-flex items-center justify-center rounded-full border border-background/20 bg-background/10 px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-background/20"
                >
                  Få tilbud
                </Link>
              </div>
            </div>

            <div className="grid gap-px bg-border sm:grid-cols-2">
              <div className="bg-background px-6 py-6">
                <h4 className="text-sm font-semibold text-foreground">
                  Serviceydere
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
              <div className="bg-background px-6 py-6">
                <h4 className="text-sm font-semibold text-foreground">
                  Kontakt
                </h4>
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
                    <span>Danmark</span>
                  </li>
                  <li>
                    <Link
                      to="/log-ind"
                      className="transition-colors hover:text-foreground"
                    >
                      Log ind
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="bg-background px-6 py-6 sm:col-span-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Serviceydere
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Overblik over lokale serviceydere i hele Danmark.
                    </div>
                  </div>
                  <img
                    src="/serviceydere-logo-dark.png"
                    alt="Serviceydere"
                    className="h-7 w-auto opacity-80"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Serviceydere
        </div>
      </div>
    </footer>
  );
};

export default Footer;
