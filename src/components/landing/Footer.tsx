import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="mb-3 h-8" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Find og sammenlign serviceydere i hele Danmark.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/search" className="transition-colors hover:text-foreground">Søg services</Link></li>
              <li><Link to="/quote" className="transition-colors hover:text-foreground">Indhent tilbud</Link></li>
              <li><Link to="/search" className="transition-colors hover:text-foreground">Kategorier</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">For virksomheder</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="transition-colors hover:text-foreground">Log ind</Link></li>
              <li><Link to="/admin" className="transition-colors hover:text-foreground">Admin panel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Kontakt</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:kontakt@serviceydere.dk" className="transition-colors hover:text-foreground">kontakt@serviceydere.dk</a></li>
              <li>Danmark</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Serviceydere. Alle rettigheder forbeholdes.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
