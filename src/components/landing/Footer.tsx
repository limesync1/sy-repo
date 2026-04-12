import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-foreground">
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <img src="/serviceydere-logo.png" alt="Serviceydere" className="mb-3 h-8" />
              <p className="text-sm leading-relaxed text-white/40">
                Find og sammenlign serviceydere i hele Danmark.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Platform</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><Link to="/search" className="transition-colors hover:text-white">Søg services</Link></li>
                <li><Link to="/quote" className="transition-colors hover:text-white">Indhent tilbud</Link></li>
                <li><Link to="/search" className="transition-colors hover:text-white">Kategorier</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">For virksomheder</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li><Link to="/auth" className="transition-colors hover:text-white">Log ind</Link></li>
                <li><Link to="/admin" className="transition-colors hover:text-white">Admin panel</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Kontakt</h4>
              <ul className="space-y-2 text-sm text-white/40">
                <li>kontakt@serviceydere.dk</li>
                <li>Danmark</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/30">
            © {new Date().getFullYear()} Serviceydere. Alle rettigheder forbeholdes.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
