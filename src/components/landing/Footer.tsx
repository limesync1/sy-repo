import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 grid gap-5 rounded-[28px] border border-background/10 bg-background/5 p-5 sm:p-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h3 className="text-xl font-semibold text-background">Find hurtigere frem</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-background/70">
              Direkte søgning eller 3 tilbud — afhængigt af hvordan du vil finde den rette løsning.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Link to="/virksomheder" className="inline-flex items-center justify-center rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background/90">
              Find services
            </Link>
            <Link to="/tilbud" className="inline-flex items-center justify-center rounded-full border border-background/20 bg-transparent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-background/10">
              Indhent 3 tilbud
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-background">Serviceydere</h4>
            <ul className="space-y-2 text-sm text-background/65">
              <li><Link to="/virksomheder" className="transition-colors hover:text-background">Find services</Link></li>
              <li><Link to="/tilbud" className="transition-colors hover:text-background">Indhent tilbud</Link></li>
              <li><Link to="/virksomheder" className="transition-colors hover:text-background">Kategorier</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-background">For virksomheder</h4>
            <ul className="space-y-2 text-sm text-background/65">
              <li><Link to="/log-ind?mode=business" className="transition-colors hover:text-background">Bliv udbyder</Link></li>
              <li><Link to="/log-ind" className="transition-colors hover:text-background">Log ind</Link></li>
              <li><Link to="/virksomhed" className="transition-colors hover:text-background">Virksomhedspanel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-background">Support</h4>
            <ul className="space-y-2 text-sm text-background/65">
              <li><a href="mailto:kontakt@serviceydere.dk" className="transition-colors hover:text-background">Kontakt os</a></li>
              <li><span>Hjælpecenter</span></li>
              <li><span>FAQ</span></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-background">Om os</h4>
            <ul className="space-y-2 text-sm text-background/65">
              <li><Link to="/privatlivspolitik" className="transition-colors hover:text-background">Privatlivspolitik</Link></li>
              <li><Link to="/vilkaar" className="transition-colors hover:text-background">Vilkår</Link></li>
              <li><Link to="/cookies" className="transition-colors hover:text-background">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-6 text-xs text-background/55 md:flex-row">
          <div>© {new Date().getFullYear()} Serviceydere · Danmark</div>
          <img
            src="/serviceydere-logo-dark.webp"
            alt="Serviceydere"
            className="h-6 w-auto rounded bg-background px-2 py-1 opacity-90"
            width={1920}
            height={539}
            decoding="async"
            loading="lazy"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
