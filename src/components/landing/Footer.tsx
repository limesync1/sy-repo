import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Serviceydere</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/search" className="transition-colors hover:underline">Find services</Link></li>
              <li><Link to="/quote" className="transition-colors hover:underline">Indhent tilbud</Link></li>
              <li><Link to="/search" className="transition-colors hover:underline">Kategorier</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">For virksomheder</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="transition-colors hover:underline">Bliv udbyder</Link></li>
              <li><Link to="/auth" className="transition-colors hover:underline">Log ind</Link></li>
              <li><Link to="/admin" className="transition-colors hover:underline">Admin panel</Link></li>
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
