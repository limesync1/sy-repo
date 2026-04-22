import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="mb-8 grid gap-5 rounded-3xl border border-border bg-secondary/60 p-5 sm:p-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:items-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Find hjælp hurtigere</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Søg blandt verificerede virksomheder eller indhent tilbud, hvis du vil sammenligne flere muligheder på én gang.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Link to="/virksomheder" className="inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90">
              Find services
            </Link>
            <Link to="/tilbud" className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
              Få tilbud
            </Link>
          </div>
          <div className="text-sm text-muted-foreground lg:text-right">
            <div className="font-semibold text-foreground">Support</div>
            <a href="mailto:kontakt@serviceydere.dk" className="mt-1 inline-block transition-colors hover:text-foreground">kontakt@serviceydere.dk</a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:gap-10 md:grid-cols-4">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Serviceydere</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/virksomheder" className="transition-colors hover:underline">Find services</Link></li>
              <li><Link to="/tilbud" className="transition-colors hover:underline">Indhent tilbud</Link></li>
              <li><Link to="/virksomheder" className="transition-colors hover:underline">Kategorier</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">For virksomheder</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/log-ind?mode=business" className="transition-colors hover:underline">Bliv udbyder</Link></li>
              <li><Link to="/log-ind" className="transition-colors hover:underline">Log ind</Link></li>
              <li><Link to="/virksomhed" className="transition-colors hover:underline">Virksomhedspanel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:kontakt@serviceydere.dk" className="transition-colors hover:underline">Kontakt os</a></li>
              <li><span>Hjælpecenter</span></li>
              <li><span>FAQ</span></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Om os</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span>Om Serviceydere</span></li>
              <li><span>Privatlivspolitik</span></li>
              <li><span>Vilkår</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} Serviceydere · Danmark</div>
          <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-6 opacity-70" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
